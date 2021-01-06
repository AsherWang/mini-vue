/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */
// 问为何watcher要用栈来存，难道因为其中一个收集依赖到一半之后会触发另一个依赖收集？
const watcherStacks = [];
function getTopWatcher() {
  return watcherStacks.length ? watcherStacks[watcherStacks.length - 1] : null;
}

class Dep {
  // 依赖的单元
  constructor() {
    this.subs = []; // 收集了本依赖的watcher列表
  }

  notify() {
    // 通知更新 , this.subs.slice()的意图是?
    this.subs.forEach((sub) => sub.update());
  }

  depend() {
    // 配合依赖收集
    const watcher = getTopWatcher();
    if (watcher && !watcher.deps.includes(this)) {
      watcher.deps.push(this);
      this.subs.push(watcher);
    }
  }
}

export class Watcher {
  // 用以收集依赖,被vm使用
  constructor(vm, getter, cb) {
    this.vm = vm;
    this.deps = []; // 你在看别人
    this.dep = new Dep(); // 别人也在看你
    this.getter = getter;
    this.__value = null;
    this.dirty = true;
    this.cb = cb; // 值有变化之后需要执行的回调函数
    if (this.cb) this.getVal(); // 有回调函数的，先收集一波依赖
  }

  get value() {
    this.dep.depend();
    if (this.dirty) this.getVal();
    return this.__value;
  }

  getVal() {
    // 收集依赖,触发getter
    watcherStacks.push(this);
    this.__value = this.getter.call(this.vm);
    watcherStacks.pop();
    this.dirty = false;
  }

  update() {
    // 触发getter收集依赖
    const preVal = this.value;
    this.getVal();
    if (this.cb) {
      this.cb.call(this.vm, this.__value, preVal);
    } else {
      this.dirty = true;
    }
    this.dep.notify();
  }
}

function plantDep(obj, key, ctx) {
  // 种下依赖, vue中的defineReactive
  const dep = new Dep();
  const propDescriptor = Object.getOwnPropertyDescriptor(obj, key);
  const valGetter = propDescriptor.get || (() => obj[key]);
  let val = valGetter.call(ctx);
  const valSetter = propDescriptor.set || ((nv) => { val = nv; });
  Object.defineProperty(obj, key, {
    get() {
      dep.depend();
      return val;
    },
    set(nv) {
      if (nv === val) {
        return;
      }
      valSetter.call(ctx || obj, nv);
      dep.notify();
    },
    configurable: true,
    enumerable: true,
  });
  return dep;
}

class Observer {
  // 监察者, 给value种依赖
  constructor(value) {
    this.value = value;
    Object.defineProperty(value, '__ob__', { value: this });
    if (Array.isArray(value)) {
      this.observeArray(value);
    } else {
      this.observeObj(value);
    }
  }

  observeObj(value) {
    Object.keys(value).forEach((key) => {
      const val = value[key];
      // eslint-disable-next-line no-use-before-define
      observe(val); // 递归种依赖
      const dep = plantDep(value, key);
      if (Array.isArray(val)) {
        // 对数组操作的监听
        ['push', 'pop', 'splice', 'shift'].forEach((method) => {
          val[method] = function patchMethod(...args) {
            const ret = Array.prototype[method].apply(val, args);
            dep.notify();
            return ret;
          };
        });
      }
    });
  }

  observeArray(value) {
    // eslint-disable-next-line no-use-before-define
    value.forEach((val) => observe(val));
  }
}

export function observe(value) {
  if (!value || typeof value !== 'object') return null; // 空值,非obj不监察
  if (Object.prototype.hasOwnProperty.call(value, '__ob__')) {
    return value.__ob__;
  } // 已有监察者
  return new Observer(value);
}
