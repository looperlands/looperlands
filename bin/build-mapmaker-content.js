const {build} = require('../server/js/mapmakercontent');
try {
    console.log('Validated Mapmaker content; prepared ' + build() + ' production map artifacts.');
} catch (error) {
    console.error('Mapmaker content build failed: ' + error.message);
    process.exitCode = 1;
}
