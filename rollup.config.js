import { terser } from "rollup-plugin-terser";
import serve from "rollup-plugin-serve";

export default [
  {
    input: "src/mini-vue/index.js",
    output: [
      {
        file: "dist/mini-vue.js",
        name: "MiniVue",
        format: "umd",
      },
      {
        file: "dist/mini-vue.min.js",
        name: "MiniVue",
        format: "umd",
        plugins: [terser()],
      },
    ],
    plugins: [serve({contentBase: ["dist", "test"] })],
  },
  {
    input: "test/test.js",
    output: [
      {
        file: "test/dist/test.js",
        format: "cjs",
      },
    ],
  },
];
