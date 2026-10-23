const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

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

function checkRuntimeDependencies(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            checkRuntimeDependencies(file);
        } else if (entry.name.endsWith('.js')) {
            const source = fs.readFileSync(file, 'utf8');
            // Worker URLs resolve from the document; importScripts resolves from the worker.
            for (const worker of source.matchAll(/new\s+(?:Shared)?Worker\s*\(\s*(["'])([^"']+)\1\s*[,)]/g)) {
                checkAsset(worker[2]);
            }
            for (const dependency of source.matchAll(/\bimportScripts\s*\(\s*(["'])([^"']+)\1\s*\)/g)) {
                checkAsset(dependency[2], path.dirname(file));
            }
            // Literal import() URLs resolve from their script, not the document.
            // Computed imports (for example map/game names) remain runtime checks.
            for (const dependency of source.matchAll(/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g)) {
                checkAsset(dependency[2], path.dirname(file));
            }
        }
    }
}

function checkStartupSprites() {
    const file = path.join(buildDir, 'js/game.js');
    if (!fs.existsSync(file)) return;
    const nodes = [acorn.parse(fs.readFileSync(file, 'utf8'), {ecmaVersion: 'latest'})];
    const names = new Set(), sprites = new Map();
    while (nodes.length) {
        const node = nodes.pop();
        if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
            node.left.object.type === 'ThisExpression' && node.left.property.name === 'spriteNames') {
            if (node.right.type !== 'ArrayExpression' || node.right.elements.some(value =>
                value?.type !== 'Literal' || typeof value.value !== 'string')) {
                throw new Error('Client build startup sprite names must be a literal string array.');
            }
            for (const value of node.right.elements) names.add(value.value);
        }
        // The optimizer embeds JSON as named text modules; these remain available
        // after the standalone sprites directory is removed from the final build.
        if (node.type === 'CallExpression' && node.callee.name === 'define' &&
            /^text!\.\.\/sprites\/.+\.json$/.test(node.arguments[0]?.value || '')) {
            const factory = node.arguments[node.arguments.length - 1];
            const returned = factory.body?.body?.find(statement => statement.type === 'ReturnStatement')?.argument;
            if (returned?.type === 'Literal' && typeof returned.value === 'string') {
                const data = JSON.parse(returned.value);
                sprites.set(data.id, data);
            }
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) {
                for (const child of value) if (child?.type) nodes.push(child);
            } else if (value?.type) nodes.push(value);
        }
    }
    for (const name of names) {
        const sprite = sprites.get(name);
        if (!sprite) throw new Error('Client build is missing startup sprite metadata: ' + name);
        // The renderer uses the bundled scale-1 images and upscales them itself.
        checkAsset('img/1/' + sprite.id + '.png');
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

checkRuntimeDependencies(path.join(buildDir, 'js'));
checkStartupSprites();

if (missing.size) {
    throw new Error('Client build is missing runtime assets: ' + [...missing].join(', '));
}
console.log('All local entry, worker, dynamic-import and startup sprite assets are present in the client build.');
