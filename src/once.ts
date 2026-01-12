/**
 * Design Patterns Implementation:
 *
 * 1. Observer:
 * The code subscribes to specific events on the `EventTarget` (Subject) using
 * `addListener`. It reacts to these state changes (success, error, abort).
 *
 * 2. Adapter:
 * Adapts the standard EventListener API (callback-based) into a Promise API.
 * This allows the consumer to use `await` and standard error handling (try/catch)
 * instead of managing callbacks manually.
 *
 * 3. Command:
 * Encapsulates cleanup actions (removing listeners, clearing timers) as distinct
 * functions pushed into a `cleanups` array. These commands are executed as a
 * batch via `cleanupAll()`.
 *
 * 4. Facade:
 * Provides a simplified public interface (`once`) that hides the complex subsystem
 * logic involving event coordination, signal handling, race conditions, and memory cleanup.
 */

import { addListener, Cleanup, shouldListenError } from './listeners';

export type OnceOptions = {
    signal?: AbortSignal;
    errorEvent?: string; // default: 'error'; set to '' to disable
};

export function once<T extends Event = Event>(
    target: EventTarget,
    type: string,
    options: OnceOptions = {},
): Promise<T> {
    const { signal, errorEvent = 'error' } = options;

    if (signal?.aborted) return Promise.reject(signal.reason);

    const { promise, resolve, reject } = Promise.withResolvers<T>();
    let done = false;

    const finish = (fn: () => void) => {
        if (done) return;
        done = true;
        cleanupAll();
        fn();
    };

    const cleanups: Cleanup[] = [];
    const cleanupAll = () => {
        for (const c of cleanups.splice(0)) c();
    };

    const onSuccess: EventListener = (e) => finish(() => resolve(e as T));

    const onError: EventListener = (e) => finish(() => reject(e));

    const onAbort: EventListener = () => finish(() => reject(signal!.reason));

    cleanups.push(addListener(target, type, onSuccess, { once: true }));

    if (shouldListenError(errorEvent, type)) {
        cleanups.push(addListener(target, errorEvent, onError, { once: true }));
    }

    if (signal) {
        cleanups.push(addListener(signal, 'abort', onAbort, { once: true }));
    }

    return promise;
}
