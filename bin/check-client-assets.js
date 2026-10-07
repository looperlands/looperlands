const fs = require('fs');
const path = require('path');

const buildDir = path.resolve(process.argv[2] || path.join(__dirname, '../client-build'));
const html = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8');
const missing = new Set();

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
        if (!fs.existsSync(path.join(buildDir, asset))) {
            missing.add(asset);
        }
    }
}

if (missing.size) {
    throw new Error('Client build is missing entry scripts: ' + [...missing].join(', '));
}
console.log('All local entry scripts are present in the client build.');
