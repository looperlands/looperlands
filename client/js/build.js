({
    appDir: "../",
    baseUrl: "js/",
    dir: "../../client-build",
    optimize: "none",
    optimizeCss: "standard.keepLines",
    
    paths: {
        "jquery": "lib/require-jquery"
    },

    modules: [
        //Optimize the require-jquery.js file by applying any minification
        //that is desired via the optimize: setting above.
        {
            name: "jquery"
        },
        
        {
            name: "game",
            exclude: ["jquery"]
        },
         
        {
            name: "home",
            // Exclude the jquery module since it is included already in require-jquery.js
            exclude: ["jquery"],
            // main initializes app before loading game. Keep shared dependencies
            // such as dialoguetext available during that startup sequence.
            excludeShallow: ["game"]
        }
    ],
    
    pragmas: {
        devHost: false,
        prodHost: true
    },
})
