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
// home loads main from inside its factory; explicitly trace that deferred entry.
config.modules.find(module => module.name === 'home').include = ['main'];

// The bundled optimizer's Esprima cannot parse async functions or optional chaining.
// Transform module reads before dependency tracing without rewriting source files.
config.onBuildRead = (name, file, source) => babel.transformSync(source, {
    filename: file, configFile: false, babelrc: false, sourceType: 'unambiguous', compact: false,
    presets: [['@babel/preset-env', { targets: { ie: '11' }, modules: false }]]
}).code;

requirejs.optimize(config, () => console.log('Client build complete'), error => {
    console.error(error.message);
    process.exitCode = 1;
});
