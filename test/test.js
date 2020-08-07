function testMiniVue() {
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
  window.vm = vm; // for test in browser console
}

testMiniVue();
