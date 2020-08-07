(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  function testMiniVue() {
    const vm = new MiniVue({
      el: "#app",
      data() {
        return {
          name: "MiniVue",
          showName: false,
          nickName: "mini-vue",
          age: 0,
          detail: {
            job: "dev",
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
          return JSON.stringify(this.$data, null, 4);
        }
      },
      methods: {
        growOld() {
          this.age += 1;
        },
        onValueChange(e) {
          this.nickName = e.target.value;
        },
        toggleShowName(){
          this.showName = !this.showName;
        }
      },
      watch: {
        age(nv, pv) {
          console.log(`age change from ${pv} to ${nv}`);
        },
        ["detail.job"](nv, pv) {
          console.log(`detail.job change from ${pv} to ${nv}`);
        },
      },
      // template:
      //   '<div class="virtual-container"><h3>{{name}}</h3>' +
      //   '<div class="item" v-show="showName" style="font-weight:bold;">name: {{name}}</div>' +
      //   '<div class="item"><span>showName</span><button style="margin-left:10px" @click="toggleShowName">toggle</button></div>' +
      //   '<div class="item">made in China</div>' +
      //   '</div>',
      template:
        '<div class="virtual-container"><h3>{{name}}</h3>' +
        '<ul class="margin-left-10">' +
        '<li class="item" v-show="showName" style="font-weight:bold;">name: {{name}}</li>' +
        '<li class="item"><span>showName: {{showName}}</span><button style="margin-left:10px" @click="toggleShowName">toggle</button></li>' +
        '<li class="item"><span>age: {{age}}</span><button style="margin-left:10px" @click="growOld">grow</button></li>' +
        '<li class="item"><div><span>nick: </span><span>{{nickName}}</span></div></li>' +
        '<li class="item"><div><span>edit nick: </span><input :value="nickName" @change="onValueChange" /></div></li>' +
        '<li class="item">made in China</li>' +
        '<li class="item">made for fun</li>' +
        '</ul>' +
        '<h4>computed.dataStr</h4>' +
        '<pre style="background:lemonchiffon;padding:5px;">{{dataStr}}</pre>' +
        '</div>',
    });
    window.vm = vm; // for test in browser console
  }

  testMiniVue();

})));
