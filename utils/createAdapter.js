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
        ? createMethodDescriptor(function(...args) { return adapter(this._adaptee[prop](...args)); })
        : createMethodDescriptor(function(...args) { return this._adaptee[prop](...args); });
    } else {
      propertyDescriptors[prop] = adapter
        ? createPropertyDescriptor(function() { return adapter(this._adaptee[prop]); })
        : createPropertyDescriptor(function() { return this._adaptee[prop]; });
    }
  }
  const Wrapper = class {
    _adaptee = null;
    constructor(adaptee) {
      this._adaptee = adaptee;
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
