// Cypress's TS preprocessor elides default JSON imports (no resolveJsonModule in
// the root tsconfig), leaving `import en from '*.json'` undefined at runtime.
// Resolve the locale through webpack's require so it loads as a real object.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const en = require('../../i18n/locales/en.json') as Record<string, any>;

export default en;
