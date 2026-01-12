export const once = <TResult>(
  eventTarget: EventTarget,
  eventName: string,
): Promise<TResult> => {
  const { promise, resolve } = Promise.withResolvers<TResult>();
  const onEvent = (event: Event) => resolve(event as TResult);

  eventTarget.addEventListener(eventName, onEvent, { once: true });

  return promise;
};

export const on = <TResult>(
  eventTarget: EventTarget,
  eventName: string,
): AsyncIterator<TResult> => {
  return {
    next(): Promise<IteratorResult<TResult>> {
      return once<TResult>(eventTarget, eventName).then((event) => ({
        value: event,
        done: false,
      }));
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
};

export const adaptRequest = <T>(request: IDBRequest<T>) => {
  const { promise, resolve, reject } = Promise.withResolvers<T>();

  const onError = () =>
    reject(new Error("IndexedDB request failed", { cause: request.error }));

  const onSuccess = () => resolve(request.result);

  request.addEventListener("error", onError, { once: true });
  request.addEventListener("success", onSuccess, { once: true });

  return promise.finally(() => {
    request.removeEventListener("error", onError);
    request.removeEventListener("success", onSuccess);
  });
};
