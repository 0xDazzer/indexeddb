import { addListener, Cleanup, shouldListenError } from './listeners';


export type OnOptions = {
    signal?: AbortSignal;
    errorEvent?: string; // default: 'error'; set to '' to disable
    highWaterMark?: number; // max buffered events, default 1024
  };
  
  type Pending<T> = {
    resolve: (value: IteratorResult<T>) => void;
    reject: (reason: unknown) => void;
  };
  
  export function on<T extends Event = Event>(
    target: EventTarget,
    type: string,
    options: OnOptions = {},
  ): AsyncIterableIterator<T> {
    const { signal, errorEvent = 'error', highWaterMark = 1024 } = options;
  
    // Fail fast
    if (signal?.aborted) {
      const reason = signal.reason;
      const iterator: AsyncIterableIterator<T> = {
        [Symbol.asyncIterator]() { return this; },
        next() { return Promise.reject(reason); },
        return() { return Promise.resolve({ done: true, value: undefined as any }); },
        throw(err) { return Promise.reject(err); },
      };
      return iterator;
    }
  
    const queue: T[] = [];
    let done = false;
    let error: unknown = null;
  
    let pending: Pending<T> | null = null;
  
    const cleanups: Cleanup[] = [];
    const cleanupAll = () => { for (const c of cleanups.splice(0)) c(); };
  
    const finishWithError = (err: unknown) => {
      if (done) return;
      done = true;
      error = err;
      cleanupAll();
      if (pending) {
        pending.reject(err);
        pending = null;
      }
    };
  
    const finishGracefully = () => {
      if (done) return;
      done = true;
      cleanupAll();
      if (pending) {
        pending.resolve({ done: true, value: undefined });
        pending = null;
      }
    };
  
    const push = (event: T) => {
      if (done) return;
  
      // If someone is waiting in next(), deliver immediately
      if (pending) {
        pending.resolve({ done: false, value: event });
        pending = null;
        return;
      }
  
      // Otherwise buffer
      queue.push(event);
  
      // Simple backpressure: cap buffer
      if (queue.length > highWaterMark) {
        // Drop oldest (or you can throw). Dropping oldest is usually safer for UI events.
        queue.shift();
      }
    };
  
    const onEvent: EventListener = (e) => push(e as T);
  
    const onError: EventListener = (e) => finishWithError(e);
  
    const onAbort: EventListener = () => finishWithError(signal!.reason);
  
    cleanups.push(addListener(target, type, onEvent));

    if (shouldListenError(errorEvent, type)) {
      cleanups.push(addListener(target, errorEvent, onError));
    }
    
    if (signal) cleanups.push(addListener(signal, 'abort', onAbort, { once: true }));
  
    const iterator: AsyncIterableIterator<T> = {
      [Symbol.asyncIterator]() { return this; },
  
      async next(): Promise<IteratorResult<T>> {
        if (error) return Promise.reject(error);
        if (queue.length) return { done: false, value: queue.shift()! };
        if (done) return { done: true, value: undefined };
  
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          pending = { resolve, reject };
        });
      },
  
      async return(): Promise<IteratorResult<T>> {
        finishGracefully();
        return { done: true, value: undefined };
      },
  
      async throw(err?: unknown): Promise<IteratorResult<T>> {
        finishWithError(err);
        return Promise.reject(err);
      },
    };
  
    return iterator;
  }