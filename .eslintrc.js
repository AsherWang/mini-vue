module.exports = {
  env: {
    es2020: true,
    browser: true,
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
    'class-methods-use-this': ['off'],
    'no-console': ['off'],
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  },
  // files: ['bin/*.js', 'lib/*.js'],
  // excludedFiles: ['docs/*.js'],
};
