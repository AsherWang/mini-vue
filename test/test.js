import MiniVue from "../src/mini-vue/index";
import { KElement as El } from "../src/vdom/index";

function testMiniVue() {
  const vm = new MiniVue({
    el: "#app",
    data() {
      return {
        name: "MiniVue",
        btnClickCount: 0,
        nickName: "mini-vue",
        age: 0,
        detail: {
          job: "DEV",
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
    render() {
      const name = this.name;
      const age = this.age;
      const ulChildren = [
        El("li", { class: "item" }, [`name: ${name}`]),
        El("li", { class: "item" }, [
          El("span", {}, [`age: ${age}`]),
          El("button", { "@click": this.growOld, "style": 'margin-left:10px' }, ["grow"]),
        ]),
        El("li", { class: "item" }, [
          El("div", {}, [
            El("span", {}, ["nick: "]),
            El("span", {}, [this.nickName]),
          ]),
        ]),
        El("li", { class: "item" }, [
          El("div", {}, [
            El("span", {}, ["edit nick: "]),
            El("input", {
              value: this.nickName,
              "@change": this.onValueChange,
            }),
          ]),
        ]),
        El("li", { class: "item" }, ['made by ash']),
        El("li", { class: "item" }, ['made for learning and fun']),
      ];
      return El("div", { class: "virtual-container" }, [
        El("h3", {}, [name]),
        El("ul", { class: "margin-left-10" }, ulChildren),
      ]);
    },
  });

  console.log(vm.info);
  console.log(vm.infoplus);

  vm.growOld();
  vm.detail.job = "singer";
  vm.hobbies[2] = "rap";
  vm.hobbies.push("l");

  console.log(vm.info);
  console.log(vm.infoplus);

  window.vm = vm; // for test in browser console
}

testMiniVue();
