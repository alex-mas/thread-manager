

export enum WorkerStatus {
    IDLE = 1,
    BUSY = 2,
    CRASHED = 3
};


export interface EnhancedWorker extends Worker {
    id: number,
    status: WorkerStatus
}

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


const isError = (event: ErrorEvent | MessageEvent):event is ErrorEvent =>{
    return event instanceof ErrorEvent;
}


export type MessageHandler =(event: MessageEvent)=>any;
export type ErrorHandler = (event: ErrorEvent)=>any;

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
        if (config) {
            if (config.amountOfWorkers !== undefined) {
                this.config.amountOfWorkers = config.amountOfWorkers;
            }
            if (config.distributionStrategy) {
                this.config.distributionStrategy = config.distributionStrategy;
            }
            if (config.initializationStrategy) {
                this.config.initializationStrategy = config.initializationStrategy;
            }
            if (config.sendingStrategy) {
                this.config.sendingStrategy = config.sendingStrategy;
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
    getCurrentHandler = (event: MessageEvent | ErrorEvent, index: number)=>{
        if(isError(event)){
            return this.middleware[index] || this.onError;
        }else{
            return this.middleware[index] || this.onMessage;
        }
      
    }
    messageHandler = (event: MessageEvent | ErrorEvent)=>{
        //generators must be regular functions, thus we need to store the context for usage inside the generator
        const that = this;

        //the functions steps the iterator one time forward and then passes itself to the handler returned by the iterator
        const next = () => {
            const currentHandler = middlewareIterator.next();
            if(!currentHandler.done){
                currentHandler.value(event, next);
            }
        }

        const middlewareIterator = (function* () {
            let index = 0;
            let func = that.getCurrentHandler(event,index);
            while(func){
                yield func;
                index++;
                func = that.getCurrentHandler(event,index);
            }
        })();

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

        //if not all workers are not initialized we initialize one of them and assign it the work
        if (this.workers.length < this.config.amountOfWorkers && this.config.initializationStrategy === InitializationStrategy.DELAYED) {
            return this.createAndGiveWork(payload);

        }
        let assignedWorker = this.chooseWorker();
        this.giveWork(assignedWorker, payload);

    }


    broadcastMessage = (payload: any) => {
        if (this.workers.length < this.config.amountOfWorkers) {
            this.initializeWorkers(this.config.amountOfWorkers - this.workers.length);
        }
        for (let i = 0; i < this.workers.length; i++) {
            this.giveWork(this.workers[i], payload);
        }
    }


    giveWork = (worker: EnhancedWorker, payload: any) => {
        if (this.config.sendingStrategy === MessageSendingStrategy.TRANSFER_LIST) {
            //TODO: keep same laoyut as other sending methods
            worker.postMessage(payload, [payload]);
        } else if (this.config.sendingStrategy === MessageSendingStrategy.JSON) {

            worker.postMessage(JSON.stringify(payload));
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