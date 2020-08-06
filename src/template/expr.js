
// 对目前只支持单变量表达式

export function calcExpr(vm, expr){
  return vm[expr];
}

// 解析诸如name:{{name}}
export function calcTextContent(vm, content){
  let ret = content;
  let exprs = content.match(/{{\w+}}/g);
  exprs = [...new Set(exprs)];
  exprs.forEach(expr => {
    const rExpr =  expr.substr(2, expr.length -4);
    const val = calcExpr(vm, rExpr);
    ret = ret.replace(new RegExp(expr.replace(/\{/,'\\{'),'g'),val);
  });
  return ret;
}