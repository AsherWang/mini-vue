### MiniVue
读Vue2源码之后尝试自己做一个简单(粗糙)实现  
复习 & 梳理结构  
基本实现 `data`, `computed` ,`methods`, `watch`, `template`  
指令 `v-bind`, `v-on`, `v-show`, `v-if`, `v-for`

### 在线预览
[点我点我](https://asherwang.github.io/mini-vue/)

### 目录结构
| 路径 | 描述 |  
|:--|:--| :--|  
| /src/mini-vue | 实现MiniVue方法，处理传入参数 |  
| /src/observer | 实现对数据的监视和更新通知 |  
| /src/observer/walk | 深度遍历一个对象或者数组的所有值,配合依赖收集使用 |  
| /src/template | 解析template, 转化为vdom, 其中表达式求值太难了还未实现 |  
| /src/vdom | 实现虚拟DOM和diff操作, 偷懒从之前写的 [一个项目](https://github.com/AsherWang/virtual-dom-practice) 里边搬了过来 |  



### 样例代码
``` javascript
const vm = new MiniVue({
  el: "#app",
  data() {
    return {
      name: "MiniVue",
      nickName: "mini-vue",
      age: 0,
      detail: {
        job: "DEV",
      },
      hobbies: ["c", "t", "r", "l"],
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
    dataStr(){
      return JSON.stringfy(this.$data);
    }
  },
  methods: {
    growOld() {
      this.age += 1;
    },
    onValueChange(e) {
      this.nickName = e.target.value;
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
  template:
    '<div class="virtual-container"><h3>{{name}}</h3>' +
    '<ul class="margin-left-10">' +
    '<li class="item">name: {{name}}</li>' +
    '<li class="item"><span>age: {{age}}</span><button style="margin-left:10px" @click="growOld">grow</button></li>' +
    '<li class="item"><div><span>nick: </span><span>{{nickName}}</span></div></li>' +
    '<li class="item"><div><span>edit nick: </span><input :value="nickName" @change="onValueChange" /></div></li>' +
    '<li class="item">made in China</li>' +
    '<li class="item">made for fun</li>' +
    "</ul>" +
    "<h3>Desc</h3>" +
    "<div>{{info}}</div>" +
    "</div>",
});
```

### 开发
1. `npm i`  
1. `npm run dev`  
1. 打开浏览器 http://localhost:10001/

### Notes
- vdom: 当初更年轻, 更简单粗暴，然后搬过来发现有bug，顺便被迫复习了一下vdom和diff

### BUGS
- diff遇到自定义组件
- 自定义组件销毁问题,啊..

### PERF
- template: 表达式求值， 啊

### Lisence
MIT