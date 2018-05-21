

const WorkerStatus = {
    IDLE: Symbol(1),
    BUSY: Symbol(2)
};

/**
 * @description - implements methods of delegating work to workers and acts as intermediary between the requesting objects and the workers
 * 
 * @param {String} relFilePath - path to the file that implements the desired worker
 * @param {Object} config - (OPTIONAL) defaults to an empty object
 * @param {function} eHandler - function that takes one argument, the event, which will hold the data passed back by the workers on message broadcasting
 * 
 * 
 * @property {Object} config - Holds the configuration provided by the user
 * @property {String} callerPath - Holds the path provided by __dirname on the context of the caller
 * @property {String} relFilePath - Holds the relative path from callerPath to the file the user wants to execute the worker
 * @property {Number} amountOfWorkers - Determines how many workers will the thread manage
 * @property {Worker[]} workers - Holds references to all the workers being managed
 * @property {Number} lastAssignedWorker - Matches the index of the worker inside workers array that was assigned work more recently
 * 
 */
const ThreadManager = function (filePath, config, eHandler) {
    if (!filePath) {
        throw new Error(
            'File path must be provided in order for the thread manager to work, expected a string but got a ' + filePath
        );
    }
    //configuration initialization

    this.config = config || {};

    if (typeof this.config !== 'object' || Array.isArray(this.config)) {
        throw new Error('Invalid configuration provided for the thread manager');
    }
    if (!this.config.distributionMethod) { this.config.distributionMethod = "round robin"; }
    if (!this.config.initialization) { this.config.initialization = "at_start"; }
    if (!this.config.sendingMethod) { this.config.sendingMethod = "default"; }

    this.filePath = filePath;

    //worker config
    this.amountOfWorkers = config.amountOfWorkers || 4;
    this.workers = [];
    this.lastAssignedWorker = -1;

    //define provided handler
    if (!eHandler || typeof eHandler !== "function") {
        this.isCallbackDefined = false;
    } else {
        this.onMessage = eHandler;
        this.isCallbackDefined = true;
    }

    if (this.config.initialization === "at_start") {
        this.initializeWorkers();
    }

};

/**
 * 
 * @param {Number} amount 
 * @param {Function} [handler] 
 */
ThreadManager.prototype.initializeWorkers = function (amount, handler) {
    let initializedWorkers = 0;
    let currentAmount = this.workers.length;
    for (let i = 0; i < this.amountOfWorkers - currentAmount; i++) {
        if (amount && i >= amount) return;
        this.initializeWorker(handler);
    }
};


ThreadManager.prototype.initializeWorker = function (handler) {
    if (this.workers.length < this.amountOfWorkers) {
        this.workers.push(new Worker(this.filePath));
        const index = this.workers.length - 1;
        const worker = this.workers[index];
        worker.id = index;
        worker.status = WorkerStatus.IDLE;
        if (handler) {
            this.setEventHandler(worker, handler);
        } else {
            this.setEventHandler(worker, this.onMessage);
        }
        return worker;
    } else {
        console.warn('Adding more threads that exceed the configured ammount, change the configured ammount instead');
    }
}

ThreadManager.prototype._eventHandler = (callback, workerid) => {
    if (callback) {
        return (event) => {
            this.workerStatus[workerid] = 'idle';
            callback(event);
        }
    }
}


ThreadManager.prototype.setDefaultEventHandler = function (handler) {
    if (!handler || typeof handler !== 'function') {
        throw new Error('Expected a function as argument and got a ' + typeof handler);
    }
    this.onMessage = handler;
    this.isCallbackDefined = true;
};


ThreadManager.prototype.setEventHandler = function (worker, handler) {
    worker.onmessage = this._eventHandler(handler, worker.id);
}

ThreadManager.prototype.distributeWork = function (event, context, callback) {
    let workHandler = callback || this.onMessage;
    if (workHandler === undefined || typeof workHandler !== "function") {
        throw new Error('Cant distribute work without a function to handle its return value');
    }

    //if not all workers are not initialized we initialize one of them and assign it the work
    if (this.workers.length < this.amountOfWorkers && this.config.initialization === "delayed") {
        return this.createAndGiveWork(workHandler, event, context);
    }

    let assignedWorker = this.chooseWorker();

    if (workHandler !== assignedWorker.onMessage) {
        this.setEventHandler(assignedWorker, workHandler);
    }
    this.giveWork(assignedWorker, event, context);

}


ThreadManager.prototype.broadcast = function (event, context, callback) {
    let workHandler = callback || this.onMessage;
    if (workHandler === undefined || typeof workHandler !== "function") {
        throw new Error('Cant distribute work without a function to handle its return value');
    }
    if (this.workers.length < this.amountOfWorkers) {
        this.initializeWorkers();
    }
    for (let i = 0; i < this.workers.length; i++) {
        if (workHandler !== this.workers[i].onmessage) {
            this.setEventHandler(this.workers[i], workHandler);
        }
        this.giveWork(this.workers[i], event, context);
    }
}

ThreadManager.prototype.giveWork = function (worker, event, context) {
    worker.status = WorkerStatus.BUSY;
    if (this.config.sendingMethod === "transferList") {
        worker.postMessage(context, [context]);
    } else if (this.config.sendingMethod === 'json') {
        let data = { event, context };
        worker.postMessage(JSON.stringify(data));
    } else {
        worker.postMessage({ event, context });
    }
}


ThreadManager.prototype.chooseWorker = function () {

    if (this.workers.length === 1) {
        return this.workers[0];
    }

    let assignedWorker;
    switch (this.config.distributionMethod) {
        case 'round robin':
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
        case 'first idle':
            let foundIdleWorker = false;
            for (let i = 0; i < this.workers.length; i++) {
                if (this.workers[i].status === WorkerStatus.IDLE) {
                    foundIdleWorker = true;
                    assignedWorker = this.workers[i];
                    break;
                }
            }
            //TODO: add a way to configure what to do as fallback, by now we assing it randomly via fallthrough to the next case;
            if (foundIdleWorker) {
                break;
            }
        default:
            assignedWorker = this.workers[Math.floor(Math.random() * this.workers.length)];
            break;
    }
    return assignedWorker;
}


ThreadManager.prototype.createAndGiveWork = function (event, context, handler) {
    const newWorker = this.initializeWorker(handler);
    this.giveWork(newWorker, event, context);
};

module.exports = ThreadManager;