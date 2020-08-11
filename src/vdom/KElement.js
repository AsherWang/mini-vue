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
export const KElement = new Proxy(_Element, {
  apply(target, thisArg, argumentsList) {
    // eslint-disable-next-line
    return new target(...argumentsList);
  },
});
