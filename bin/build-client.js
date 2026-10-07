const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');
const requirejs = require('./r');

const root = path.resolve(__dirname, '..');
const config = vm.runInNewContext(fs.readFileSync(path.join(root, 'client/js/build.js'), 'utf8'));
config.appDir = path.join(root, 'client');
config.baseUrl = 'js';
config.dir = path.join(root, 'client-build');

// The bundled optimizer's Esprima cannot parse optional chaining/nullish coalescing.
// Transform module reads before dependency tracing without rewriting source files.
config.onBuildRead = (name, file, source) => babel.transformSync(source, {
    filename: file, configFile: false, babelrc: false, sourceType: 'unambiguous', compact: false,
    presets: [['@babel/preset-env', { targets: { chrome: '60' }, modules: false }]]
}).code;

requirejs.optimize(config, () => console.log('Client build complete'), error => {
    console.error(error.message);
    process.exitCode = 1;
});
