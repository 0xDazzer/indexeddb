const createMethodDescriptor = (value) => ({
  value,
  writable: false,
  enumerable: true,
  configurable: false,
});

const createPropertyDescriptor = (getter) => ({
  get: getter,
  enumerable: true,
  configurable: false,
});

const createWrapper = (adaptee, schema = {}) => {
  const propertyDescriptors = {};
  const methodDescriptors = {};
  for (const prop in adaptee) {
    const adapter = schema[prop];
    if (typeof adaptee[prop] === 'function') {
      methodDescriptors[prop] = adapter
        ? createMethodDescriptor((...args) => adapter(adaptee[prop](...args)))
        : createMethodDescriptor(adaptee[prop].bind(adaptee));
    } else {
      propertyDescriptors[prop] = adapter
        ? createPropertyDescriptor(() => adapter(adaptee[prop]))
        : createPropertyDescriptor(() => adaptee[prop]);
    }
  }
  const Wrapper = class {
    constructor() {
      Object.defineProperties(this, propertyDescriptors);
    }
  };
  Object.defineProperties(Wrapper.prototype, methodDescriptors);
  Object.defineProperty(Wrapper, 'name', {
    value: `${adaptee.constructor.name}Wrapper`,
    writable: false,
    enumerable: false,
    configurable: false
  });
  return Wrapper;
}

const createAdapter = (schema = {}) => {
  let Wrapper = null;
  return (adaptee) => {
    if (!Wrapper) {
      Wrapper = createWrapper(adaptee, schema);
    }
    return new Wrapper(adaptee);
  }
};

export { createAdapter };