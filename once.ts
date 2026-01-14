export const once = <TResult>(
  eventTarget: EventTarget,
  eventName: string,
): Promise<TResult> => {
  const { promise, resolve } = Promise.withResolvers<TResult>();
  const onEvent = (event: Event) => resolve(event as TResult);

  eventTarget.addEventListener(eventName, onEvent, { once: true });

  return promise;
};
