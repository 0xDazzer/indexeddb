function once<T>(eventTarget: EventTarget, eventName: string): Promise<T> {
  return new Promise<T>((resolve) => {
    eventTarget.addEventListener(eventName, (event) => resolve(event as T), { once: true });
  });
}

function on<T>(eventTarget: EventTarget, eventName: string): AsyncIterableIterator<T> {
  return {
    async next(): Promise<IteratorResult<T>> {
      return { value: await once<T>(eventTarget, eventName), done: false };
    },
    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return this;
    }
  };
}