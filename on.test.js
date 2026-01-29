const {on} = require('./on.js');
const assert = require('node:assert/strict');

const delay = ms => new Promise(ok => setTimeout(ok, ms));


const EXPECTED = [
  [1, {value: 1, done: false}],
  [2, {value: 2, done: false}],
  [3, {value: 3, done: false}],
  [4, {value: 4, done: false}],
  [6, {value: undefined, done: true}],
  [7, {value: undefined, done: true}],
  [8, {value: undefined, done: true}],
  ['error5', 'BOOM is not defined'],
  [9, {value: undefined, done: true}],
  [10, {value: undefined, done: true}],
  [11, {value: undefined, done: true}],
];

const toValue = (v) => {
  return {
    done: v.done,
    value: v.value?.detail?.id ?? v.value,
  }
}
const toError = (e) => {
  return e?.detail?.message ?? e.message;
}

async function read_faster_then_emit(asyncGen, msg) {
  const result = [];

  await Promise.all([
    asyncGen.next().then(v => result.push([1, toValue(v)])).catch(err => result.push(['error1', toError(err)])),
    asyncGen.next().then(v => result.push([2, toValue(v)])).catch(err => result.push(['error2', toError(err)])),
    asyncGen.next().then(v => result.push([3, toValue(v)])).catch(err => result.push(['error3', toError(err)])),
    asyncGen.next().then(v => result.push([4, toValue(v)])).catch(err => result.push(['error4', toError(err)])),
    asyncGen.next().then(v => result.push([5, toValue(v)])).catch(err => result.push(['error5', toError(err)])),
    asyncGen.next().then(v => result.push([6, toValue(v)])).catch(err => result.push(['error6', toError(err)])),
    asyncGen.next().then(v => result.push([7, toValue(v)])).catch(err => result.push(['error7', toError(err)])),
    asyncGen.next().then(v => result.push([8, toValue(v)])).catch(err => result.push(['error8', toError(err)])),
  ])

  await asyncGen.next().then(v => result.push([9, toValue(v)]));
  await asyncGen.next().then(v => result.push([10, toValue(v)]));
  await asyncGen.next().then(v => result.push([11, toValue(v)]));

  assert.deepEqual(result, EXPECTED, msg);

  console.log(`${msg}: Test passed`);
}


////////// Native implementation //////////

function Test_Native_Impl() {
  async function* TestGen() {
    yield 1;
    await delay(Math.random() * 100);
    yield 2;
    await delay(Math.random() * 100);
    yield 3;
    await delay(Math.random() * 100);
    yield 4;
    BOOM; //  <- Intentional error
    yield 5;
    yield 6;
    yield 7;
  }

  return read_faster_then_emit(TestGen(), 'Native async generator');
}


////////// on() implementation //////////

function Test_EventTarget_Impl() {

  const testEventTarget = new EventTarget();

  const NAME = 'valuechange';

  const gen = on(testEventTarget, NAME)[Symbol.asyncIterator]();

  async function emitEventsWithError() {
    let i = 0;
    testEventTarget.dispatchEvent(new CustomEvent(NAME, {detail: {id: ++i}}));
    await delay(Math.random() * 100);
    testEventTarget.dispatchEvent(new CustomEvent(NAME, {detail: {id: ++i}}));
    await delay(Math.random() * 100);
    testEventTarget.dispatchEvent(new CustomEvent(NAME, {detail: {id: ++i}}));
    await delay(Math.random() * 100);
    testEventTarget.dispatchEvent(new CustomEvent(NAME, {detail: {id: ++i}}));
    testEventTarget.dispatchEvent(new CustomEvent("error", {detail: new Error('BOOM is not defined')}));
  }

  return Promise.all([
    read_faster_then_emit(gen, "on() async generator"),
    emitEventsWithError(),
  ])
}


Test_Native_Impl();
Test_EventTarget_Impl()

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
