const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// App imports keep their `.js` specifiers. Babel strips the TypeScript, and
// Node maps those specifiers onto `.ts` files. Metro only swaps extensions
// for extensionless imports, so point a missing `.js` file at the source.
const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    const requested = path.resolve(path.dirname(context.originModulePath), moduleName);
    if (!fs.existsSync(requested)) {
      const tsx = `${requested.slice(0, -3)}.tsx`;
      const ts = `${requested.slice(0, -3)}.ts`;
      if (fs.existsSync(tsx)) {
        return context.resolveRequest(context, moduleName.replace(/\.js$/, '.tsx'), platform);
      }
      if (fs.existsSync(ts)) {
        return context.resolveRequest(context, moduleName.replace(/\.js$/, '.ts'), platform);
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
