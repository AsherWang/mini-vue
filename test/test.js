import MiniVue from "../src/mini-vue/index";
import { KElement as El } from "../src/vdom/index";

function testMiniVue() {
  const vm = new MiniVue({
    el: "#app",
    data() {
      return {
        name: "MiniVue",
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
        El("h3", {}, [name]),
        El("ul", { class: "margin-left-10" }, ulChildren),
      ]);
    },
  });

  console.log(vm.info);
  console.log(vm.infoplus);

  vm.growOld(10);
  vm.detail.job = "singer";
  vm.hobbies[2]='rap';
  vm.hobbies.push("l");

  console.log(vm.info);
  console.log(vm.infoplus);

  window.vm = vm;
}

testMiniVue();
