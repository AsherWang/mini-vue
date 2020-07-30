### MiniVue
读Vue2源码之后尝试自己做一个简单实现  
复习 & 梳理结构

### 目录结构
| 路径 | 描述 | 代码/行 |  
|:--|:--| :--|
| /src/observer | 实现对数据的监察和更新通知 | 100+ |
| /src/observer/walk | 深度遍历一个对象或者数组的所有值,配合依赖收集使用 | 20+ |
| /src/mini-vue | 实现MiniVue方法，处理传入参数 | 100+|
| /src/vdom | 实现虚拟DOM和diff操作, 偷懒从之前写的 [一个项目](https://github.com/AsherWang/virtual-dom-practice) 里边搬了过来 | 300+ |


### 样例代码
``` javascript
const vm = new MiniVue({
  el: "#app",
  data() {
    return {
      name: "ash",
      age: 23,
      detail: {
        job: "IT",
      },
      hobbies: ["c", "t", "r"],
    };
  },
  computed: {
    info() {
      const hobbies = this.hobbies.join(",");
      return `${this.name}:${this.age} - ${this.detail.job}:${hobbies}`;
    },
    infoplus() {
      return this.info + "-plus";
    },
  },
  methods: {
    growOld(num = 1) {
      this.age += num;
    },
  },
  watch: {
    age(nv, pv) {
      console.log(`age change from ${pv} to ${nv}`);
    },
    ["detail.job"](nv, pv) {
      console.log(`detail.job change from ${pv} to ${nv}`);
    },
  },
  render() {
    const name = this.name;
    const age = this.age;
    const ulChildren = [
      El("li", { class: "item" }, [`name : ${name}`]),
      El("li", { class: "item" }, [`age: ${age}`]),
    ];
    return El("div", { class: "virtual-container" }, [
      El("h3", {}, ["VIRTUAL DOM"]),
      El("ul", { class: "marginLeft10" }, ulChildren),
    ]);
  },
});

console.log(vm.info); // ash:23 - IT:c,t,r
console.log(vm.infoplus); // ash:23 - IT:c,t,r-plus

vm.growOld(10);
vm.name = "c";
vm.detail.job = "singer";
vm.hobbies[2]='rap';
vm.hobbies.push("l");

console.log(vm.info); // c:33 - singer:c,t,rap,l
console.log(vm.infoplus); // c:33 - singer:c,t,rap,l-plus
```

### DEV
1. `npm i`  
1. `npm run dev`  
1. 打开浏览器 http://localhost:10001/
### TODOS
- 事件绑定
- 解析template, 啊。。
- 自定义组件

### PERF
- vdom: 当初更年轻, 更简单粗暴


### Lisence
MIT