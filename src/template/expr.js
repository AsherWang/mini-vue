// 对目前只支持单变量表达式

export function calcExpr(vm, expr, scope = {}) {
  if (scope[expr] !== undefined) {
    return scope[expr];
  }
  return vm[expr];
}

// 比如在@click="add(name)"
// 处理add(name)的解析和喂参数，目前只考虑有add
export function calcCallbackExpr(vm, expr) {
  return vm[expr];
}

// 解析诸如name:{{name}}
export function calcTextContent(vm, content, scope = {}) {
  let ret = content;
  let exprs = content.match(/{{\w+}}/g); // 目前先认为表达式只是一个变量名字而已
  exprs = [...new Set(exprs)];
  exprs.forEach((expr) => {
    const rExpr = expr.substr(2, expr.length - 4);
    const val = calcExpr(vm, rExpr, scope);
    ret = ret.replace(new RegExp(expr.replace(/\{/, '\\{'), 'g'), val);
  });
  return ret;
}

// 解析v-for
// <div v-for="item in items"></div>
// <div v-for="(item, index) in items"></div>
// <div v-for="(val, key) in object"></div>
// <div v-for="(val, name, index) in object"></div>
export function calcVForExpr(vm, expr, scope = {}) {
  const trimedExpr = expr.trim();
  const inIdx = trimedExpr.indexOf(' in ');
  const fStr = trimedExpr.substring(0, inIdx).trim();
  let keys = [];
  if (fStr.startsWith('(')) {
    keys = fStr
      .substr(1, fStr.length - 2)
      .split(',')
      .map((i) => i.trim());
  } else {
    keys.push(fStr);
  }
  const valExpr = trimedExpr.substring(inIdx + 4);
  let listData = calcExpr(vm, valExpr, scope) || [];
  let isObj = false;
  if (typeof listData === 'number') {
    listData = Array(listData)
      .fill(' ')
      .map((_, idx) => idx);
  } else if (typeof listData === 'string') {
    listData = Array(listData.length)
      .fill(' ')
      .map((_, idx) => listData[idx]);
  }
  if (Array.isArray(listData)) {
    listData = listData.map((item, index) => ({ item, index, key: index }));
  } else if (typeof listData === 'object') {
    listData = Object.keys(listData).map((key, index) => ({
      item: listData[key],
      index,
      key,
    }));
    isObj = true;
  }
  return listData.map(({ item, index, key }) => {
    const ret = { ...scope };
    keys.forEach((keyName, idx) => {
      switch (idx) {
        case 0:
          ret[keyName] = item;
          break;
        case 1:
          ret[keyName] = isObj ? key : index;
          break;
        case 2:
          if (isObj) {
            ret[keyName] = index;
          }
          break;
        default:
          break;
      }
    });
    return ret;
  });
}
