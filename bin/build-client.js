const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');
const requirejs = require('./r');
const {clientFingerprint, recordClientBuild} = require('./mapmaker-client');

const root = path.resolve(__dirname, '..');
const authoredEntities = JSON.parse(fs.readFileSync(path.join(root, 'shared/js/mapmakerentities.json'), 'utf8'));
const entitiesFile = path.join(root, 'client/js/mapmakerentities.js');
const entitiesSource = '// Generated from shared/js/mapmakerentities.json. Do not edit.\n' +
    'define(function () { return ' + JSON.stringify(authoredEntities) + '; });\n';
if (!fs.existsSync(entitiesFile) || fs.readFileSync(entitiesFile, 'utf8') !== entitiesSource) fs.writeFileSync(entitiesFile, entitiesSource);
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

let fingerprint;
try {fingerprint = clientFingerprint(root);} catch (_) {} // Full builds also support legacy/symlinked checkouts.
requirejs.optimize(config, () => {
    try {recordClientBuild(root, fingerprint);} catch (_) {} // Cache metadata must never fail a production build.
    console.log('Client build complete');
}, error => {
    console.error(error.message);
    process.exitCode = 1;
});
