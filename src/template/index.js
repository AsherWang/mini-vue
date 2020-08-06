import { KElement as El } from "../vdom/index";
import directives from "./directives";
import { calcTextContent } from "./expr";

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
    if (this.name === "root") {
      // 取child的第一个
      return this.children.length ? this.children[0].render(vm) : null;
    }
    if (this.name === "text") {
      return calcTextContent(vm, this.attrs.content);
    }
    const attrs = {};
    Object.keys(this.attrs).forEach((name) => {
      const val = this.attrs[name];
      for (const handler of directives) {
        if (handler.call(vm, attrs, name, val)) {
          break;
        }
      }
    });
    return El(
      this.name,
      attrs,
      this.children.map((i) => i.render(vm))
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
function getTillNextCh(index, str, ch = "") {
  if (ch === "") {
    return [str.substring(index), str.length];
  }
  const nextIndex = str.indexOf(ch, index);
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
        // console.log("close tag", tagname, idx);
      } else if (str[idx] === "<") {
        // tag start
        const [tagname, nextIdx] = getTillNextCh(idx + 1, str, " ");
        const newTag = new TplTag(tagname);
        stackTop.children.push(newTag);
        stackTop = newTag;
        idx = nextIdx + 1;
        state = 1;
      } else {
        // text start
        const [newText, nextIdx] = getTillNextCh(idx, str, "<");
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
        // console.log("close pop", idx);
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
export default function compile(str) {
  try {
    return doCompile(str);
  } catch (error) {
    console.log("err when compile template", error);
    return null;
  }
}
