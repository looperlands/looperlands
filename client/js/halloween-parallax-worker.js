// Halloween supplies its own scene bounds and layers, using the same parallax
// engine (including reduced motion) as the permanent map scenery.
if (!self.createSceneParallax) importScripts('parallax-renderer-worker.js');
const halloweenParallax = self.createSceneParallax();
self.RendererExtensions.register('halloween-ground', {layer: 'ground', subpixel: true, draw: halloweenParallax.ground});
self.RendererExtensions.register('halloween-foreground', {layer: 'foreground', draw: halloweenParallax.foreground});
