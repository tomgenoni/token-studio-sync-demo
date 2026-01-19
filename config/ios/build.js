import { StyleDictionary, themes } from '../shared.js';

for (const theme of themes) {
  const sd = new StyleDictionary({
    source: [
      'tokens/palette.json',
      'tokens/dimension.json',
      'tokens/type.json',
      `tokens/mode/${theme}.json`,
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
    },
  });

  await sd.buildAllPlatforms();
}

console.log('iOS build completed!');
