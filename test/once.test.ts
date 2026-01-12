import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from '../src/once';

describe('once', () => {
  test('resolves with the first matching event', async () => {
    const target = new EventTarget();

    const promise = once<CustomEvent<number>>(target, 'ping');

    target.dispatchEvent(new CustomEvent('ping', { detail: 123 }));

    const event = await promise;
    assert.equal(event.type, 'ping');
    assert.equal(event.detail, 123);
  });

  test('rejects on default errorEvent ("error") before success', async () => {
    const target = new EventTarget();

    const promise = once(target, 'ping'); // default errorEvent: 'error'
    const errorEvent = new Event('error');

    target.dispatchEvent(errorEvent);

    await assert.rejects(promise, (err) => err === errorEvent);
  });

  test('does not reject on "error" when errorEvent is disabled', async () => {
    const target = new EventTarget();

    const promise = once<CustomEvent<number>>(target, 'ping', { errorEvent: '' });

    target.dispatchEvent(new Event('error')); // should be ignored
    target.dispatchEvent(new CustomEvent('ping', { detail: 7 }));

    const event = await promise;
    assert.equal(event.type, 'ping');
    assert.equal(event.detail, 7);
  });

  test('rejects with abort reason (Error reason)', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const promise = once(target, 'ping', { signal: controller.signal });

    const reason = new Error('stop');
    controller.abort(reason);

    await assert.rejects(promise, (err) => err === reason);
  });

  test('rejects with abort reason (primitive reason)', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const promise = once(target, 'ping', { signal: controller.signal });

    controller.abort('canceled');

    await assert.rejects(promise, (err) => err === 'canceled');
  });

  test('if already aborted, rejects immediately with signal.reason', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    controller.abort('already');
    const promise = once(target, 'ping', { signal: controller.signal });

    await assert.rejects(promise, (err) => err === 'already');
  });

  test('race: success wins over abort when success happens first', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const promise = once<CustomEvent<number>>(target, 'ping', { signal: controller.signal });

    target.dispatchEvent(new CustomEvent('ping', { detail: 1 }));
    controller.abort('late');

    const event = await promise;
    assert.equal(event.detail, 1);
  });

  test('race: abort wins over success when abort happens first', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const promise = once(target, 'ping', { signal: controller.signal });

    controller.abort('first');
    target.dispatchEvent(new Event('ping'));

    await assert.rejects(promise, (err) => err === 'first');
  });

  test('does not listen to errorEvent when type === errorEvent', async () => {
    const target = new EventTarget();

    const promise = once<Event>(target, 'error');
    const event = new Event('error');

    target.dispatchEvent(event);

    const result = await promise;
    assert.equal(result, event);
  });


  test('success resolves even if abort happens later (timer)', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const promise = once<CustomEvent<number>>(target, 'ping', { signal: controller.signal });

    await delay(10);
    target.dispatchEvent(new CustomEvent('ping', { detail: 5 }));

    controller.abort('late');

    const event = await promise;
    assert.equal(event.detail, 5);
  });

  test('aborts via listener when aborted later (timer)', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const promise = once(target, 'ping', { signal: controller.signal });

    const reason = new Error('timeout-abort');
    await delay(10);
    controller.abort(reason);

    await assert.rejects(promise, (err) => err === reason);
  });
})