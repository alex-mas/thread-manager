export declare enum WorkerStatus {
    IDLE = 1,
    BUSY = 2,
    CRASHED = 3
}
export type EnhancedWorker = (Worker | SharedWorker) & {
    id: number;
    status: WorkerStatus;
    pendingTasks: number;
};
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
export declare enum MessageSendingStrategy {
    DEFAULT = "DEFAULT",
    JSON = "JSON"
}
export declare enum WorkDistributionStrategy {
    ROUND_ROBIN = "ROUND_ROBIN",
    FIRST_IDLE = "FIRST_IDLE"
}
/**
 *
 * with AT_START all threads are initialized when the tread manager is constructed
 *
 * with DELAYED the threads are initialized when there are no idle threads to handle incoming messages
 *
 *
 */
export declare enum InitializationStrategy {
    AT_START = "AT_START",
    DELAYED = "DELAYED"
}
export interface ThreadManagerConfig {
    distributionStrategy: WorkDistributionStrategy;
    initializationStrategy: InitializationStrategy;
    sendingStrategy: MessageSendingStrategy;
    amount: number;
}
export interface WorkerMessage {
    event: MessageEvent;
    type: string;
    payload: any;
}
export type ThreadManagerMiddleware = (e: ErrorEvent | MessageEvent, next: (...args: any[]) => void, ...extraArgs: any[]) => void;
export type MessageHandler = (event: MessageEvent) => any;
export type ErrorHandler = (event: ErrorEvent) => any;
export type ThreadManagerConstructorProps = {
    src: string | URL;
    config?: Partial<ThreadManagerConfig>;
    onMessage?: MessageHandler;
    onError?: ErrorHandler;
    createWorker: (filePath: string | URL) => Worker;
};
export declare class ThreadManager {
    config: ThreadManagerConfig;
    src: string | URL;
    middleware: Function[];
    workers: EnhancedWorker[];
    onMessage?: MessageHandler;
    onError?: ErrorHandler;
    lastAssignedWorker: number;
    createWorker: (src: string | URL) => Worker;
    constructor({ src, config, onMessage, onError, createWorker }: ThreadManagerConstructorProps);
    private isCallbackDefined;
    /**
     * Initializes all remaining worker slots, after this call the threadManager will have config.amount running.
     */
    initializeWorkers: (amount: number) => void;
    /**
     * Initializes worker at index provided or at the end of the workers array if no index is provided.
     * Note: this doesnt initialize a worker if it would exceed config.amount.
     */
    initializeWorker: (index?: number) => EnhancedWorker | undefined;
    private getCurrentHandler;
    private messageHandler;
    /**
     * @description Merges the provided and existing configurations, givinvg precedence to keys provided by the parameter
     */
    setConfig: (config: Partial<ThreadManagerConfig>) => void;
    /**
     * @description Sets the logic to execute after middleware when middleware returns a normal message
     *
     */
    setMessageHandler: (eHandler: MessageHandler) => void;
    /**
     * @description Sets the logic to execute after middleware in case the worker has sent an error message
     *
     */
    setErrorHandler: (eHandler: ErrorHandler) => void;
    /**
     *
     * Returns the managed web worker at the index provided
     *
     *
     */
    get: (index: number) => EnhancedWorker | undefined;
    use: (middleware?: ThreadManagerMiddleware) => void;
    /**
     *
     * In order to unuse middleware the exact reference to the function provided as parameter to use must be passed here, as they are compared via ===
     *
     */
    unuse: (func: ThreadManagerMiddleware) => void;
    private parsePayload;
    private stringifyPayload;
    /**
     * Sends the payload to a worker chosen in function of the specified distribution strategy.
     * If initialization is delayed and the ThreadManager can still manage more workers a new worker will be spawned and given the task instead.
     * For more info about the parameters check https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
     */
    sendMessage: (payload: any, transfer?: Transferable[]) => void;
    /**
     *
     * Returns a promise that resolves when a thread responds to the message
     *
     */
    sendMessageAsync: (returnCondition: (e: ErrorEvent | MessageEvent, ...extraArgs: any[]) => boolean, payload: any, transfer?: Transferable[], timeout?: number) => Promise<unknown>;
    /**
     * Sends the payload to all managed workers
     * If initialization is delayed and the ThreadManager can still manage more workers all remaining slots for workers will be initialized with new workers before broadcasting the payload.
     * This method doesn't accecpt transferables as you can't access the resources once they are transfered to the first worker.
     */
    broadcastMessage: (payload: any) => void;
    /**
     *
     * @description Terminates the execution of a particular worker if index is provided, or of all workers if no index is provided
     */
    terminate: (index?: number) => void;
    /**
     *
     * @description Terminates and restarts the execution of all workers or a particular worker.
     *
     * @param {Number} index - If index is provided just the worker with that index will be restarted
     *
     */
    restart: (index?: number) => void;
    private giveWork;
    private chooseWorker;
    /**
     * @description Creates a new worker (if there are available slots for new workers in the thread manager) and sends it the paylod
     */
    createAndGiveWork: (payload: any, transfer?: Transferable[]) => void;
}
export default ThreadManager;
