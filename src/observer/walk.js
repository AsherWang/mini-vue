const touchedObjs = [];

function doWalk(obj) {
  if (!obj || (!Array.isArray(obj) && typeof obj !== 'object') || touchedObjs.includes(obj)) {
    return;
  }
  touchedObjs.push(obj);
  if (Array.isArray(obj)) {
    obj.forEach((v) => doWalk(v));
  } else {
    Object.values(obj).forEach((v) => doWalk(v));
  }
}

function walk(obj) {
  doWalk(obj);
  touchedObjs.length = 0;
}

export default walk;
