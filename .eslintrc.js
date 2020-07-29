module.exports = {
  env: {
    es2020: true,
  },
  root: true,
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  rules: {
    'max-classes-per-file': ['error', 10],
    'class-methods-use-this': [false],
  },
};
