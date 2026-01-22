const eventTypes = {
    error: 'error',
    abort: 'abort',
    success: 'success',
    blocked: 'blocked',
    complete: 'complete',
    upgradeNeeded: 'upgradeneeded',
};

function once(eventTarget, eventName, options = {}) {
    const {signal} = options;

    if (signal?.aborted) return Promise.reject(new Error('Operation aborted'));

    return new Promise((resolve, reject) => {
        const removeListeners = () => {
            if (signal) signal.removeEventListener(eventTypes.abort, onAbort);
            eventTarget.removeEventListener(eventName, onEvent);
        };

        const onAbort = () => {
            removeListeners();
            reject(new Error('Operation aborted'));
        };

        const onEvent = (data) => {
            removeListeners();
            resolve(data);
        };

        if (signal) signal.addEventListener(eventTypes.abort, onAbort);
        eventTarget.addEventListener(eventName, onEvent);
    });
}

async function adaptRequest(request) {
    const controller = new AbortController();
    const {signal} = controller;

    try {
        const result = await Promise.race([
            once(request, eventTypes.success, {signal}),
            once(request, eventTypes.error, {signal}),
        ]);

        if (result.type === eventTypes.success) return request.result;
        else throw request.error;
    } finally {
        controller.abort();
    }
}

async function* adaptRequestIterator(request) {
    while (true) {
        yield await adaptRequest(request);
    }
}

async function adaptOpenDBRequest(request, upgradeHandler) {
    const controller = new AbortController();
    const {signal} = controller;

    const ignoreAbort = (err) => {
        if (err.message === 'Operation aborted' || err.name === 'AbortError') return;
        throw err;
    };

    return new Promise((resolve, reject) => {
        once(request, eventTypes.upgradeNeeded, {signal})
            .then(() => upgradeHandler?.(request.result))
            .catch(ignoreAbort);

        once(request, eventTypes.blocked, {signal})
            .then(() => reject(new Error('Database is blocked')))
            .catch(ignoreAbort);

        once(request, eventTypes.success, {signal})
            .then(() => resolve(request.result))
            .catch(ignoreAbort);

        once(request, eventTypes.error, {signal})
            .then(() => reject(request.error))
            .catch(ignoreAbort);
    }).finally(() => controller.abort());
}

function adaptCursor(sourceCursor) {
    const cursor = Object.create(sourceCursor);
    cursor.update = (value) => adaptRequest(sourceCursor.update(value));
    cursor.delete = () => adaptRequest(sourceCursor.delete());
    return () => adaptRequestIterator(sourceCursor);
}

function adaptIndex(sourceIndex) {
    const index = Object.create(sourceIndex);
    index.get = (key) => adaptRequest(sourceIndex.get(key));
    index.getKey = (key) => adaptRequest(sourceIndex.getKey(key));
    index.count = (query) => adaptRequest(sourceIndex.count(query));
    index.getAll = (query, count) => adaptRequest(sourceIndex.getAll(query, count));
    index.getAllKeys = (query, count) => adaptRequest(sourceIndex.getAllKeys(query, count));
    index.openCursor = (query, direction) => adaptCursor(sourceIndex.openCursor(query, direction))();
    index.openKeyCursor = (query, direction) => adaptCursor(sourceIndex.openKeyCursor(query, direction))();
    return index;
}

function adaptObjectStore(sourceStore) {
    const store = Object.create(sourceStore);
    store.clear = () => adaptRequest(sourceStore.clear());
    store.get = (key) => adaptRequest(sourceStore.get(key));
    store.index = (name) => adaptIndex(sourceStore.index(name));
    store.delete = (key) => adaptRequest(sourceStore.delete(key));
    store.getKey = (key) => adaptRequest(sourceStore.getKey(key));
    store.count = (query) => adaptRequest(sourceStore.count(query));
    store.put = (value, key) => adaptRequest(sourceStore.put(value, key));
    store.add = (value, key) => adaptRequest(sourceStore.add(value, key));
    store.getAll = (query, count) => adaptRequest(sourceStore.getAll(query, count));
    store.getAllKeys = (query, count) => adaptRequest(sourceStore.getAllKeys(query, count));
    store.openCursor = (query, direction) => adaptCursor(sourceStore.openCursor(query, direction))();
    store.openKeyCursor = (query, direction) => adaptCursor(sourceStore.openKeyCursor(query, direction))();
    store.createIndex = (name, keyPath, options) => adaptIndex(sourceStore.createIndex(name, keyPath, options));
    return store;
}

function adaptTransaction(sourceTX) {
    const tx = Object.create(sourceTX);
    Object.defineProperty(tx, 'objectStoreNames', {
        value: Array.from(sourceTX.objectStoreNames),
        writable: true,
        enumerable: true,
        configurable: true,
    });
    tx.objectStore = (name) => adaptObjectStore(sourceTX.objectStore(name));
    return tx;
}

async function adaptDB(sourceDB) {
    const db = Object.create(sourceDB);
    db.transaction = (storeNames, mode, options) => adaptTransaction(sourceDB.transaction(storeNames, mode, options));
    db.createObjectStore = (name, options) => adaptObjectStore(sourceDB.createObjectStore(name, options));
    return db;
}

async function openDB(name, upgradeHandler) {
    const request = indexedDB.open(name);
    const sourceDB = await adaptOpenDBRequest(request, upgradeHandler);
    return adaptDB(sourceDB);
}

export {openDB};
