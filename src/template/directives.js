import { calcExpr, calcCallbackExpr } from "./expr";

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

export default directives;
