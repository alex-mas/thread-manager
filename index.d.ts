export declare enum WorkerStatus {
    IDLE = 1,
    BUSY = 2,
    CRASHED = 3
}
export interface EnhancedWorker extends Worker {
    id: number;
    status: WorkerStatus;
    pendingTasks: number;
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
    amountOfWorkers: number;
}
export interface WorkerMessage {
    event: MessageEvent;
    type: string;
    payload: any;
}
export declare type ThreadManagerMiddleware = (e: ErrorEvent | MessageEvent, next: (...args: any[]) => void, ...extraArgs: any[]) => void;
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
    private isCallbackDefined;
    /**
     * Initializes all remaining worker slots, after this call the threadManager will have config.amountOfWorkers running.
     */
    initializeWorkers: (amount: number) => void;
    /**
     * Initializes worker at index provided or at the end of the workers array if no index is provided.
     * Note: this doesnt initialize a worker if it would exceed amountOfWorkers amount.
     */
    initializeWorker: (index?: number | undefined) => EnhancedWorker | undefined;
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
    use: (middleware?: ThreadManagerMiddleware | undefined) => void;
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
    sendMessage: (payload: any, transfer?: Transferable[] | undefined) => void;
    /**
     *
     * Returns a promise that resolves when a thread responds to the message
     *
     */
    sendMessageAsync: (returnCondition: (e: MessageEvent | ErrorEvent, ...extraArgs: any[]) => boolean, payload: any, transfer?: Transferable[] | undefined, timeout?: number | undefined) => Promise<{}>;
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
    terminate: (index?: number | undefined) => void;
    /**
     *
     * @description Terminates and restarts the execution of all workers or a particular worker.
     *
     * @param {Number} index - If index is provided just the worker with that index will be restarted
     *
     */
    restart: (index?: number | undefined) => void;
    private giveWork;
    private chooseWorker;
    /**
     * @description Creates a new worker (if there are available slots for new workers in the thread manager) and sends it the paylod
     */
    createAndGiveWork: (payload: any, transfer?: Transferable[] | undefined) => void;
}
export default ThreadManager;
