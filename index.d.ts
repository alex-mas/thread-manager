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
export declare type MessageHandler = (event: MessageEvent) => any;
export declare type ErrorHandler = (event: ErrorEvent) => any;
export declare class ThreadManager {
    config: ThreadManagerConfig;
    filePath: string;
    middleware: Function[];
    workers: EnhancedWorker[];
    onMessage?: MessageHandler;
    onError?: ErrorHandler;
    lastAssignedWorker: number;
    constructor(filepath: string, config?: Partial<ThreadManagerConfig>, onMessage?: MessageHandler, onError?: ErrorHandler);
    isCallbackDefined: () => boolean;
    initializeWorkers: (amount: number) => void;
    initializeWorker: () => EnhancedWorker | undefined;
    getCurrentHandler: (event: MessageEvent | ErrorEvent, index: number) => Function;
    messageHandler: (event: MessageEvent | ErrorEvent) => void;
    setMessageHandler: (eHandler: MessageHandler) => void;
    setErrorHandler: (eHandler: ErrorHandler) => void;
    get: (n: number) => EnhancedWorker | undefined;
    use: (middleware?: Function | undefined) => void;
    sendMessage: (payload: any) => void;
    broadcastMessage: (payload: any) => void;
    giveWork: (worker: EnhancedWorker, payload: any) => void;
    chooseWorker: () => EnhancedWorker;
    createAndGiveWork: (payload: any) => void;
}
export default ThreadManager;
