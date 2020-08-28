import { observe, Watcher } from '../observer/index';
import walk from '../observer/walk';
import { diff, applyDiff } from '../vdom/index';
import compileTemplate from '../template/index';
import component from './component';

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
        // eslint-disable-next-line no-param-reassign
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

  vm.$options = options;

  // 简单处理el
  if (options.el) {
    if (typeof options.el === 'string') {
      // eslint-disable-next-line no-undef
      vm.$el = document.querySelector(options.el);
    } else {
      vm.$el = options.el;
    }
  }
  vm.isRoot = !!options.el;

  vm.component = vm.isRoot ? MiniVue.component : component.create(MiniVue, MiniVue.component);
  // 简单处理components
  const components = options.components || {};
  Object.keys(components).forEach((id) => vm.component(id, components[id]));

  // 简单处理prop, 数据解析和绑定放到template的render中
  // 像处理computed一样处理props，只不过上下文是parentVm
  if (options.$parentVm) {
    vm.$parentVm = options.$parentVm;
    let tmpProps = options.props || {};
    if (Array.isArray(tmpProps)) {
      const tmp = {};
      tmpProps.forEach((name) => { tmp[name] = {}; });
      tmpProps = tmp;
    }
    const props = {};
    Object.keys(tmpProps).forEach((key) => {
      const getter = () => options.$attrs[key];
      const watcher = new Watcher(vm, getter);
      defineProperty(props, key, {
        get: function Kgetter() {
          return watcher.value;
        },
        set: function Ksetter(nv) {
          console.warn('cannot set prop value with', nv);
        },
      });
    });
    assignProperties(props, vm);
  }

  // assignProperties(props, vm);

  // 简单处理data
  let data = options.data || {};
  data = typeof options.data === 'function' ? options.data.call(vm) : data;
  observe(data);
  vm.$data = data;
  assignProperties(data, vm);

  // 简单处理computed
  const computed = options.computed || {};
  const computedData = {};
  Object.keys(computed).forEach((key) => {
    const getter = computed[key];
    const watcher = new Watcher(vm, getter);
    defineProperty(computedData, key, {
      get: function Kgetter() {
        return watcher.value;
      },
      set: function Ksetter(nv) {
        console.warn('cannot set computed value with', nv);
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
  vm.$watchers = [];
  Object.keys(watch).forEach((key) => {
    const method = watch[key];
    const getter = () => {
      let val = vm;
      key.split('.').forEach((k) => { val = val[k]; });
      return val;
    };
    const watcher = new Watcher(vm, getter, (...args) => method.apply(vm, args));
    vm.$watchers.push(watcher);
  });

  // 解析模板
  vm.$elTree = compileTemplate(options.template || '');
  vm.$elTree.isComponent = !!vm.$parentVm;
  // 化为render函数
  vm.$render = () => vm.$elTree.render(vm);

  // 处理render
  // 触发重绘的方式有： props改变， data改变，computed改变，
  // vm.$render = options.render || null;
  vm.render = () => {
    if (!vm.$render) return;
    vm.$vdom = vm.$render.call(vm);
    // console.log('vm.$vdom',vm.$vdom);
    if (vm.$preVdom) {
      const result = diff(vm.$preVdom, vm.$vdom);
      applyDiff(result);
    } else {
      if (vm.isRoot) {
        if (vm.$el.firstElementChild) vm.$el.firstElementChild.remove();
        vm.$el.appendChild(vm.$vdom.render());
      } else {
        // vm.$el.replaceWith(vm.$vdom.render()); // 这里就是自定义组件了
      }
      // vm.$el.replaceWith(vm.$vdom.render());
      vm.$preVdom = vm.$vdom;
    }
  };

  // 根节点的第一次渲染
  // if (vm.$el) {
  // 重绘触发
  vm.renderWatcher = new Watcher(
    vm,
    (() => {
      walk(data);
      walk(computedData);
    }),
    vm.render,
  );
  vm.render(); // 渲染
}
// }

// 组件
MiniVue.component = component.create(MiniVue);

export default MiniVue;
