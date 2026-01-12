import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { on } from '../src/on'; // без .ts

describe('on', () => {
  test('yields multiple events in order', async () => {
    const target = new EventTarget();
    const iter = on<CustomEvent<number>>(target, 'ping');

    target.dispatchEvent(new CustomEvent('ping', { detail: 1 }));
    target.dispatchEvent(new CustomEvent('ping', { detail: 2 }));
    target.dispatchEvent(new CustomEvent('ping', { detail: 3 }));

    const a = await iter.next();
    const b = await iter.next();
    const c = await iter.next();

    assert.equal(a.done, false);
    assert.equal(b.done, false);
    assert.equal(c.done, false);
    assert.equal(a.value.detail, 1);
    assert.equal(b.value.detail, 2);
    assert.equal(c.value.detail, 3);
    await iter.return?.();
  });

  test('rejects on default errorEvent ("error")', async () => {
    const target = new EventTarget();
    const iter = on(target, 'ping'); // default errorEvent: 'error'

    const p = iter.next();
    const errorEvent = new Event('error');
    target.dispatchEvent(errorEvent);

    await assert.rejects(p, (err) => err === errorEvent);

    // ensure iterator remains rejected afterwards
    await assert.rejects(iter.next(), (err) => err === errorEvent);
  });

  test('does not reject on "error" when errorEvent is disabled', async () => {
    const target = new EventTarget();
    const iter = on<CustomEvent<number>>(target, 'ping', { errorEvent: '' });

    target.dispatchEvent(new Event('error')); // ignored
    target.dispatchEvent(new CustomEvent('ping', { detail: 7 }));

    const res = await iter.next();
    assert.equal(res.done, false);
    assert.equal(res.value.detail, 7);

    await iter.return?.();
  });

  test('rejects with abort reason when aborted later (timer)', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const iter = on(target, 'ping', { signal: controller.signal });

    const p = iter.next();

    const reason = new Error('stop');
    await delay(10);
    controller.abort(reason);

    await assert.rejects(p, (err) => err === reason);
  });

  test('break/return stops iteration (no further events delivered)', async () => {
    const target = new EventTarget();
    const iter = on<CustomEvent<number>>(target, 'ping');

    target.dispatchEvent(new CustomEvent('ping', { detail: 1 }));

    const first = await iter.next();
    assert.equal(first.done, false);
    assert.equal(first.value.detail, 1);

    // stop consuming
    await iter.return?.();

    // push more events after return; should not be delivered
    target.dispatchEvent(new CustomEvent('ping', { detail: 2 }));

    const after = await iter.next();
    assert.equal(after.done, true);
  });

  test('next() waits until an event arrives', async () => {
    const target = new EventTarget();
    const iter = on<CustomEvent<number>>(target, 'ping');

    const pending = iter.next();

    await delay(10);
    target.dispatchEvent(new CustomEvent('ping', { detail: 99 }));

    const res = await pending;
    assert.equal(res.done, false);
    assert.equal(res.value.detail, 99);

    await iter.return?.();
  });

  test('highWaterMark drops oldest events when buffer overflows', async () => {
    const target = new EventTarget();
    const iter = on<CustomEvent<number>>(target, 'ping', { highWaterMark: 2 });

    // Emit 3 events before consuming anything.
    // With highWaterMark=2 and "drop oldest" policy, buffer should keep [2,3].
    target.dispatchEvent(new CustomEvent('ping', { detail: 1 }));
    target.dispatchEvent(new CustomEvent('ping', { detail: 2 }));
    target.dispatchEvent(new CustomEvent('ping', { detail: 3 }));

    const a = await iter.next();
    const b = await iter.next();

    assert.equal(a.done, false);
    assert.equal(b.done, false);
    assert.equal(a.value.detail, 2);
    assert.equal(b.value.detail, 3);

    await iter.return?.();
  });
});