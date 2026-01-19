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
    },
  });

  await sd.buildAllPlatforms();
}

console.log('Android build completed!');
