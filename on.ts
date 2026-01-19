import { getAbortReason } from './abort';
import type { IDBEventMap, IDBTarget, OnOptions } from './types';

export function on<T extends IDBTarget, K extends keyof IDBEventMap<T>>(
  eventTarget: T,
  eventName: K,
  options?: OnOptions,
): AsyncIterableIterator<IDBEventMap<T>[K]>;
export function on<T extends Event = Event>(
  eventTarget: EventTarget,
  eventName: string,
  options?: OnOptions,
): AsyncIterableIterator<T>;
export function on<T extends Event = Event>(
  eventTarget: EventTarget,
  eventName: string,
  options: OnOptions = {},
): AsyncIterableIterator<T> {
  const queue: Event[] = [];
  const pending: Array<{
    resolve: (value: IteratorResult<T>) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  let finished = false;
  let error: unknown | null = null;

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
    if (finished || error) {
      return;
    }
    if (pending.length > 0) {
      const { resolve } = pending.shift()!;
      resolve({ value: event as T, done: false });
      return;
    }
    queue.push(event);
  }

  function handleError(event: Event) {
    if (finished || error) {
      return;
    }
    error = (event as ErrorEvent).error ?? event;
    cleanup();
    while (pending.length > 0) {
      const { reject } = pending.shift()!;
      reject(error);
    }
  }

  function handleAbort() {
    if (finished || error) {
      return;
    }
    error = getAbortReason(options.signal);
    cleanup();
    while (pending.length > 0) {
      const { reject } = pending.shift()!;
      reject(error);
    }
  }

  eventTarget.addEventListener(eventName, handleEvent);
  if (eventName !== 'error') {
    eventTarget.addEventListener('error', handleError);
  }
  if (options.signal) {
    if (options.signal.aborted) {
      handleAbort();
    } else {
      options.signal.addEventListener('abort', handleAbort, { once: true });
    }
  }

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (error) {
        return Promise.reject(error);
      }
      if (queue.length > 0) {
        const event = queue.shift()!;
        return Promise.resolve({ value: event as T, done: false });
      }
      if (finished) {
        return Promise.resolve({
          value: undefined as unknown as T,
          done: true,
        });
      }
      return new Promise<IteratorResult<T>>((resolve, reject) => {
        pending.push({ resolve, reject });
      });
    },
    return() {
      finished = true;
      cleanup();
      while (pending.length > 0) {
        const { resolve } = pending.shift()!;
        resolve({ value: undefined as unknown as T, done: true });
      }
      return Promise.resolve({ value: undefined as unknown as T, done: true });
    },
    throw(reason?: unknown) {
      finished = true;
      error = reason ?? new Error('Async iterator error');
      cleanup();
      while (pending.length > 0) {
        const { reject } = pending.shift()!;
        reject(error);
      }
      return Promise.reject(error);
    },
  };
}
