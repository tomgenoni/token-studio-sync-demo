import { StyleDictionary, themes } from '../shared.js';

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

console.log('C++ build completed!');
