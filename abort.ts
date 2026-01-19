export function getAbortReason(signal?: AbortSignal) {
  if (!signal) {
    const error = new Error('The operation was aborted');
    (error as { name: string }).name = 'AbortError';
    return error;
  }
  if (signal.reason !== undefined) {
    return signal.reason;
  }
  const error = new Error('The operation was aborted');
  (error as { name: string }).name = 'AbortError';
  return error;
}
