import serve from 'rollup-plugin-serve';
import config from './rollup.config';

config[0].plugins = [serve('docs')];
export default config;
