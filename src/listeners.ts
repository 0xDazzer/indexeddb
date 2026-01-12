export type Cleanup = () => void;

export function addListener(
  target: EventTarget,
  type: string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): Cleanup {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options?.capture);
}

export function shouldListenError(errorEvent: string | undefined, type: string): errorEvent is string {
  return Boolean(errorEvent) && errorEvent !== type;
}