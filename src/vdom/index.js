// 想好vdom应该做的事情
// 提供对应html基本元素的对应的vdom类
// 提供dom树的diff方法
// 提供对dom树应用diff的结果
import KElement from './KElement';

export * from './diff';

export { KElement };
