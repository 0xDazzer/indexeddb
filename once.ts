import { getAbortReason } from './abort';
import type { IDBEventMap, IDBTarget, OnceOptions } from './types';

export function once<T extends IDBTarget, K extends keyof IDBEventMap<T>>(
  eventTarget: T,
  eventName: K,
  options?: OnceOptions,
): Promise<IDBEventMap<T>[K]>;

export function once<T extends Event = Event>(
  eventTarget: EventTarget,
  eventName: string,
  options?: OnceOptions,
): Promise<T>;

export function once<T extends Event = Event>(
  eventTarget: EventTarget,
  eventName: string,
  options: OnceOptions = {},
): Promise<T> {
  if (options.signal?.aborted) {
    return Promise.reject(getAbortReason(options.signal));
  }
  return new Promise<T>((resolve, reject) => {
    function cleanup() {
      eventTarget.removeEventListener(eventName, handleEvent);
      if (eventName !== 'error') {
        eventTarget.removeEventListener('error', handleError);
      }
      if (options.signal) {
        options.signal.removeEventListener('abort', handleAbort);
      }
    }

    function handleEvent(event: Event) {
      cleanup();
      resolve(event as T);
    }

    function handleError(event: Event) {
      cleanup();
      const error = (event as ErrorEvent).error ?? event;
      reject(error);
    }

    function handleAbort() {
      cleanup();
      reject(getAbortReason(options.signal));
    }

    eventTarget.addEventListener(eventName, handleEvent);
    if (eventName !== 'error') {
      eventTarget.addEventListener('error', handleError);
    }
    if (options.signal) {
      options.signal.addEventListener('abort', handleAbort, { once: true });
    }
  });
}
