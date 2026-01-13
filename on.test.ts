import { on } from "./on";

const eventTarget = new EventTarget();

const asyncIterator = on<CustomEvent>(eventTarget, 'my-event');
const myEvent = new CustomEvent('my-event', { detail: 'Hello, AsyncIterator!' });

(async () => {
  for await (const value of asyncIterator) {
    console.log(value)
  }
})()

eventTarget.dispatchEvent(myEvent);
eventTarget.dispatchEvent(myEvent);