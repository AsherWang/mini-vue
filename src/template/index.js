class TplTag {
  constructor(name, attrs = {}, isRoot = false) {
    this.isRoot = isRoot;
    this.name = name; // tagname
    this.attrs = attrs; // 可能会分几类
    this.children = [];
    this.close = false; // 闭合了么
  }
  addAttr(key, value){
    // 重复就覆盖
    // 或者这里警告一下
    this.attrs[key] = value;
  }
}

function doCompile(templateStr) {
  const elStack = [];
  // 根元素入栈
  const root = new TplTag("root", {}, true);
  elStack.push(root);

  if (!templateStr) return root.children;
  const str = templateStr.trim();
  let idx = 0;
  let state = 0; // 准备收新tag
  let stackTop = root;
  // state: 0 准备新收child
  // state: 1 准备接收tag attr 或者接收自闭标签
  while (1) {
    if (state === 0) {
      if (str[idx] === "<") {
        // tag start
        const [tagname, nextIdx] = getTillNextCh(idx + 1, str, " ");
        const newTag = new TplTag(tagname);
        stackTop.children.push(newTag);
        idx = nextIdx + 1;
        state = 1;
      } else {
        // text start
        const [newText, nextIdx] = getTillNextCh(idx, str, "<");
        stackTop.children.push(
          new TplTag("text", { content: newText })
        ); // 免压栈
        idx = nextIdx;
      }
    } else if(state === 1){
      if(str[idx] === ' '){
        idx += 1
      }else if(str[idx] === '/' && str[idx+1] === '>'){
        // 自闭出栈
        idx = idx+2;
        elStack.pop();
        stackTop = elStack[elStack.length-1];
      } else {
        // 添加属性
        // 吃掉属性name='value'
        
      }
    }
  }
  return root.children;
}

// 从index开始, 获取
// 返回[subS, lastIndex]其中lastIndex是当前光标的位置,即目标ch的位置
function getTillNextCh(index, str, ch = "") {
  if (ch === "") {
    return [str.substring(index), str.length];
  }
  const nextIndex = str.indexOf(ch, index);
  return nextIndex === -1
    ? [str.substring(index), str.length]
    : [str.substr(index, nextIndex - index), nextIndex];
}

/** 解析template
吃进去<tagname ...attrs> 解析出来tagname attrs, 放到栈顶元素的children中，然后把它压栈
吃进去一般内容，当成text放到栈顶元素的children中, 不压栈
吃进去</tagname> 比对当前栈顶元素名(或者不), 直接出栈
*/
export default function compile(str) {
  try {
    return doCompile(str);
  } catch (error) {
    console.log("err when compile template", error);
    return [];
  }
}
