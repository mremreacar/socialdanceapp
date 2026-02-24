const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force react-native-worklets to use prebuilt lib/ instead of src/
// to avoid Metro resolving non-existent initializers.native.ts
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-worklets') {
    const workletsRoot = path.dirname(require.resolve('react-native-worklets/package.json'));
    const mainPath = path.join(workletsRoot, 'lib', 'module', 'index.js');
    return { type: 'sourceFile', filePath: mainPath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
