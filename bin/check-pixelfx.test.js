const path = require('path');
const {spawnSync} = require('child_process');

test('native PixelFX effects preserve exact pixels and bounded frame caching', () => {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'check-pixelfx.mjs')], {
        encoding: 'utf8', timeout: 45000,
    });
    if (result.error || result.status !== 0) {
        throw new Error([
            'Native PixelFX checks failed (status ' + result.status + ', signal ' + result.signal + ').',
            result.error?.message, result.stdout, result.stderr,
        ].filter(Boolean).join('\n'));
    }
}, 50000);
