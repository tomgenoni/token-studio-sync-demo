import { StyleDictionary, cssPrefix } from '../shared.js';

// Convert token references like {color.black} to var(--pdl-color-black)
const refToVar = (ref) => {
  if (!ref || typeof ref !== 'string') return ref;
  return ref.replace(/\{([^}]+)\}/g, (_, path) => {
    return `var(--${cssPrefix}-${path.replace(/\./g, '-')})`;
  });
};

// Flatten nested token object into array
const flattenTokens = (obj, result = []) => {
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      if (value.name && value.path) {
        result.push(value);
      } else {
        flattenTokens(value, result);
      }
    }
  }
  return result;
};

// Collect dark tokens using exportPlatform
const darkSd = new StyleDictionary({
  source: ['tokens/palette.json', 'tokens/mode/dark.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: { transformGroup: 'tokens-studio/css', prefix: cssPrefix },
  },
});

const darkTokensNested = await darkSd.exportPlatform('css');
const darkTokensList = flattenTokens(darkTokensNested).filter((t) => t.$type === 'color');

// Build map of dark values and identify mode-specific tokens
const darkValues = new Map();
const modeTokenNames = new Set();

darkTokensList.forEach((token) => {
  const name = token.name.replace(`${cssPrefix}-`, '');
  const original = token.original?.$value ?? token.original?.value;
  darkValues.set(name, refToVar(original));
  if (!token.path[0].startsWith('color')) {
    modeTokenNames.add(name);
  }
});

// Register format for mode.css with media query
StyleDictionary.registerFormat({
  name: 'css/mode',
  format: ({ dictionary }) => {
    let lightVars = '';
    let darkVars = '';

    dictionary.allTokens.forEach((token) => {
      const name = token.name.replace(`${cssPrefix}-`, '');
      const original = token.original?.$value ?? token.original?.value;
      const lightValue = refToVar(original) || token.$value || token.value;

      if (modeTokenNames.has(name)) {
        lightVars += `  --${token.name}: ${lightValue};\n`;
        darkVars += `    --${token.name}: ${darkValues.get(name)};\n`;
      } else {
        lightVars += `  --${token.name}: ${token.$value || token.value};\n`;
      }
    });

    return `:root {\n${lightVars}}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n${darkVars}  }\n}\n`;
  },
});

// Build mode.css
await new StyleDictionary({
  source: ['tokens/palette.json', 'tokens/mode/light.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: {
      transformGroup: 'tokens-studio/css',
      prefix: cssPrefix,
      buildPath: 'build/css/',
      files: [{ destination: 'mode.css', format: 'css/mode', filter: (token) => token.$type === 'color' }],
    },
  },
}).buildAllPlatforms();

// Build dimension.css
await new StyleDictionary({
  source: ['tokens/dimension.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: {
      transformGroup: 'tokens-studio/css',
      prefix: cssPrefix,
      buildPath: 'build/css/',
      files: [{ destination: 'dimension.css', format: 'css/variables', options: { outputReferences: true } }],
    },
  },
}).buildAllPlatforms();

// Build type.css
await new StyleDictionary({
  source: ['tokens/type.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: {
      transformGroup: 'tokens-studio/css',
      prefix: cssPrefix,
      buildPath: 'build/css/',
      files: [{ destination: 'type.css', format: 'css/variables', options: { outputReferences: true } }],
    },
  },
}).buildAllPlatforms();

console.log('CSS build completed!');
