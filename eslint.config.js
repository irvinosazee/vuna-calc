const js = require('@eslint/js');

module.exports = [
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'public/calculator/assets/js/bootstrap.min.js', 'public/calculator/assets/css/', 'public/calculator/src/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        evaluateExpression: 'readonly',
        computePercent: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'eqeqeq': 'error',
      'semi': ['error', 'always'],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: { console: 'readonly' },
    },
    rules: {
      'semi': ['error', 'always'],
    },
  },
];
