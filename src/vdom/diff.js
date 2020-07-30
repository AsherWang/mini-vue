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
  // const set = new Set(oldArr.map(i => i.key));
  // const hasKey = set.size === oldArr.length;
  const hasKey = false; // 暂且不考虑有key的情况，这里作为优化点
  if (hasKey) { // 有key且唯一
    // REORDER
  } else {
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
  return patchs;
}


// 虚拟dom的diff算法
// 预期返回新旧tree之间的差别
// 平层diff
// 对oldTree的节点标记, root为0, 其孩子节点依次为1,2,3,4
export function diff(oldTree, newTree) {
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
export function applyDiff(oldTree, patchs) {
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
      });
      // console.log('after apply', oldTree);
    }
  }
}