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
