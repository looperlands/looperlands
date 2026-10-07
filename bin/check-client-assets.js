const fs = require('fs');
const path = require('path');

const buildDir = path.resolve(process.argv[2] || path.join(__dirname, '../client-build'));
const html = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8');
const missing = new Set();

function checkAsset(asset, baseDir = buildDir) {
    if (/^(?:[a-z]+:)?\/\//i.test(asset) || /^[a-z]+:/i.test(asset)) {
        return;
    }
    asset = asset.split(/[?#]/)[0];
    const file = asset.startsWith('/')
        ? path.join(buildDir, asset.slice(1))
        : path.resolve(baseDir, asset);
    if (!fs.existsSync(file)) {
        missing.add(path.relative(buildDir, file));
    }
}

function checkWorkerDependencies(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            checkWorkerDependencies(file);
        } else if (entry.name.endsWith('.js')) {
            const source = fs.readFileSync(file, 'utf8');
            // Worker URLs resolve from the document; importScripts resolves from the worker.
            for (const worker of source.matchAll(/new\s+(?:Shared)?Worker\s*\(\s*(["'])([^"']+)\1\s*[,)]/g)) {
                checkAsset(worker[2]);
            }
            for (const dependency of source.matchAll(/\bimportScripts\s*\(\s*(["'])([^"']+)\1\s*\)/g)) {
                checkAsset(dependency[2], path.dirname(file));
            }
        }
    }
}

for (const script of html.matchAll(/<script\b[^>]*>/gi)) {
    for (const attribute of script[0].matchAll(/\b(src|data-main)=["']([^"']+)["']/gi)) {
        let asset = attribute[2];
        if (/^(?:[a-z]+:)?\/\//i.test(asset) || /^[a-z]+:/i.test(asset)) {
            continue;
        }
        asset = asset.split(/[?#]/)[0].replace(/^\//, '');
        if (attribute[1].toLowerCase() === 'data-main' && !asset.endsWith('.js')) {
            asset += '.js';
        }
        checkAsset(asset);
    }
}

checkWorkerDependencies(path.join(buildDir, 'js'));

if (missing.size) {
    throw new Error('Client build is missing runtime scripts: ' + [...missing].join(', '));
}
console.log('All local entry and worker scripts are present in the client build.');
