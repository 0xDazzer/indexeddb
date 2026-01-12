import { once } from './src/once';
import { on } from './src/on';

/**
 * Example 1: once()
 * Wait for a single event (Promise-based)
 */
async function exampleOnce() {
  const target = new EventTarget();

  setTimeout(() => {
    target.dispatchEvent(new CustomEvent('ready', { detail: 'OK' }));
  }, 500);

  const event = await once<CustomEvent<string>>(target, 'ready');

  console.log('[once] received:', event.detail);
}

/**
 * Example 2: once() with AbortSignal
 */
async function exampleOnceWithAbort() {
  const target = new EventTarget();
  const controller = new AbortController();

  setTimeout(() => {
    controller.abort('user-cancel');
  }, 300);

  try {
    await once(target, 'ready', { signal: controller.signal });
  } catch (err) {
    console.log('[once abort] reason:', err);
  }
}

/**
 * Example 3: on()
 * Consume multiple events via async iterator
 */
async function exampleOn() {
  const target = new EventTarget();

  (async () => {
    for await (const event of on<CustomEvent<number>>(target, 'tick')) {
      console.log('[on] tick:', event.detail);

      if (event.detail === 3) break; // triggers iterator.return()
    }
    console.log('[on] stopped');
  })();

  target.dispatchEvent(new CustomEvent('tick', { detail: 1 }));
  target.dispatchEvent(new CustomEvent('tick', { detail: 2 }));
  target.dispatchEvent(new CustomEvent('tick', { detail: 3 }));
  target.dispatchEvent(new CustomEvent('tick', { detail: 4 })); // ignored
}

/**
 * Example 4: on() with abort + errorEvent
 */
async function exampleOnWithAbortAndError() {
  const target = new EventTarget();
  const controller = new AbortController();

  (async () => {
    try {
      for await (const _ of on(target, 'data', { signal: controller.signal })) {
        // consume
      }
    } catch (err) {
      console.log('[on abort/error] reason:', err);
    }
  })();

  setTimeout(() => {
    target.dispatchEvent(new Event('error')); // will reject iterator
  }, 200);
}


/**
 * WebSocket example:
 * - WebSocket is EventTarget
 * - "message" can happen multiple times => on()
 */
export async function exampleWebSocket() {
  const ws = new WebSocket('wss://echo.websocket.events');

  // wait until connected
  await once(ws, 'open');

  ws.send('hello');
  ws.send('world');

  // consume multiple messages
  let count = 0;
  try {
    for await (const ev of on<MessageEvent>(ws, 'message', { errorEvent: 'error' })) {
      console.log('[ws message]:', ev.data);
      count += 1;

      if (count >= 2) break; // stops iterator & removes listeners
    }
  } finally {
    ws.close();
    await once(ws, 'close'); // optional: wait close
  }

  console.log('[ws] closed');
}


/**
 * Run all examples
 */
async function run() {
  await exampleOnce();
  await exampleOnceWithAbort();
  await exampleOn();
  await exampleOnWithAbortAndError();
  exampleWebSocket();
}

run();
