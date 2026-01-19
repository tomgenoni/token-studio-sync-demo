import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';

// Register Token Studio transforms
register(StyleDictionary);

export const themes = ['light', 'dark'];
export const cssPrefix = 'pdl';

// Get the tokens-studio transforms, remove name/camel to keep name/kebab
const tsTransforms = StyleDictionary.hooks.transformGroups['tokens-studio'].filter(
  (t) => t !== 'name/camel',
);
StyleDictionary.registerTransformGroup({
  name: 'tokens-studio/css',
  transforms: tsTransforms,
});

// Register format to collect tokens
StyleDictionary.registerFormat({
  name: 'json/collect',
  format: ({ dictionary }) => {
    return JSON.stringify(dictionary.allTokens, null, 2);
  },
});

export { StyleDictionary };
