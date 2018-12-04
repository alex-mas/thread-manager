

export enum WorkerStatus {
    IDLE = 1,
    BUSY = 2,
    CRASHED = 3
};


export interface EnhancedWorker extends Worker {
    id: number,
    status: WorkerStatus
}




/**
 * 
 * 
 * The payload provided to sendMessage and broadcastMessage must abid the assumptions of the selected sending strategy
 * 
 * If you wish to send transferable objects check out the api of sendMessage and broadcastMessage
 * 
 * If the sending strategy is JSON => payload should be serializable (no custom objects)
 * 
 * Else the payload will be passed as is to the worker, the browser will then perform the 
 * structured clone algorithm to get the data on the worker (check https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
 * 
 * 
 * 
 */
export enum MessageSendingStrategy {
    DEFAULT = 'DEFAULT',
    JSON = 'JSON'
}

export enum WorkDistributionStrategy {
    ROUND_ROBIN = 'ROUND_ROBIN',
    FIRST_IDLE = 'FIRST_IDLE'
}

export enum InitializationStrategy {
    AT_START = 'AT_START',
    DELAYED = 'DELAYED'
}

export interface ThreadManagerConfig {
    distributionStrategy: WorkDistributionStrategy,
    initializationStrategy: InitializationStrategy,
    sendingStrategy: MessageSendingStrategy,
    amountOfWorkers: number
}

const defaultConfiguration = {
    distributionStrategy: WorkDistributionStrategy.ROUND_ROBIN,
    amountOfWorkers: window.navigator.hardwareConcurrency / 2,
    initializationStrategy: InitializationStrategy.AT_START,
    sendingStrategy: MessageSendingStrategy.DEFAULT
}


export interface WorkerMessage {
    event: MessageEvent,
    type: string,
    payload: any
}


const isError = (event: ErrorEvent | MessageEvent): event is ErrorEvent => {
    return event instanceof ErrorEvent;
}


export type MessageHandler = (event: MessageEvent) => any;
export type ErrorHandler = (event: ErrorEvent) => any;

export class ThreadManager {
    config: ThreadManagerConfig = defaultConfiguration;
    filePath: string;
    middleware: Function[] = [];
    workers: EnhancedWorker[] = [];
    onMessage?: MessageHandler;
    onError?: ErrorHandler;
    lastAssignedWorker: number = -1;
    constructor(filepath: string, config?: Partial<ThreadManagerConfig>, onMessage?: MessageHandler, onError?: ErrorHandler) {
        if (!filepath) {
            throw new Error(
                'can\'t initialize the thread manager without'
                + 'providing a path to the worker script'
            );
        }
        this.filePath = filepath;
        //TODO: Validate config parameter object in dev mode before merging into default config (and throw err in dev mode)
        if (config) {
            this.config = {
                ...this.config,
                ...config
            }
        }
        if (onMessage && typeof onMessage === 'function') {
            this.onMessage = onMessage;
        }
        if (onError && typeof onError === 'function') {
            this.onError = onError;
        }
        if (this.config.initializationStrategy === InitializationStrategy.AT_START) {
            this.initializeWorkers(this.config.amountOfWorkers);
        }
    }
    private isCallbackDefined = () => {
        return !this.onMessage === undefined;
    }

    /**
     * Initializes all remaining worker slots, after this call the threadManager will have config.amountOfWorkers running.
     */
    public initializeWorkers = (amount: number) => {
        let currentAmount = this.workers.length;
        for (let i = 0; i < this.config.amountOfWorkers - currentAmount; i++) {
            if (amount && i >= amount) return;
            this.initializeWorker();
        }
    };


    /**
     * Initializes worker at index provided or at the end of the workers array if no index is provided.
     * Note: this doesnt initialize a worker if it would exceed amountOfWorkers amount.
     */
    public initializeWorker = (index?: number) => {
        if (index === undefined && this.workers.length < this.config.amountOfWorkers) {
            const index = this.workers.push(new Worker(this.filePath) as EnhancedWorker);
            const worker = this.workers[index-1];
            worker.id = index;
            worker.status = WorkerStatus.IDLE;
            worker.onmessage = this.messageHandler;
            return worker;
        } else if (index && index >= 0 && index < this.workers.length) {
            const worker = new Worker(this.filePath) as EnhancedWorker;
            worker.id = index;
            worker.status = WorkerStatus.IDLE;
            worker.onmessage = this.messageHandler;
            this.workers[index] = worker;
            return worker;
        }
    }


    private getCurrentHandler = (event: MessageEvent | ErrorEvent, index: number) => {
        if (isError(event)) {
            return this.middleware[index] || this.onError;
        } else {
            return this.middleware[index] || this.onMessage;
        }

    }


    private messageHandler = (event: MessageEvent | ErrorEvent) => {
        //generators must be regular functions, thus we need to store the context for usage inside the generator
        const that = this;
        if (event.currentTarget) {
            const target = event.currentTarget as EnhancedWorker;
            if (isError(event)) {
                target.status = WorkerStatus.CRASHED;
            } else {
                target.status = WorkerStatus.IDLE;
            }
        }
        //the functions steps the iterator one time forward and then passes itself to the handler returned by the iterator
        const next = function () {
            const currentHandler = middlewareIterator.next();
            if (!currentHandler.done) {
                currentHandler.value(event, next, ...arguments);
            }
        }

        const middlewareIterator = (function* () {
            let index = 0;
            let func = that.getCurrentHandler(event, index);
            while (func) {
                yield func;
                index++;
                func = that.getCurrentHandler(event, index);
            }
        })();
        next();

    }


    /**
     * @description Merges the provided and existing configurations, givinvg precedence to keys provided by the parameter
     */
    public setConfig = (config: Partial<ThreadManagerConfig>)=>{
        if (config) {
            this.config = {
                ...this.config,
                ...config
            };
        }
    }


    /**
     * @description Sets the logic to execute after middleware when middleware returns a normal message
     * 
     */ 
    public setMessageHandler = (eHandler: MessageHandler) => {
        if (!eHandler || typeof eHandler !== 'function') {
            throw new Error('Expected a function as argument and got a ' + typeof eHandler);
        }
        this.onMessage = eHandler;
    };


    /**
     * @description Sets the logic to execute after middleware in case the worker has sent an error message
     * 
     */ 
    public setErrorHandler = (eHandler: ErrorHandler) => {
        if (!eHandler || typeof eHandler !== 'function') {
            throw new Error('Expected a function as argument and got a ' + typeof eHandler);
        }
        this.onError = eHandler;
    }


    /**
     * 
     * Returns the managed web worker at the index provided
     *
     * 
     */
    public get = (index: number) => {
        if (index < this.workers.length) { return this.workers[index]; }
        else { return undefined; }
    }


    public use = (middleware?: Function) => {
        if (typeof middleware !== 'function') {
            throw new Error('ThreadManager middleware is expected to be a function, not a ' + typeof middleware);
        }
        this.middleware.push(middleware);
    }


    private parsePayload = (payload: any): any => {
        if (this.config.sendingStrategy === MessageSendingStrategy.JSON) {
            return this.stringifyPayload(payload);
        } else {
            return payload;
        }
    }


    private stringifyPayload = (payload: any): string => {
        return JSON.stringify(payload);
    }


    /**
     * Sends the payload to a worker chosen in function of the specified distribution strategy. 
     * If initialization is delayed and the ThreadManager can still manage more workers a new worker will be spawned and given the task instead.
     * For more info about the parameters check https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
     */ 
    public sendMessage = (payload: any, transfer?: Transferable[]) => {
        let parsedPayload = this.parsePayload(payload);
        if (this.config.sendingStrategy)
            //if not all workers are not initialized we initialize one of them and assign it the work
            if (this.workers.length < this.config.amountOfWorkers && this.config.initializationStrategy === InitializationStrategy.DELAYED) {
                return this.createAndGiveWork(parsedPayload, transfer);
            }
        let assignedWorker = this.chooseWorker();
        this.giveWork(assignedWorker, parsedPayload, transfer);

    }


    /**
     * Sends the payload to all managed workers
     * If initialization is delayed and the ThreadManager can still manage more workers all remaining slots for workers will be initialized with new workers before broadcasting the payload.
     * For more info about the parameters check https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
     */ 
    public broadcastMessage = (payload: any, transfer?: Transferable[]) => {
        if (this.workers.length < this.config.amountOfWorkers) {
            this.initializeWorkers(this.config.amountOfWorkers - this.workers.length);
        }

        let parsedPayload = this.parsePayload(payload);
        for (let i = 0; i < this.workers.length; i++) {
            this.giveWork(this.workers[i], parsedPayload, transfer);
        }
    }


    /**
     * 
     * @description Terminates the execution of a particular worker if index is provided, or of all workers if no index is provided
     */
    public terminate = (index?: number) => {
        if (index) {
            const worker = this.workers[index];
            if (worker) {
                worker.terminate();
            }
        } else {
            this.workers.forEach((worker) => worker.terminate());
        }

    }


    /**
     * 
     * @description Terminates and restarts the execution of all workers or a particular worker.
     * 
     * @param {Number} index - If index is provided just the worker with that index will be restarted 
     * 
     */
    public restart = (index?: number) => {
        if (index) {
            const worker = this.workers[index];
            if (worker) {
                worker.terminate();
                delete this.workers[index];
                this.initializeWorker(index);
            }
        } else {
            this.terminate();
            const amount = this.workers.length;
            this.workers = [];
            this.initializeWorkers(amount);
        }

    }


    private giveWork = (worker: EnhancedWorker, payload: any, transfer?: Transferable[]) => {
        if (transfer) {
            worker.postMessage(payload, transfer);
        } else {
            worker.postMessage(payload);
        }
        worker.status = WorkerStatus.BUSY;
    }


    private chooseWorker = () => {

        if (this.workers.length === 1) {
            return this.workers[0];
        }

        let assignedWorker = undefined;
        switch (this.config.distributionStrategy) {
            case WorkDistributionStrategy.ROUND_ROBIN:
                //If its the first time or we finished a round we distribute it to the first
                if (this.lastAssignedWorker === undefined || this.lastAssignedWorker < 0) {
                    assignedWorker = this.workers[0];
                    this.lastAssignedWorker = 1;
                } else {
                    //increase the index and use it to determine the actual worker to assign
                    assignedWorker = this.workers[this.lastAssignedWorker];
                    this.lastAssignedWorker++;
                    if (this.lastAssignedWorker >= this.workers.length) {
                        this.lastAssignedWorker = -1;
                    }
                }
                break;
            case WorkDistributionStrategy.FIRST_IDLE:
                for (let i = 0; i < this.workers.length; i++) {
                    if (this.workers[i].status === WorkerStatus.IDLE) {
                        assignedWorker = this.workers[i];
                        break;
                    }
                }
                //TODO: add a way to configure what to do as fallback, by now we assing it randomly via fallthrough to the next case;
                if (assignedWorker) {
                    break;
                }
            default:
                assignedWorker = this.workers[Math.floor(Math.random() * this.workers.length)];
                break;
        }
        return assignedWorker;
    }


    /**
     * @description Creates a new worker (if there are available slots for new workers in the thread manager) and sends it the paylod
     */
    createAndGiveWork = (payload: any, transfer?: Transferable[]) => {
        const newWorker = this.initializeWorker();
        if (newWorker) {
            this.giveWork(newWorker, payload, transfer);
        }
    };

}

export default ThreadManager;