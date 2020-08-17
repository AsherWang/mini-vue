export default {
  name: "MyComp",
  props: {
    name: {
      type: "name",
      default: "cname",
    },
  },
  data() {
    return {
      other: "123",
    };
  },
  computed: {
    info(){
      return this.name + this.other;
    },
  },
  template: "<div><div>{{name}}</div><div>{{other}}</div><div>{{info}}</div></div>",
  watch: {
    name(nv, pv){
      console.log(`prop name change from ${pv} to ${nv}`);
    }
  },
};
