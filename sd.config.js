import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';

// Register Token Studio transforms
register(StyleDictionary);

// Register custom C++ header format
StyleDictionary.registerFormat({
  name: 'cpp/header',
  format: ({ dictionary, file }) => {
    const header = file.destination.replace('.h', '').toUpperCase().replace(/[^A-Z0-9]/g, '_');

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
      const type = (token.$type === 'color' || token.type === 'color') ? 'const unsigned int' : 'const auto';
      output += `    ${type} ${name} = ${value};\n`;
    });

    output += `\n} // namespace DesignTokens\n\n#endif // ${header}_H\n`;
    return output;
  },
});

const themes = ['light', 'dark'];

// Build configurations for each theme
for (const theme of themes) {
  const sd = new StyleDictionary({
    source: [
      'tokens/palette.json',
      'tokens/dimension.json',
      `tokens/${theme}.json`,
    ],
    preprocessors: ['tokens-studio'],
    platforms: {
      css: {
        transformGroup: 'tokens-studio',
        buildPath: `build/css/${theme}/`,
        files: [
          {
            destination: 'variables.css',
            format: 'css/variables',
            options: {
              outputReferences: true,
            },
          },
        ],
      },
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
            filter: (token) => ['dimension', 'spacing', 'borderRadius', 'fontSizes'].includes(token.$type),
          },
          {
            destination: 'StyleDictionarySize.m',
            format: 'ios/static.m',
            filter: (token) => ['dimension', 'spacing', 'borderRadius', 'fontSizes'].includes(token.$type),
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
            filter: (token) => ['dimension', 'spacing', 'borderRadius', 'fontSizes'].includes(token.$type),
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
