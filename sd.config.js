import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';

// Register Token Studio transforms
register(StyleDictionary);

// Get the tokens-studio transforms, remove name/camel to keep name/kebab
const tsTransforms = StyleDictionary.hooks.transformGroups['tokens-studio'].filter(
  (t) => t !== 'name/camel',
);
StyleDictionary.registerTransformGroup({
  name: 'tokens-studio/css',
  transforms: tsTransforms,
});

const cssPrefix = 'pdl';

// Register custom C++ header format
StyleDictionary.registerFormat({
  name: 'cpp/header',
  format: ({ dictionary, file }) => {
    const header = file.destination
      .replace('.h', '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_');

    const formatValue = (token) => {
      const value = token.$value ?? token.value;
      if (token.$type === 'color' || token.type === 'color') {
        // Convert hex color to 0xAARRGGBB format
        let hex = String(value).replace('#', '');
        if (hex.length === 6) hex = 'FF' + hex;
        return `0x${hex.toUpperCase()}`;
      }
      if (typeof value === 'number') {
        return value.toString().includes('.') ? `${value}f` : value;
      }
      if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        const num = parseFloat(value);
        return num.toString().includes('.') ? `${num}f` : num;
      }
      return `"${value}"`;
    };

    const formatName = (name) => name.toUpperCase().replace(/-/g, '_').replace(/\./g, '_');

    let output = `#ifndef ${header}_H\n#define ${header}_H\n\n`;
    output += `namespace DesignTokens {\n\n`;

    dictionary.allTokens.forEach((token) => {
      const name = formatName(token.name);
      const value = formatValue(token);
      const type =
        token.$type === 'color' || token.type === 'color' ? 'const unsigned int' : 'const auto';
      output += `    ${type} ${name} = ${value};\n`;
    });

    output += `\n} // namespace DesignTokens\n\n#endif // ${header}_H\n`;
    return output;
  },
});

const themes = ['light', 'dark'];

// Store resolved color values for mode.css generation
const colorsByTheme = {};

// Register format to collect tokens
StyleDictionary.registerFormat({
  name: 'json/collect',
  format: ({ dictionary }) => {
    return JSON.stringify(dictionary.allTokens, null, 2);
  },
});

// Register custom format for mode.css with media query for dark mode
StyleDictionary.registerFormat({
  name: 'css/mode',
  format: ({ dictionary, options }) => {
    const { darkTokens, modeTokenNames } = options;

    // Convert token references like {color.black} to var(--pdl-color-black)
    // Handles both standalone refs and embedded refs like rgba({color.black}, 0.3)
    const refToVar = (ref) => {
      if (!ref || typeof ref !== 'string') return ref;
      return ref.replace(/\{([^}]+)\}/g, (_, path) => {
        // Convert path to kebab-case: color.gray.700 -> pdl-color-gray-700
        const varName = path.replace(/\./g, '-');
        return `var(--${cssPrefix}-${varName})`;
      });
    };

    // Create a map of dark token original values by unprefixed name
    const darkOriginalValues = new Map();
    darkTokens.forEach((token) => {
      const original = token.original?.$value ?? token.original?.value;
      const unprefixedName = token.name.replace(`${cssPrefix}-`, '');
      darkOriginalValues.set(unprefixedName, original);
    });

    // Build light mode output
    let output = ':root {\n';
    let darkOutput = '';

    dictionary.allTokens.forEach((token) => {
      const resolvedValue = token.$value ?? token.value;
      const unprefixedName = token.name.replace(`${cssPrefix}-`, '');

      if (modeTokenNames.has(unprefixedName)) {
        // Mode-specific token - output light value in :root, dark value in media query
        const lightOriginal = token.original?.$value ?? token.original?.value;
        const darkOriginal = darkOriginalValues.get(unprefixedName);
        const lightVar = refToVar(lightOriginal) || resolvedValue;
        const darkVar = refToVar(darkOriginal) || resolvedValue;
        output += `  --${token.name}: ${lightVar};\n`;
        darkOutput += `  --${token.name}: ${darkVar};\n`;
      } else {
        // Palette token - only output once in :root
        output += `  --${token.name}: ${resolvedValue};\n`;
      }
    });

    output += '}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n';
    // Indent dark output for nesting inside media query
    darkOutput
      .split('\n')
      .filter((line) => line)
      .forEach((line) => {
        output += `  ${line}\n`;
      });
    output += '  }\n}\n';

    return output;
  },
});

// First pass: collect color tokens from each theme
for (const theme of themes) {
  const sd = new StyleDictionary({
    source: ['tokens/palette.json', `tokens/${theme}.json`],
    preprocessors: ['tokens-studio'],
    platforms: {
      collect: {
        transformGroup: 'tokens-studio/css',
        prefix: cssPrefix,
        buildPath: 'build/css/',
        files: [
          {
            destination: `_${theme}_colors.json`,
            format: 'json/collect',
            filter: (token) => token.$type === 'color',
          },
        ],
      },
    },
  });

  await sd.buildAllPlatforms();

  // Read the collected tokens then clean up temp file
  const fs = await import('fs');
  const tempFile = `build/css/_${theme}_colors.json`;
  const tokensJson = fs.readFileSync(tempFile, 'utf8');
  colorsByTheme[theme] = JSON.parse(tokensJson);
  fs.unlinkSync(tempFile);
}

// Get mode-specific token names (tokens defined in the theme files, not palette)
// Use unprefixed names for matching
const modeTokenNames = new Set(
  colorsByTheme.light
    .filter((token) => !token.path[0].startsWith('color'))
    .map((token) => token.name.replace(`${cssPrefix}-`, '')),
);

// Build mode.css with light-dark() functions
const modeSd = new StyleDictionary({
  source: ['tokens/palette.json', 'tokens/light.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: {
      transformGroup: 'tokens-studio/css',
      prefix: cssPrefix,
      buildPath: 'build/css/',
      files: [
        {
          destination: 'mode.css',
          format: 'css/mode',
          filter: (token) => token.$type === 'color',
          options: {
            darkTokens: colorsByTheme.dark,
            modeTokenNames,
          },
        },
      ],
    },
  },
});
await modeSd.buildAllPlatforms();

// Build dimension.css (theme-independent)
const dimensionSd = new StyleDictionary({
  source: ['tokens/dimension.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: {
      transformGroup: 'tokens-studio/css',
      prefix: cssPrefix,
      buildPath: 'build/css/',
      files: [
        {
          destination: 'dimension.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
  },
});
await dimensionSd.buildAllPlatforms();

// Build type.css (theme-independent)
const typeSd = new StyleDictionary({
  source: ['tokens/type.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: {
      transformGroup: 'tokens-studio/css',
      prefix: cssPrefix,
      buildPath: 'build/css/',
      files: [
        {
          destination: 'type.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
  },
});
await typeSd.buildAllPlatforms();

// Build configurations for each theme (non-CSS platforms)
for (const theme of themes) {
  const sd = new StyleDictionary({
    source: [
      'tokens/palette.json',
      'tokens/dimension.json',
      'tokens/type.json',
      `tokens/${theme}.json`,
    ],
    preprocessors: ['tokens-studio'],
    platforms: {
      ios: {
        transformGroup: 'tokens-studio',
        buildPath: `build/ios/${theme}/`,
        files: [
          {
            destination: 'StyleDictionaryColor.h',
            format: 'ios/colors.h',
            filter: (token) => token.$type === 'color',
          },
          {
            destination: 'StyleDictionaryColor.m',
            format: 'ios/colors.m',
            filter: (token) => token.$type === 'color',
          },
          {
            destination: 'StyleDictionarySize.h',
            format: 'ios/static.h',
            filter: (token) =>
              ['dimension', 'spacing', 'borderRadius', 'fontSizes'].includes(token.$type),
          },
          {
            destination: 'StyleDictionarySize.m',
            format: 'ios/static.m',
            filter: (token) =>
              ['dimension', 'spacing', 'borderRadius', 'fontSizes'].includes(token.$type),
          },
        ],
      },
      android: {
        transformGroup: 'tokens-studio',
        buildPath: `build/android/${theme}/`,
        files: [
          {
            destination: 'colors.xml',
            format: 'android/colors',
            filter: (token) => token.$type === 'color',
          },
          {
            destination: 'dimens.xml',
            format: 'android/dimens',
            filter: (token) =>
              ['dimension', 'spacing', 'borderRadius', 'fontSizes'].includes(token.$type),
          },
          {
            destination: 'font_dimens.xml',
            format: 'android/fontDimens',
            filter: (token) => token.$type === 'fontSizes',
          },
        ],
      },
      cpp: {
        transformGroup: 'tokens-studio',
        buildPath: `build/cpp/${theme}/`,
        files: [
          {
            destination: 'tokens.h',
            format: 'cpp/header',
          },
        ],
      },
    },
  });

  await sd.buildAllPlatforms();
}

console.log('Build completed for all themes and platforms!');
