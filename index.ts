function once<T extends Event>(
  eventTarget: EventTarget,
  eventName: string,
  signal: AbortSignal | undefined = undefined
): Promise<T> {
  if (signal?.aborted) throw new Error("Operation aborted");

  return new Promise((resolve, reject) => {
    const removeListeners = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
      eventTarget.removeEventListener(eventName, onEvent);
    };

    const onAbort = () => {
      removeListeners();
      reject(new Error("Operation aborted"));
    };

    const onEvent = (data: Event) => {
      removeListeners();
      resolve(data as T);
    };

    if (signal) signal.addEventListener("abort", onAbort);
    eventTarget.addEventListener(eventName, onEvent);
  });
}

// function on<T>(eventTarget: EventTarget, eventName: string): AsyncIterator<T>;

export { once };
