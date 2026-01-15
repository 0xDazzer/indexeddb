interface IOptions {
  signal?: AbortSignal;
}

function once<T extends Event>(
  eventTarget: EventTarget,
  eventName: string,
  options: IOptions = {}
): Promise<T> {
  const { signal } = options;

  if (signal?.aborted) Promise.reject(new Error("Operation aborted"));

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

async function* on<T extends Event>(
  eventTarget: EventTarget,
  eventName: string,
  options: IOptions = {}
) {
  while (true) {
    yield await once<T>(eventTarget, eventName, options);
  }
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
