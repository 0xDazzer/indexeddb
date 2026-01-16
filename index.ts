import {indexedDB} from 'fake-indexeddb';

const enum EventTypes {
    Error = 'error',
    Abort = 'abort',
    Success = 'success',
    Blocked = 'blocked',
    Complete = 'complete',
    UpgradeNeeded = 'upgradeneeded',
}
interface IOptions {
    signal?: AbortSignal;
}

type UpgradeHandler = (db: IDBDatabase) => void;

function once<T extends Event>(eventTarget: EventTarget, eventName: string, options: IOptions = {}): Promise<T> {
    const {signal} = options;

    if (signal?.aborted) return Promise.reject(new Error('Operation aborted'));

    return new Promise((resolve, reject) => {
        const removeListeners = (): void => {
            if (signal) signal.removeEventListener(EventTypes.Abort, onAbort);
            eventTarget.removeEventListener(eventName, onEvent);
        };

        const onAbort = (): void => {
            removeListeners();
            reject(new Error('Operation aborted'));
        };

        const onEvent = (data: Event): void => {
            removeListeners();
            resolve(data as T);
        };

        if (signal) signal.addEventListener(EventTypes.Abort, onAbort);
        eventTarget.addEventListener(eventName, onEvent);
    });
}

async function* on<T extends Event>(
    eventTarget: EventTarget,
    eventName: string,
    options: IOptions = {},
): AsyncGenerator<T> {
    while (true) {
        yield await once<T>(eventTarget, eventName, options);
    }
}

async function adaptRequest<T>(request: IDBRequest): Promise<T> {
    const controller = new AbortController();
    const {signal} = controller;

    try {
        const result = await Promise.race([
            once<Event>(request, EventTypes.Success, {signal}),
            once<Event>(request, EventTypes.Error, {signal}),
        ]);

        if (result.type === EventTypes.Success) return request.result as T;
        else throw request.error;
    } finally {
        controller.abort();
    }
}

async function adaptOpenDBRequest<T>(request: IDBOpenDBRequest, upgradeHandler?: UpgradeHandler): Promise<T> {
    const controller = new AbortController();
    const {signal} = controller;

    const ignoreAbort = (err: Error): void => {
        if (err.message === 'Operation aborted' || err.name === 'AbortError') return;
        throw err;
    };

    return new Promise<T>((resolve, reject) => {
        once<Event>(request, EventTypes.UpgradeNeeded, {signal})
            .then(() => upgradeHandler?.(request.result))
            .catch(ignoreAbort);

        once<Event>(request, EventTypes.Blocked, {signal})
            .then(() => reject(new Error('Database is blocked')))
            .catch(ignoreAbort);

        once<Event>(request, EventTypes.Success, {signal})
            .then(() => resolve(request.result as T))
            .catch(ignoreAbort);

        once<Event>(request, EventTypes.Error, {signal})
            .then(() => reject(request.error))
            .catch(ignoreAbort);
    }).finally(() => controller.abort());
}

async function adaptDB<T>(name: string, version: number = 1, upgradeHandler?: UpgradeHandler): Promise<T> {
    const request = indexedDB.open(name, version);
    return await adaptOpenDBRequest<T>(request, upgradeHandler);
}

export {once, on, adaptRequest, adaptDB};
