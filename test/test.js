const MiniVue = require("../dist/mini-vue");

function test() {
  const vm = new MiniVue({
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
    methods:{
      growOld(num = 1){
        this.age += num;
      }
    },
    watch: {
      age(nv, pv){
        console.log(`age change from ${pv} to ${nv}`);
      },
      ['detail.job'](nv, pv){
        console.log(`detail.job change from ${pv} to ${nv}`);
      },
    },
  });

  console.log(vm.info);
  console.log(vm.infoplus);

  vm.growOld(10);
  vm.name = "c";
  vm.detail.job = "singer";
  vm.hobbies[2]='rap';
  vm.hobbies.push("l");

  console.log(vm.info);
  console.log(vm.infoplus);
}

test();
