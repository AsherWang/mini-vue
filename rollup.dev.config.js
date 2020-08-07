import serve from "rollup-plugin-serve";
import config from './rollup.config';

config[0].plugins = [serve({contentBase: ["dist", "test", "docs"] })];
export default config;