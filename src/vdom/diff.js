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
  const { node } = patch;
  const { props } = patch;
  if (typeof node === 'string' || node.isText) {
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
      // eslint-disable-next-line no-use-before-define
      diff(oldItem, newItem, patchs);
    } else if (oldItem) {
      patchs.push({
        type: 'REMOVE',
        parentNode,
        node: oldItem,
      });
    } else {
      patchs.push({
        type: 'ADD',
        parentNode,
        node: newItem,
      });
    }
  }
  return patchs;
}

// 虚拟dom的diff算法
export function diff(node, newNode, patchs = []) {
  if (node.isText && newNode.isText) {
    if (node.text !== newNode.text) {
      patchs.push({
        type: 'TEXT',
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
        type: 'PROPS',
        props: propsPatchs,
      });
    }
    // diff 子节点
    diffChildren(node, node.children, newNode.children, patchs);
  } else {
    // 替换节点
    patchs.push({
      type: 'REPLACE',
      node,
      newNode,
    });
  }
  return patchs;
}

// 对虚拟dom应用diff结果
export function applyDiff(patchs) {
  if (patchs && patchs.length > 0) {
    patchs.forEach((patch) => {
      const {
        type, node, parentNode, newNode, text,
      } = patch;
      if (type === 'REPLACE') {
        node.replaceSelf(newNode); // vdom
        node.$el.parentNode.replaceChild(newNode.render(), node.$el); // dom
      } else if (type === 'PROPS') {
        applyProps(patch);
      } else if (type === 'TEXT') {
        node.text = text; // vdom
        node.$el.nodeValue = text; // dom
      } else if (type === 'ADD') {
        parentNode.appendChild(node); // vdom
        parentNode.$el.appendChild(node.render()); // dom
      } else if (type === 'REMOVE') {
        node.removeSelf(); // vdom
        node.$el.remove(); // dom
      }
    });
  }
}
