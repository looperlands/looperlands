// Authored events share one seasonal layer set alongside permanent map scenery.
if (!self.createSceneParallax) importScripts('parallax-renderer-worker.js');
const seasonalParallax = self.createSceneParallax();
self.RendererExtensions.register('seasonal-ground', {layer: 'ground', subpixel: true, draw: seasonalParallax.ground});
self.RendererExtensions.register('seasonal-foreground', {layer: 'foreground', draw: seasonalParallax.foreground});
