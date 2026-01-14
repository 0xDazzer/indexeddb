import { once } from "./once";

export const on = <TResult>(
  eventTarget: EventTarget,
  eventName: string,
): AsyncIterable<TResult> => {
  const iterator = {
    next: (): Promise<IteratorResult<TResult>> =>
      once<TResult>(eventTarget, eventName).then((event) => ({
        value: event,
        done: false,
      })),
  };

  const iterable = {
    [Symbol.asyncIterator]: (): AsyncIterator<TResult> => iterator,
  };

  return iterable;
};
