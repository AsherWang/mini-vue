import { observe, Watcher } from "../observer/index";

function defineProperty(vm, key, opt) {
  Object.defineProperty(vm, key, {
    configurable: true,
    enumerable: true,
    ...opt,
  });
}

function assignProperties(src, dest) {
  Object.keys(src).forEach((key) => {
    defineProperty(dest, key, {
      set: function setter(nv) {
        src[key] = nv;
      },
      get: function getter() {
        return src[key];
      },
    });
  });
}

function MiniVue(options) {
  const vm = this;
  // 简单处理prop
  // TODO: 还没有引入template, 子组件等，所以目前prop实际上是只读的
  // const props = options.props || {};
  // assignProperties(props, vm);

  // 简单处理data
  const data = options.data ? options.data.call(vm) : {};
  observe(data);
  assignProperties(data, vm);

  // 简单处理computed
  const computed = options.computed || {};
  const computedData = {};
  Object.keys(computed).forEach((key) => {
    const getter = computed[key];
    const watcher = new Watcher(vm, getter);
    defineProperty(computedData, key, {
      get: function getter() {
        return watcher.value;
      },
      set: function setter(nv) {
        console.warn('cannot set computed value with', nv);
      }
    });
  });
  assignProperties(computedData, vm);

  // 简单处理methods
  const methods = options.methods || {};
  Object.keys(methods).forEach((key) => {
    const method = methods[key];
    vm[key] = (...args) => method.apply(vm, args);
  });

  // 简单处理watch
  // key和key.sub.sub两种形式
  const watch = options.watch || {};
  Object.keys(watch).forEach((key) => {
    const method = watch[key];
    const getter = () => {
      let val = vm;
      key.split('.').forEach(k => val = val[k]);
      return val;
    }
    new Watcher(vm, getter, (...args) => method.apply(vm, args));
  });
}

export default MiniVue;
