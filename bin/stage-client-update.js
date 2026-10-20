#!/usr/bin/env node
require('../server/js/clientreleases').stage(require('path').resolve(__dirname, '..'), process.stdin)
    .then(result => process.stdout.write(JSON.stringify(result)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
