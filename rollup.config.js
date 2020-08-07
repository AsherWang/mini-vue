import { terser } from "rollup-plugin-terser";

export default [
  {
    input: "src/mini-vue/index.js",
    output: [
      {
        file: "docs/mini-vue.js",
        name: "MiniVue",
        format: "umd",
      },
      {
        file: "docs/mini-vue.min.js",
        name: "MiniVue",
        format: "umd",
        plugins: [terser()],
      },
    ],
  },
  {
    input: "test/test.js",
    output: [
      {
        file: "docs/test.js",
        format: "umd",
      },
    ],
  },
  {
    input: "test/test.template.js",
    output: [
      {
        file: "test/dist/test.template.js",
        format: "umd",
      },
    ],
  },
];
