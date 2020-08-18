// 自定义组件
// Vue.component( id, [definition] )

// 大写字母变为-小写
function normalizeName(id) {
  return Array(id.length).fill('').map((_, idx) => {
    const ch = id[idx];
    const isCapital = ch.charCodeAt() >= 65 && ch.charCodeAt() <= 90;
    return isCapital ? `${idx !== 0 ? '-' : ''}${ch.toLowerCase()}` : ch;
  }).join('');
}

function create(MiniVue, global) {
  const comps = {}; // 组件库
  // eslint-disable-next-line consistent-return
  return function component(id, definition) {
    const nId = normalizeName(id);
    if (definition) {
      comps[nId] = function createInstance(options) {
        const fOpts = { ...definition, ...options };
        return new MiniVue(fOpts);
      };
      comps[nId].options = definition;
    } else {
      return global ? global(nId) || comps[nId] : comps[nId];
    }
  };
}

export default {
  create,
  normalizeName,
};
