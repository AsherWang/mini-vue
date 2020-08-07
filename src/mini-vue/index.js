import { observe, Watcher } from "../observer/index";
import walk from "../observer/walk";
import { diff, applyDiff } from "../vdom/index";
import compileTemplate from "../template/index";

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
  let data = options.data || {};
  data = typeof options.data === "function" ? options.data.call(vm) : data;
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
        console.warn("cannot set computed value with", nv);
      },
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
      key.split(".").forEach((k) => (val = val[k]));
      return val;
    };
    new Watcher(vm, getter, (...args) => method.apply(vm, args));
  });

  // 简单处理el
  if (options.el) {
    if (typeof options.el === "string") {
      vm.$el = document.querySelector(options.el);
    } else {
      vm.$el = options.el;
    }
  }

  // 解析模板
  const elTree = compileTemplate(options.template || "");
  console.log('elTree', elTree);
  // 化为render函数
  vm.$render = () => {
    return elTree.render(vm);
  };

  // 处理render
  // 触发重绘的方式有： props改变， data改变，computed改变，
  // vm.$render = options.render || null;
  vm.render = () => {
    if (!vm.$render) return null;
    vm.$vdom = vm.$render.call(vm);
    // console.log('vm.$vdom',vm.$vdom);
    if (vm.$preVdom) {
      const result = diff(vm.$preVdom, this.$vdom);
      // console.log('diff result', result);
      applyDiff(vm.$preVdom, result);
    } else {
      vm.$el.firstElementChild && vm.$el.firstElementChild.remove();
      vm.$el.appendChild(vm.$vdom.render())

      // vm.$el.replaceWith(vm.$vdom.render());
      vm.$preVdom = vm.$vdom;
    }
  };

  vm.render(); // 渲染

  // 重绘触发
  vm.renderWatcher = new Watcher(
    vm,
    function walkUpsidedown() {
      walk(data);
      walk(computedData);
    },
    vm.render
  );
}

export default MiniVue;
