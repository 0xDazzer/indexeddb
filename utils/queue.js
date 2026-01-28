class Queue {
  #array = [];
  constructor(defaultValue = []) {
    this.#array = defaultValue;
  }
  enqueue(item) {
    this.#array.push(item);
  }
  dequeue() {
    return this.#array.shift();
  }
  clear() {
    this.#array = [];
  }
  get size() {
    return this.#array.length;
  }
  [Symbol.iterator]() {
    return {
      next: () => this.size === 0
        ? { value: undefined, done: true }
        : { value: this.dequeue(), done: false }
    };
  }
}

export { Queue };