

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
 * If the sending strategy is TRANSFER_LIST => payload must be transferable (check https://developer.mozilla.org/en-US/docs/Web/API/Transferable)
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
    TRANSFER_LIST = 'TRANSFER_LIST',
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
        //TODO: Validate config parameter object in dev mode before merging into default config
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
    isCallbackDefined = () => {
        return !this.onMessage === undefined;
    }
    initializeWorkers = (amount: number) => {
        let currentAmount = this.workers.length;
        for (let i = 0; i < this.config.amountOfWorkers - currentAmount; i++) {
            if (amount && i >= amount) return;
            this.initializeWorker();
        }
    };
    initializeWorker = () => {
        if (this.workers.length < this.config.amountOfWorkers) {
            this.workers.push(new Worker(this.filePath) as EnhancedWorker);
            const index = this.workers.length - 1;
            const worker = this.workers[index];
            worker.id = index;
            worker.status = WorkerStatus.IDLE;
            worker.onmessage = this.messageHandler;
            return worker;
        } else {
            console.warn('Adding more threads that exceed the configured ammount, change the configured ammount instead');
        }
    }
    getCurrentHandler = (event: MessageEvent | ErrorEvent, index: number) => {
        if (isError(event)) {
            return this.middleware[index] || this.onError;
        } else {
            return this.middleware[index] || this.onMessage;
        }

    }
    messageHandler = (event: MessageEvent | ErrorEvent) => {
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
        const next = function() {
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
    setMessageHandler = (eHandler: MessageHandler) => {
        if (!eHandler || typeof eHandler !== 'function') {
            throw new Error('Expected a function as argument and got a ' + typeof eHandler);
        }
        this.onMessage = eHandler;
    };

    setErrorHandler = (eHandler: ErrorHandler) => {
        if (!eHandler || typeof eHandler !== 'function') {
            throw new Error('Expected a function as argument and got a ' + typeof eHandler);
        }
        this.onError = eHandler;
    }

    get = (n: number) => {
        if (n < this.workers.length) { return this.workers[n]; }
        else { return undefined; }
    }
    use = (middleware?: Function) => {
        if (typeof middleware !== 'function') {
            throw new Error('ThreadManager middleware is expected to be a function, not a ' + typeof middleware);
        }
        this.middleware.push(middleware);
    }

    sendMessage = (payload: any) => {
        let parsedPayload = this.parsePayload(payload);
        if(this.config.sendingStrategy)
        //if not all workers are not initialized we initialize one of them and assign it the work
        if (this.workers.length < this.config.amountOfWorkers && this.config.initializationStrategy === InitializationStrategy.DELAYED) {
            return this.createAndGiveWork(parsedPayload);
        }
        let assignedWorker = this.chooseWorker();
        this.giveWork(assignedWorker, parsedPayload);

    }

    parsePayload = (payload: any): any=>{
        if(this.config.sendingStrategy === MessageSendingStrategy.JSON){
            return this.stringifyPayload(payload);
        }else{
            return payload;
        }
    }
    stringifyPayload = (payload: any): string=>{
        return JSON.stringify(payload);
    }

    broadcastMessage = (payload: any) => {
        if (this.workers.length < this.config.amountOfWorkers) {
            this.initializeWorkers(this.config.amountOfWorkers - this.workers.length);
        }

        let parsedPayload = this.parsePayload(payload);
        for (let i = 0; i < this.workers.length; i++) {
            this.giveWork(this.workers[i], parsedPayload);
        }
    }

    giveWork = (worker: EnhancedWorker, payload: any) => {
        if (this.config.sendingStrategy === MessageSendingStrategy.TRANSFER_LIST) {
            worker.postMessage(payload, [payload]);
        //JSON method handled by parsePayload mehthod
        } else {
            worker.postMessage(payload);
        }
        worker.status = WorkerStatus.BUSY;
    }


    chooseWorker = () => {

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
    createAndGiveWork = (payload: any) => {
        const newWorker = this.initializeWorker();
        if (newWorker) {
            this.giveWork(newWorker, payload);
        }
    };

}

export default ThreadManager;