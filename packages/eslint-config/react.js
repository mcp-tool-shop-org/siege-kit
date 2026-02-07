import baseConfig from './base.js';

export default [
  ...baseConfig,
  {
    files: ['**/*.tsx'],
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
