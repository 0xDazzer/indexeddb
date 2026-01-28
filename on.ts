import { once } from "./once";

function on<T>(eventTarget: EventTarget, eventName: string): AsyncIterator<T>{
  return {
    async next(): Promise<IteratorResult<T>> {
        const onceEvent = once<T>(eventTarget, eventName);
        return onceEvent.then((event) => ({
            value: event,
            done: false,
        }));
    },
    [Symbol.asyncIterator](): AsyncIterator<T> {
        return this;
    }
  }
}

export { on };

