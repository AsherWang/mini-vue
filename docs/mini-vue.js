(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.MiniVue = factory());
}(this, (function () { 'use strict';

  // 问为何watcher要用栈来存，难道因为其中一个收集依赖到一半之后会触发另一个依赖收集？
  const watcherStacks = [];
  function getTopWatcher() {
    return watcherStacks.length ? watcherStacks[watcherStacks.length - 1] : null;
  }

  class Dep {  // 依赖的单元
    constructor() {
      this.subs = []; // 收集了本依赖的watcher列表
    }
    notify() {  // 通知更新 , this.subs.slice()的意图是?
      this.subs.forEach(sub => sub.update());
    }
    depend() {  // 配合依赖收集
      const watcher = getTopWatcher();
      if (watcher && !watcher.deps.includes(this)) {
        watcher.deps.push(this);
        this.subs.push(watcher);
      }
    }
  }

  class Watcher {  // 用以收集依赖,被vm使用
    constructor(vm, getter, cb) {
      this.vm = vm;
      this.deps = []; // 你在看别人
      this.dep = new Dep(); // 别人也在看你
      this.getter = getter;
      this.__value = null;
      this.dirty = true;
      this.cb = cb; // 值有变化之后需要执行的回调函数
      this.cb && this.getVal(); // 有回调函数的，先收集一波依赖
    }
    get value() {
      this.dep.depend();
      this.dirty && this.getVal();
      return this.__value;
    }
    getVal() {  // 收集依赖,触发getter
      watcherStacks.push(this);
      this.__value = this.getter.call(this.vm);
      watcherStacks.pop();
      this.dirty = false;
    }
    update() { // 触发getter收集依赖
      if(this.cb){
        const preVal = this.value;
        this.getVal();
        this.cb.call(this.vm, this.__value, preVal);
      } else {
        this.dirty = true;
      }
      this.dep.notify();
    }
  }

  function plantDep(obj, key, ctx) { // 种下依赖, vue中的defineReactive
    const dep = new Dep();
    const propDescriptor = Object.getOwnPropertyDescriptor(obj, key);
    let valGetter = propDescriptor.get || (() => obj[key]);
    let val = valGetter.call(ctx);
    let valSetter = propDescriptor.set || ((nv) => val = nv);
    Object.defineProperty(obj, key, {
      get() {
        dep.depend();
        return val;
      },
      set(nv) {
        if(nv === val){
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

  class Observer { // 监察者, 给value种依赖
    constructor(value) {
      this.value = value;
      Object.defineProperty(value, "__ob__", { value: this });
      Array.isArray(value) ? this.observeArray(value) :this.observeObj(value); 
    }
    observeObj(value) {
      Object.keys(value).forEach((key) => {
        const val = value[key];
        observe(val); // 递归种依赖
        const dep = plantDep(value, key);
        if(Array.isArray(val)){ // 对数组操作的监听
          ['push', 'pop', 'splice', 'shift'].forEach(method => {
            val[method] = function patchMethod(...args){
              const ret = Array.prototype[method].apply(val, args);
              dep.notify();
              return ret;
            };
          });
        }
      });
    }
    observeArray(value) {
      value.forEach(val => observe(val));
    }
  }

  function observe(value) {
    if (!value || typeof value !== "object") return; // 空值,非obj不监察
    if (Object.prototype.hasOwnProperty.call(value, "__ob__"))
      return value.__ob__; // 已有监察者
    return new Observer(value);
  }

  const touchedObjs = [];

  function walk(obj){
    doWalk(obj);
    touchedObjs.length = 0;
  }

  function doWalk(obj){
    if(!obj || (!Array.isArray(obj) && typeof obj !== 'object') || touchedObjs.includes(obj)){
      return;
    }
    touchedObjs.push(obj);
    if(Array.isArray(obj)){
      obj.forEach(v => doWalk(v));
    }else {
      Object.values(obj).forEach(v => doWalk(v));
    }
  }

  // 预期返回两个节点的变化了的属性
  function diffProps(oldNode, newNode) {
    const oldProps = oldNode.props;
    const newProps = newNode.props;

    const propsPatchs = {};
    let isSame = true;

    // 遍历旧的，找到修改了的
    // 删掉的也属于修改了的
    Object.keys(oldProps).forEach((key) => {
      if (newProps[key] !== oldProps[key]) {
        isSame = false;
        propsPatchs[key] = [oldProps[key], newProps[key]];
      }
    });

    // 遍历新的，找到新的属性
    Object.keys(newProps).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(oldProps, key)) {
        isSame = false;
        propsPatchs[key] = [null, newProps[key]];
      }
    });

    return isSame ? null : propsPatchs;
  }

  // 对节点应用变化的属性
  // TODO: 注意事件的绑定问题
  function applyProps(patch) {
    const node = patch.node;
    const props = patch.props;
    if (typeof node === "string" || node.isText) {
      // eslint-disable-next-line
      console.warn("no way here: set props for a textnode");
    }
    if (props) {
      const propNames = Object.keys(props);
      if (propNames.length > 0) {
        propNames.forEach((propName) => {
          // eslint-disable-next-line
          node.props[propName] = props[propName][1];
          node.setAttr(propName, props[propName][1], props[propName][0]);
        });
      }
    }
  }

  // diff处理两组孩子节点
  function diffChildren(parentNode, oldArr, newArr, patchs = []) {
    const length = Math.max(oldArr.length, newArr.length);
    for (let index = 0; index < length; index += 1) {
      const oldItem = index < oldArr.length ? oldArr[index] : null;
      const newItem = index < newArr.length ? newArr[index] : null;
      if (oldItem && newItem) {
        diff(oldItem, newItem, patchs);
      } else if (oldItem) {
        patchs.push({
          type: "REMOVE",
          parentNode,
          node: oldItem,
        });
      } else {
        patchs.push({
          type: "ADD",
          parentNode,
          node: newItem,
        });
      }
    }
    return patchs;
  }

  // 虚拟dom的diff算法
  function diff(node, newNode, patchs = []) {
    if (node.isText && newNode.isText) {
      if (node.text !== newNode.text) {
        patchs.push({
          type: "TEXT",
          node,
          text: newNode.text,
        });
      }
    } else if (node.tagName === newNode.tagName) {
      // 如果是同一个tag名称
      const propsPatchs = diffProps(node, newNode); // diff属性
      if (propsPatchs) {
        patchs.push({
          node,
          type: "PROPS",
          props: propsPatchs,
        });
      }
      // diff 子节点
      diffChildren(node, node.children, newNode.children, patchs);
    } else {
      // 替换节点
      patchs.push({
        type: "REPLACE",
        node,
        newNode: newNode,
      });
    }
    return patchs;
  }

  // 对虚拟dom应用diff结果
  function applyDiff(patchs) {
    if (patchs && patchs.length > 0) {
      patchs.forEach((patch) => {
        const { type, node, parentNode, newNode, text } = patch;
        if (type === "REPLACE") {
          node.replaceSelf(newNode); // vdom
          node.$el.parentNode.replaceChild(newNode.render(), node.$el); // dom
        } else if (type === "PROPS") {
          applyProps(patch);
        } else if (type === "TEXT") {
          node.text = text; // vdom
          node.$el.nodeValue = text; // dom
        } else if (type === "ADD") {
          parentNode.appendChild(node); // vdom
          parentNode.$el.appendChild(node.render()); // dom
        } else if (type === "REMOVE") {
          node.removeSelf(); // vdom
          node.$el.remove(); // dom
        }
      });
    }
  }

  class _Element {
    constructor(tagName, props, children) {
      this.parentNode = null;
      this.tagName = tagName; // 对应的dom节点标签
      this.props = props || {}; // 属性
      this.children = children || []; // 孩子节点
      this.key = props ? props.key : undefined; // 备用，diff使用，目前还没用到
      this.isText = false; // 是否是纯文本节点
      this.text = ""; // 如果是纯文本节点，text存入文本内容
      this.children.forEach((child, index) => {
        if (child instanceof _Element) {
          child.parentNode = this;
        }
        // 这里先注释掉组件的实例
        // else if (child instanceof _Component) {
        //   this.children[index] = child.render();
        // }
        else {
          const textNode = new _Element();
          textNode.isText = true;
          textNode.text = child;
          textNode.parentNode = this;
          this.children[index] = textNode;
        }
      });
    }

    // 预期返回结果是一个HTML DOM节点对象
    // 如果children有内容，按顺序将child渲染并添加到父节点内部
    render() {
      if (this.isText) {
        const el = document.createTextNode(this.text);
        this.$el = el;
        return el;
      }
      const el = document.createElement(this.tagName);
      this.$el = el;
      const { props } = this;
      Object.keys(props).forEach((propName) => {
        this.setAttr(propName, props[propName]);
      });
      this.children.forEach((child) => {
        const childEl = child && child.render();
        if (childEl) {
          el.appendChild(childEl);
        }
      });
      return el;
    }

    // 设置当$el的属性
    setAttr(name, value, preValue) {
      if (typeof value === "function" && name.startsWith("@")) {
        // 绑定事件
        const evtName = name.slice(1);
        // 可能需要判断是不是原生事件之类的，这里还没有自定义组件所以只有原生事件
        // if (this.$el.parentNode) {
        //   const elClone = this.$el.cloneNode(true);
        //   this.$el.parentNode.replaceChild(elClone, this.$el);
        //   this.$el = elClone;
        // }
        if (preValue) {
          this.$el.removeEventListener(evtName, preValue);
        }
        this.$el.addEventListener(evtName, value);
      } else {
        // 应该还有其他属性需要直接赋值而不是使用setAttr
        if (name === "value") {
          this.$el.value = value;
        } else {
          if (value) {
            this.$el.setAttribute(name, value);
          } else {
            this.$el.removeAttribute(name);
          }
        }
      }
    }

    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
    }
    // remove child
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
      } else {
        console.log("_Element removeChild failed");
      }
    }

    replaceChild(child, newChild) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children[idx] = newChild;
        newChild.parentNode = this;
      } else {
        console.log("_Element replaceChild failed");
      }
    }

    removeSelf() {
      this.parentNode && this.parentNode.removeChild(this);
    }

    replaceSelf(newItem) {
      this.parentNode && this.parentNode.replaceChild(this, newItem);
    }
  }

  // 使得Element()和new Element()效果一样
  // eslint-disable-next-line no-unused-vars
  const KElement = new Proxy(_Element, {
    apply(target, thisArg, argumentsList) {
      // eslint-disable-next-line
      return new target(...argumentsList);
    },
  });

  // 对目前只支持单变量表达式

  function calcExpr(vm, expr, scope = {}) {
    if (scope[expr] !== undefined) {
      return scope[expr];
    }
    return vm[expr];
  }

  // 比如在@click="add(name)"
  // 处理add(name)的解析和喂参数，目前只考虑有add
  function calcCallbackExpr(vm, expr) {
    return vm[expr];
  }

  // 解析诸如name:{{name}}
  function calcTextContent(vm, content, scope = {}) {
    let ret = content;
    let exprs = content.match(/{{\w+}}/g); // 目前先认为表达式只是一个变量名字而已
    exprs = [...new Set(exprs)];
    exprs.forEach((expr) => {
      const rExpr = expr.substr(2, expr.length - 4);
      const val = calcExpr(vm, rExpr, scope);
      ret = ret.replace(new RegExp(expr.replace(/\{/, "\\{"), "g"), val);
    });
    return ret;
  }

  // 解析v-for
  // <div v-for="item in items"></div>
  // <div v-for="(item, index) in items"></div>
  // <div v-for="(val, key) in object"></div>
  // <div v-for="(val, name, index) in object"></div>
  function calcVForExpr(vm, expr, scope = {}) {
    const trimedExpr = expr.trim();
    const inIdx = trimedExpr.indexOf(" in ");
    const fStr = trimedExpr.substring(0, inIdx).trim();
    let keys = [];
    if (fStr.startsWith("(")) {
      keys = fStr
        .substr(1, fStr.length - 2)
        .split(",")
        .map((i) => i.trim());
    } else {
      keys.push(fStr);
    }
    const valExpr = trimedExpr.substring(inIdx + 4);
    let listData = calcExpr(vm, valExpr, scope) || [];
    let isObj = false;
    if (typeof listData === "number") {
      listData = Array(listData)
        .fill(" ")
        .map((_, idx) => idx);
    } else if (typeof listData === "string") {
      listData = Array(listData.length)
        .fill(" ")
        .map((_, idx) => listData[idx]);
    }
    if (Array.isArray(listData)) {
      listData = listData.map((item, index) => ({ item, index, key: index }));
    } else if (typeof listData === "object") {
      listData = Object.keys(listData).map((key, index) => ({
        item: listData[key],
        index,
        key,
      }));
      isObj = true;
    }
    return listData.map(({ item, index, key }) => {
      const ret = {...scope};
      keys.forEach((keyName, idx) => {
        switch(idx){
          case 0:
            ret[keyName] = item;
            return;
          case 1:
            ret[keyName] = isObj ? key : index;
            return;
          case 2:
            if(isObj){
              ret[keyName] = index;
            }  
            return;
        }
      });
      return ret;
    });
  }

  const directives = [];

  // v-bind
  function vBind(attrs, name, val, opt = {}) {
    const scope = (opt && opt.scope) || {};
    // v-bind:name,:name,v-bind
    if (name === "v-bind") {
      const obj = calcExpr(this, val, scope);
      if (obj && typeof obj === "object") {
        Object.assign(attrs, obj);
      }
      return true;
    } else if (name.startsWith("v-bind:") || name.startsWith(":")) {
      const [, rName] = name.split(":");
      attrs[rName] = calcExpr(this, val, scope);
      return true;
    }
    return false;
  }

  // 先不说修饰符的问题
  // @click="add(r)"也先不支持
  // v-on
  function vOn(attrs, name, val) {
    // v-on:name, @name
    if (name.startsWith("v-on:") || name.startsWith("@")) {
      const [, rName] = name.split(/[:@]/);
      attrs[`@${rName}`] = calcCallbackExpr(this, val);
      // console.log("evt name", rName);
      return true;
    }
    return false;
  }

  // v-show
  // 表达式依然只支持单单变量
  function vShow(attrs, name, val) {
    if (name === "v-show") {
      const show = calcExpr(this, val);
      if (!show) {
        if (attrs.style) {
          attrs.style += ';display:none;';
        } else {
          attrs.style = ';display:none;';
        }
      }
      return true;
    }
    return false;
  }

  // 剩下的属性直接放到dom节点属性上
  function other(attrs, name, val) {
    attrs[name] = val;
    return true;
  }

  directives.push(vBind);
  directives.push(vOn);
  directives.push(vShow);
  directives.push(other);

  // 不太严谨不过基本可以了
  function isDynamicAttr(name){
    return name.startsWith('v-bind:') || name.startsWith(':') || name.startsWith('v-show');
  }

  class TplTag {
    constructor(name, attrs = {}) {
      this.isRoot = false;
      this.name = name; // tagname
      this.attrs = attrs; // 可能会分几类
      this.children = [];
      // this.close = false; // 闭合了么
    }
    addAttr(key, value) {
      // 重复就覆盖
      // 或者这里警告一下
      this.attrs[key] = value;
    }

    render(vm, parentScope){
      // 最简模式 v-for
      if('v-for' in this.attrs){
        return calcVForExpr(vm, this.attrs['v-for'], parentScope).map(scope => this.doRender(vm, scope));
      }
      // 处理 v-if
      if('v-if' in this.attrs){
        const val = calcExpr(vm, this.attrs['v-if']);
        if(!val){
          return null;
        }
      }
      return this.doRender(vm, parentScope);
    }

    doRender(vm, scope = {}) {
      const createComp = vm.component(this.name);
      if(createComp){
        const vdomOfComp = createComp({});
        console.log('vdomOfComp',vdomOfComp);
        return vdomOfComp.$render()
      }

      if (this.name === "root") {
        // 取child的第一个, 就还是先不支持多个‘根’元素吧
        return this.children.length ? this.children[0].render(vm) : null;
      }
      if (this.name === "text") {
        return calcTextContent(vm, this.attrs.content, scope);
      }
      const attrs = {};
      const orderedAttrNames = Object.keys(this.attrs).filter(name => !['v-for','v-if'].includes(name)).sort((a,b) => {
        // 先静态后动态
        const as = isDynamicAttr(a) ? 0 : 1;
        const bs = isDynamicAttr(b) ? 0 : 1;
        return bs - as;
      });
      // 预期先处理静态的再附加动态的
      orderedAttrNames.forEach((name) => {
        const val = this.attrs[name];
        for (const handler of directives) {
          if (handler.call(vm, attrs, name, val, {scope})) {
            break;
          }
        }
      });

      return KElement(
        this.name,
        attrs,
        this.children.map((i) => i.render(vm, scope)).filter(i => i).flat(),
      );
    }
  }

  // 从index位置开始，包括index
  // 获取到str能匹配正则的字符串子串
  function getTillMatch(index, str, regex) {
    // console.log('str.substr(index)',str.substr(index));
    // console.log('regex',regex);
    const ret = str.substr(index).match(regex);
    return ret ? [ret[0], index + ret[0].length] : null;
  }

  // 从index开始, 获取
  // 返回[subS, lastIndex]其中lastIndex是当前光标的位置,即目标ch的位置
  function getTillNextCh(index, str, chrs = null) {
    if (chrs === null || chrs.length ===0) {
      return [str.substring(index), str.length];
    }
    let nextIndex = index;
    while(nextIndex < str.length){
      if(chrs.includes(str[nextIndex])){
        break;
      }
      nextIndex += 1;
    }
    if(nextIndex === str.length){
      nextIndex = -1;
    }
    // const nextIndex = str.indexOf(ch, index);
    return nextIndex === -1
      ? [str.substring(index), str.length]
      : [str.substr(index, nextIndex - index), nextIndex];
  }

  // 啊粗暴的自动机？
  function doCompile(templateStr) {
    const elStack = [];
    // 根元素入栈
    const root = new TplTag("root", {});
    elStack.push(root);

    if (!templateStr) return root.children;
    const str = templateStr.trim();
    let idx = 0;
    let state = 0; // 准备收新tag
    let stackTop = root;
    const tmpAttr = {
      name: "",
      value: "",
      separator: "",
      slash: 0,
    };

    // state: 0 准备新收child 或者准备接收闭合标签
    // state: 1 准备接收tag attr 或者接收自闭标签
    // state: 11 接收tag attr value
    // state: 111 开始接收tag attr value内容

    while (1) {
      if (state === 0) {
        if (str[idx] === "<" && str[idx + 1] === "/") {
          const [, nextIdx] = getTillMatch(idx + 2, str, /^[^>]+/);
          idx = nextIdx + 1;
          elStack.pop();
          stackTop = elStack[elStack.length - 1];
        } else if (str[idx] === "<") {
          // tag start
          const [tagname, nextIdx] = getTillNextCh(idx + 1, str, [" ",">"]);
          const newTag = new TplTag(tagname);
          stackTop.children.push(newTag);
          elStack.push(newTag);
          stackTop = newTag;
          if(str[nextIdx] === ' '){
            state = 1;
          }else {
            state = 0;
          }
          idx = nextIdx + 1;
        } else {
          // text start
          const [newText, nextIdx] = getTillNextCh(idx, str, ["<"]);
          stackTop.children.push(new TplTag("text", { content: newText })); // 免压栈
          idx = nextIdx;
        }
      } else if (state === 1) {
        // 接收tag attr name 或者 自闭标记 或者 标签头结束标记
        if (str[idx] === " ") {
          idx += 1;
        } else if (str[idx] === "/" && str[idx + 1] === ">") {
          // 自闭出栈
          idx += 2;
          elStack.pop();
          stackTop = elStack[elStack.length - 1];
          state = 0;
        } else if (str[idx] === ">") {
          idx += 1;
          state = 0;
        } else {
          const ret = getTillMatch(idx, str, /^[^=]+/);
          // console.log("ret", ret, idx, state);
          const [attrName, nextIdx] = ret;
          tmpAttr.name = attrName;
          idx = nextIdx + 1;
          state = 11;
        }
      } else if (state === 11) {
        if (["'", '"'].includes(str[idx])) {
          tmpAttr.separator = str[idx];
          state = 111;
          idx += 1;
        } else {
          throw new Error(`value seperator not valid in ${idx}`);
        }
      } else if (state === 111) {
        // value内容只要注意符号问题就行了，只要不是当前的tmpAttr.separator，而且没有反斜杠转义
        if (str[idx] === "\\") {
          tmpAttr.slash = 1 - tmpAttr.slash;
          idx += 1;
          tmpAttr.value += str[idx];
        } else if (str[idx] === tmpAttr.separator) {
          if (tmpAttr.slash) {
            tmpAttr.slash = 0;
            idx += 1;
            tmpAttr.value += str[idx];
          } else {
            // 完事
            stackTop.addAttr(tmpAttr.name, tmpAttr.value);
            tmpAttr.name = "";
            tmpAttr.value = "";
            tmpAttr.slash = 0;
            tmpAttr.separator = "";
            state = 1;
            idx += 1;
          }
        } else {
          tmpAttr.value += str[idx];
          idx += 1;
        }
      }
      if (idx >= str.length) {
        if (state !== 0) {
          throw new Error("not normal exit state", state);
        }
        break;
      }
    }
    return root;
  }

  /** 解析template
  吃进去<tagname ...attrs> 解析出来tagname attrs, 放到栈顶元素的children中，然后把它压栈
  吃进去一般内容，当成text放到栈顶元素的children中, 不压栈
  吃进去</tagname> 比对当前栈顶元素名(或者不), 直接出栈
  */
  function compile(str) {
    try {
      return doCompile(str);
    } catch (error) {
      console.log("err when compile template", error);
      return null;
    }
  }

  // 自定义组件
  // Vue.component( id, [definition] )

  // 大写字母变为-小写
  function normalizeName(id){
    return Array(id.length).fill('').map((_,idx) => {
      const ch = id[idx];
      const isCapital = ch.charCodeAt() >= 65 && ch.charCodeAt() <=90;
      return isCapital ? `${idx !== 0 ? '-' : ''}${ch.toLowerCase()}` : ch;
    }).join('');
  }



  function create(MiniVue, global) {
    let comps = {}; // 组件库
    return function(id, definition){
      const nId = normalizeName(id);
      if (definition) {
        comps[nId] = function createInstance(options){
          const fOpts = Object.assign({}, definition, options);
          return new MiniVue(fOpts);
        };
      } else {
        return global ? global(nId) || comps[nId] : comps[nId];
      }
    };
  }

  var component = {
    create,
    normalizeName,
  };

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
    
    // 简单处理el
    if (options.el) {
      if (typeof options.el === "string") {
        vm.$el = document.querySelector(options.el);
      } else {
        vm.$el = options.el;
      }
    }
    vm.isRoot = !!options.el;

    vm.component = vm.isRoot ? MiniVue.component : component.create(MiniVue, MiniVue.component);
    // 简单处理components
    const components = options.components || {};
    Object.keys(components).forEach(id => vm.component(id, components[id]));

    // 简单处理prop
    // TODO: 还没有引入template, 子组件等，所以目前prop实际上是只读的
    // const props = options.props || {};
    // assignProperties(props, vm);

    // 简单处理data
    let data = options.data || {};
    data = typeof options.data === "function" ? options.data.call(vm) : data;
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


    // 解析模板
    vm.$elTree = compile(options.template || "");
    // 化为render函数
    vm.$render = () => {
      return vm.$elTree.render(vm);
    };

    // 处理render
    // 触发重绘的方式有： props改变， data改变，computed改变，
    // vm.$render = options.render || null;
    vm.render = () => {
      if (!vm.$render) return null;
      vm.$vdom = vm.$render.call(vm);
      // console.log('vm.$vdom',vm.$vdom);
      if (vm.$preVdom) {
        // console.log(vm.$preVdom,vm.$vdom)
        const result = diff(vm.$preVdom, this.$vdom);
        // console.log('diff result', result);
        applyDiff(result);
      } else {
        if(vm.isRoot){
          vm.$el.firstElementChild && vm.$el.firstElementChild.remove();
          vm.$el.appendChild(vm.$vdom.render());
        }else {
          vm.$el.replaceWith(vm.$vdom.render());
        }
        // vm.$el.replaceWith(vm.$vdom.render());
        vm.$preVdom = vm.$vdom;
      }
    };

    // 重绘触发
    vm.renderWatcher = new Watcher(
      vm,
      function walkUpsidedown() {
        walk(data);
        walk(computedData);
      },
      vm.render
    );

    // 根节点的第一次渲染
    if(vm.$el){
      vm.render(); // 渲染
    }
  }

  // 组件
  MiniVue.component = component.create(MiniVue);

  return MiniVue;

})));
