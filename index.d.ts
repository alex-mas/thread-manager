export declare enum WorkerStatus {
    IDLE = 1,
    BUSY = 2,
    CRASHED = 3
}
export interface EnhancedWorker extends Worker {
    id: number;
    status: WorkerStatus;
}
export declare enum MessageSendingStrategy {
    DEFAULT = "DEFAULT",
    TRANSFER_LIST = "TRANSFER_LIST",
    JSON = "JSON"
}
export declare enum WorkDistributionStrategy {
    ROUND_ROBIN = "ROUND_ROBIN",
    FIRST_IDLE = "FIRST_IDLE"
}
export declare enum InitializationStrategy {
    AT_START = "AT_START",
    DELAYED = "DELAYED"
}
export interface ThreadManagerConfig {
    distributionStrategy: WorkDistributionStrategy;
    initializationStrategy: InitializationStrategy;
    sendingStrategy: MessageSendingStrategy;
    amountOfWorkers: number;
}
export interface WorkerMessage {
    event: MessageEvent;
    type: string;
    payload: any;
}
export declare class ThreadManager {
    config: ThreadManagerConfig;
    filePath: string;
    middleware: Function[];
    workers: EnhancedWorker[];
    onMessage?: Function;
    onError?: Function;
    lastAssignedWorker: number;
    constructor(filepath: string, config?: Partial<ThreadManagerConfig>, onMessage?: Function, onError?: Function);
    isCallbackDefined: () => boolean;
    initializeWorkers: (amount: number) => void;
    initializeWorker: () => EnhancedWorker | undefined;
    eventHandler: (event: MessageEvent) => void;
    errorHandler: (event: ErrorEvent) => void;
    setMessageHandler: (eHandler: Function) => void;
    setErrorHandler: (eHandler: ErrorEventHandler) => void;
    get: (n: number) => EnhancedWorker | undefined;
    use: (middleware?: Function | undefined) => void;
    sendMessage: (type: string, payload: any) => void;
    broadcastMessage: (type: string, payload: any) => void;
    giveWork: (worker: EnhancedWorker, type: string, payload: any) => void;
    chooseWorker: () => EnhancedWorker;
    createAndGiveWork: (event: string, payload: any) => void;
}
export default ThreadManager;
