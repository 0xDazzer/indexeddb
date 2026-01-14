interface IOptions {
  signal?: AbortSignal;
}

function once<T extends Event>(
  eventTarget: EventTarget,
  eventName: string,
  options: IOptions
): Promise<T> {
  const { signal } = options;

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

function on<T extends Event>(
  eventTarget: EventTarget,
  eventName: string,
  options: IOptions
): AsyncIterable<T | Error> {
  const asyncIterator = async function* () {
    const { signal } = options;

    while (!signal?.aborted) {
      try {
        const event = await once<T>(eventTarget, eventName, { signal });
        yield event;
      } catch (error) {
        yield error as Error;
      }
    }
  };

  return asyncIterator();
}

async function adaptRequest<T>(request: IDBRequest): Promise<T> {
  const controller = new AbortController();

  try {
    const result = await Promise.race([
      once<Event>(request, "success", { signal: controller.signal }),
      once<Event>(request, "error", { signal: controller.signal }),
    ]);

    if (result.type === "success") return request.result as T;
    else throw request.error;
  } finally {
    controller.abort();
  }
}

export { once, on, adaptRequest };
