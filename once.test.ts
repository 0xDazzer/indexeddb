import { once } from "./once";

const eventTarget = new EventTarget();
console.log('Waiting for event...');

once<CustomEvent>(eventTarget, 'my-event').then((event) => {
    console.log('Event received:', event);
});

const myEvent = new CustomEvent('my-event', { detail: 'Hello, World!' });
console.log('Dispatching event...', eventTarget);
eventTarget.dispatchEvent(myEvent);
console.log('Event dispatched.', eventTarget);