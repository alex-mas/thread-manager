
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
    amountOfWorkers: window.navigator.hardwareConcurrency/2,
    initializationStrategy: InitializationStrategy.AT_START,
    sendingStrategy: MessageSendingStrategy.DEFAULT
}


export interface WorkerMessage {
    event: MessageEvent,
    type: string,
    payload: any
}



export class ThreadManager {
    config: Exclude<ThreadManagerConfig, 'amountOfOwrkers'>;
    filePath: string;
    middleware: Function[];
    workers: EnhancedWorker[];
    onMessage: Function;
    onError: Function;
    lastAssignedWorker: number;
    construtor(filepath: string, config?: Partial<ThreadManagerConfig>, onMessage?: Function, onError?: Function) {
        if (!filepath) {
            throw new Error(
                'can\'t initialize the thread manager without'
                + 'providing a path to the worker script'
            );
        }
        this.filePath = filepath;
        this.config = defaultConfiguration;
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
            worker.onmessage= this.eventHandler;
            return worker;
        } else {
            console.warn('Adding more threads that exceed the configured ammount, change the configured ammount instead');
        }
    }
    eventHandler = (event: MessageEvent)=>{
        //TODO: abstract middleware logic into a separate function so that it can be used for errors too
        //TODO: Delegate control flow to middlewares so they can stop event propagation by not calling next handler
       //this.status  = WorkerStatus.IDLE;
       for (let i = 0; i < this.middleware.length; i++) {
            this.middleware[i](event);
        }
        if(this.onMessage){
            this.onMessage(event);
        }
      
    }
    errorHandler = (event: ErrorEvent)=>{
        //TODO: allow middleware to handle errors too
        //this.status = WorkerStatus.CRASHED;
        if(this.onError){
            this.onError(event);
        }
    };
    setMessageHandler = (eHandler: Function) => {
        if (!eHandler || typeof eHandler !== 'function') {
            throw new Error('Expected a function as argument and got a ' + typeof eHandler);
        }
        this.onMessage = eHandler;
    };

    setErrorHandler = (eHandler: ErrorEventHandler)=>{
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

    distribute = (event, payload) => {

        //if not all workers are not initialized we initialize one of them and assign it the work
        if (this.workers.length < this.config.amountOfWorkers && this.config.initializationStrategy === InitializationStrategy.DELAYED) {
            return this.createAndGiveWork(event, payload);

        }
        let assignedWorker = this.chooseWorker();
        this.giveWork(assignedWorker, event, payload);

    }

    giveWork = (worker: EnhancedWorker, type: string, payload: any) => {
        let data = { type, payload };
        if (this.config.sendingStrategy === MessageSendingStrategy.TRANSFER_LIST) {
            //TODO: keep same laoyut as other sending methods
            worker.postMessage(payload, [payload]);
        } else if (this.config.sendingStrategy === MessageSendingStrategy.JSON) {
            
            worker.postMessage(JSON.stringify(data));
        } else {
            worker.postMessage(data);
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
    createAndGiveWork = (event: string, payload: any) => {
        const newWorker = this.initializeWorker();
        this.giveWork(newWorker, event, payload);
    };

}
export default ThreadManager;