import { calcExpr } from "./expr";

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

// 剩下的属性直接放到dom节点属性上
function other(attrs, name, val) {
  attrs[name] = val;
  return true;
}

directives.push(vBind);
directives.push(other);

export default directives;
