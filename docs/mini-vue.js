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
    if(Array.isArray(obj)){
      obj.forEach(v => doWalk(v));
    }else {
      Object.values(obj).forEach(v => doWalk(v));
    }
  }

  // 为了拿到真的对象
  // _NodeGetter保存一个对象obj和一个对象的key
  // 通过_NodeGetter修改obj[key]的时候可以直接修改原来obj对象的属性
  // e.g.
  // arr = [1,2];
  // ng = _NodeGetter([1,2],0);
  // ng.value = 2;
  // 则有arr => [2,2]
  class _NodeGetter {
    constructor(source, info) {
      this.source = source;
      this.info = info;
    }

    get value() {
      if (this.info !== undefined) {
        return this.source[this.info];
      }
      return this.source;
    }

    set value(newVlaue) {
      if (this.info !== undefined) {
        this.source[this.info] = newVlaue;
      } else {
        this.source = newVlaue;
      }
    }
  }

  // NodeGetter()和new NodeGetter()效果一样
  // eslint-disable-next-line no-unused-vars
  const NodeGetter = new Proxy(_NodeGetter, {
    apply(target, thisArg, argumentsList) {
      // eslint-disable-next-line
      return new target(...argumentsList);
    },
  });

  // 预期返回两个节点的变化了的属性
  // 如果属性相同，那么返回null
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
  function applyProps(node, props) {
    if (typeof node === 'string' || node.isText) {
      // eslint-disable-next-line
      console.warn('no way here: set props for a textnode');
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
  // 问题，怎么确定两个节点是同一个节点呢，仅仅靠tagname? 目前的做法是这样
  // 如果有key且唯一,考虑reorder,remove
  // 否则考虑粗暴按序处理
  function diffArr(oldArr, newArr, num = 0, patchs = {}) {
    if (oldArr.length === 0) {
      return patchs;
    }
    // console.log(num, oldArr,newArr);
    {
      // 准备处理下一层
      let newOldArr = [];
      let newNewArr = [];
      const length = Math.max(oldArr.length, newArr.length);
      // 处理当前层
      for (let index = 0; index < length; index += 1) {
        const oldItem = oldArr[index];
        const newItem = newArr[index];
        if (oldItem && newItem) {
          const eleKey = num + index + 1;
          newOldArr = newOldArr.concat(oldItem.children || []);
          newNewArr = newNewArr.concat(newItem.children || []);
          if (oldItem.isText) {
            if (newItem.isText) {
              if (oldItem.text !== newItem.text) {
                // eslint-disable-next-line
                patchs[eleKey] = { // TEXT
                  type: 'TEXT',
                  text: newItem.text,
                };
              }
            } else {
              // eslint-disable-next-line
              patchs[eleKey] = { // 替换节点
                type: 'REPLACE',
                node: newItem,
              };
            }
          } else if (newItem.tagName !== oldItem.tagName) {
            // console.log('replace',oldItem,newItem)
            // eslint-disable-next-line
            patchs[eleKey] = { // 替换节点
              type: 'REPLACE',
              node: newItem,
            };
          } else {
            // 如果是同一个子节点
            const propsPatchs = diffProps(oldItem, newItem);
            // console.log('propsPatchs',propsPatchs)
            if (propsPatchs) {
              // eslint-disable-next-line
              patchs[eleKey] = {
                type: 'PROPS',
                props: propsPatchs,
              };
            }
          }
        } else if (oldItem) {
          const eleKey = num + newArr.length + 1;
          // console.log('remove node', eleKey, oldItem);
          if (patchs[eleKey]) {
            // console.log('patchs[eleKey]',patchs[eleKey]);
            patchs[eleKey].moves.push({ index, type: 0, node: oldItem });
          } else {
          // eslint-disable-next-line
          patchs[eleKey] = { // 删掉当前节点
              type: 'REORDER',
              moves: [
                { index, type: 0, node: oldItem }, // type 0 remove
              ],
            };
          }
        } else {
          const eleKey = num + oldArr.length;
          if (patchs[eleKey]) {
            // 哎当时没想到两种patch类型并存的情况，属于设计错误，这会简单修改下吧。。虽然不太优雅
            if(patchs[eleKey].type !== 'REORDER'){
              patchs[eleKey].appendType = 'REORDER';
              patchs[eleKey].moves = patchs[eleKey].moves || [];
            }
            patchs[eleKey].moves.push({ index, type: 1, node: newItem });
          } else {
            // eslint-disable-next-line
            patchs[eleKey] = { // 删掉当前节点
              type: 'REORDER',
              moves: [
                { index, type: 1, node: newItem }, // type 1 add
              ],
            };
          }
        }
      }
      
      return diffArr(newOldArr, newNewArr, num + oldArr.length, patchs);
    }
  }


  // 虚拟dom的diff算法
  // 预期返回新旧tree之间的差别
  // 平层diff
  // 对oldTree的节点标记, root为0, 其孩子节点依次为1,2,3,4
  function diff(oldTree, newTree) {
    return diffArr([oldTree], [newTree], -1);
  }

  // 为虚拟DOM构建索引
  // 为了简单先放到oldTree对象上
  function buildIndex(oldTree, num = 0) {
    // 非递归广搜
    const indexs = [];
    // 根节点入栈
    indexs.push(NodeGetter(oldTree));
    for (let idx = 0; idx < indexs.length; idx += 1) {
      const currentNode = indexs[idx].value;
      if (typeof currentNode !== 'string'
        && currentNode.children && currentNode.children.length > 0) {
        // not textnode and has children
        currentNode.children.forEach((child, index) => {
          const id = index;
          indexs.push(NodeGetter(currentNode.children, id));
        });
      }
    }
    // eslint-disable-next-line
    oldTree.indexs = indexs;
  }

  // 对虚拟dom应用diff结果
  // 是不是需要对oldTree建立索引或者在使用Element构建的时候就建立索引
  function applyDiff(oldTree, patchs) {
    if (patchs) {
      const keys = Object.keys(patchs);
      if (keys.length > 0) {
        buildIndex(oldTree);
        // console.log('oldTree', oldTree);
        keys.forEach((key) => {
          // key其实就是索引
          const patch = patchs[key];
          if (patch.type === 'REPLACE') {
            const oldEl = oldTree.indexs[key].value.$el;
            if (oldEl) {
              oldEl.parentNode.replaceChild(patch.node.render(), oldEl);
            }
            // eslint-disable-next-line
            oldTree.indexs[key].value = patch.node;
          } else if (patch.type === 'PROPS') {
            applyProps(oldTree.indexs[key].value, patch.props);
          } else if (patch.type === 'TEXT') {
            const oldNode = oldTree.indexs[key].value;
            const oldEl = oldNode.$el;
            if (oldEl) {
              oldNode.text = patch.text;
              oldEl.nodeValue = patch.text;
            }
          } else if (patch.type === 'REORDER') {
            // TO PERF
            // 这里写的有点奇怪，像是在强行使用REORDER
            // 先删除
            patch.moves
              .filter(a => a.type === 0)
              .sort((a, b) => (a.index < b.index ? 1 : -1))
              .forEach((move) => {
                // console.log('remove index', move.index);
                const { source } = oldTree.indexs[key];
                if (move.node && move.node.$el && move.node.$el.parentNode) {
                  move.node.$el.parentNode.removeChild(move.node.$el);
                }
                source.splice(source.findIndex(a => a === move.node), 1);
              });
            // 补充
            patch.moves
              .filter(a => a.type === 1)
              .sort((a, b) => (a.index > b.index ? 1 : -1))
              .forEach((move) => {
                // console.log('append index', move.index);
                const { source, value } = oldTree.indexs[key];
                if (source && source.length > 0) {
                  source[0].$el.parentNode.appendChild(move.node.render());
                }
                oldTree.indexs[key].source.push(move.node);
              });
          }
          if(patch.appendType === 'REORDER'){
            // TO PERF
            // 这里写的有点奇怪，像是在强行使用REORDER
            // 先删除
            patch.moves
              .filter(a => a.type === 0)
              .sort((a, b) => (a.index < b.index ? 1 : -1))
              .forEach((move) => {
                // console.log('remove index', move.index);
                const { source } = oldTree.indexs[key];
                if (move.node && move.node.$el && move.node.$el.parentNode) {
                  move.node.$el.parentNode.removeChild(move.node.$el);
                }
                source.splice(source.findIndex(a => a === move.node), 1);
              });
            // 补充
            patch.moves
              .filter(a => a.type === 1)
              .sort((a, b) => (a.index > b.index ? 1 : -1))
              .forEach((move) => {
                // console.log('append index', move.index);
                const { source, value } = oldTree.indexs[key];
                if (source && source.length > 0) {
                  source[0].$el.parentNode.appendChild(move.node.render());
                }
                oldTree.indexs[key].source.push(move.node);
              });
          }
        });
        // console.log('after apply', oldTree);
      }
    }
  }

  class _Element {
    constructor(tagName, props, children) {
      this.tagName = tagName; // 对应的dom节点标签
      this.props = props || {}; // 属性
      this.children = children || []; // 孩子节点
      this.key = props ? props.key : undefined; // 备用，diff使用，目前还没用到
      this.isText = false; // 是否是纯文本节点
      this.text = ''; // 如果是纯文本节点，text存入文本内容
      // init
      let count = 0;
      this.children.forEach((child, index) => {
        if (child instanceof _Element) {
          count += child.count;
        }
        // 这里先注释掉组件的实例
        // else if (child instanceof _Component) {
        //   this.children[index] = child.render();
        // }
        else {
          const textNode = new _Element();
          textNode.isText = true;
          textNode.text = child;
          this.children[index] = textNode;
        }
        count += 1;
      });
      this.count = count; // count的意思是，嗯此节点孩子节点等等总节点数
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
      if (typeof value === 'function' && name.startsWith('@')) {
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
        if(name === 'value'){
          this.$el.value= value;
        }else {
          this.$el.setAttribute(name, value);
        }
      }
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

  function calcExpr(vm, expr){
    return vm[expr];
  }

  // 比如在@click="add(name)"
  // 处理add(name)的解析和喂参数，目前只考虑有add
  function calcCallbackExpr(vm, expr){
    return vm[expr];
  }

  // 解析诸如name:{{name}}
  function calcTextContent(vm, content){
    let ret = content;
    let exprs = content.match(/{{\w+}}/g); // 目前先认为表达式只是一个变量名字而已
    exprs = [...new Set(exprs)];
    exprs.forEach(expr => {
      const rExpr =  expr.substr(2, expr.length -4);
      const val = calcExpr(vm, rExpr);
      ret = ret.replace(new RegExp(expr.replace(/\{/,'\\{'),'g'),val);
    });
    return ret;
  }

  const directives = [];

  // v-bind
  function vBind(attrs, name, val) {
    // v-bind:name,:name,v-bind
    if (name === "v-bind") {
      const obj = calcExpr(this, val);
      if (obj && typeof obj === "object") {
        Object.assign(attrs, obj);
      }
      return true;
    } else if (name.startsWith("v-bind:") || name.startsWith(":")) {
      const [, rName] = name.split(":");
      attrs[rName] = calcExpr(this, val);
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

    render(vm) {
      // 处理v-if
      if('v-if' in this.attrs){
        const val = calcExpr(vm, this.attrs['v-if']);
        if(!val){
          return null;
        }
      }

      if (this.name === "root") {
        // 取child的第一个, 就还是先不支持多个‘根’元素吧
        return this.children.length ? this.children[0].render(vm) : null;
      }
      if (this.name === "text") {
        return calcTextContent(vm, this.attrs.content);
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
          if (handler.call(vm, attrs, name, val)) {
            break;
          }
        }
      });
      return KElement(
        this.name,
        attrs,
        this.children.map((i) => i.render(vm)).filter(i => i),
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

    // 简单处理el
    if (options.el) {
      if (typeof options.el === "string") {
        vm.$el = document.querySelector(options.el);
      } else {
        vm.$el = options.el;
      }
    }

    // 解析模板
    const elTree = compile(options.template || "");
    // console.log('elTree', elTree);
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
        // console.log(vm.$preVdom,vm.$vdom)
        const result = diff(vm.$preVdom, this.$vdom);
        // console.log('diff result', result);
        applyDiff(vm.$preVdom, result);
      } else {
        vm.$el.firstElementChild && vm.$el.firstElementChild.remove();
        vm.$el.appendChild(vm.$vdom.render());

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

  return MiniVue;

})));
