// Infer a stable standing baseline without recentering individual animation frames.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SpriteGroundAnchor = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    function frameLayout(imageWidth, imageHeight, sprite) {
        const {width, height, animationData, sourceScale = 1} = sprite || {};
        if (![width, height, sourceScale, imageWidth, imageHeight].every(value => Number.isSafeInteger(value) && value > 0) ||
            !animationData || typeof animationData !== 'object' || Array.isArray(animationData)) return null;
        const animations = Object.values(animationData);
        if (!animations.length || animations.some(animation => !Number.isSafeInteger(animation?.row) || animation.row < 0 ||
            !Number.isSafeInteger(animation?.length) || animation.length < 1)) return null;
        const columns = Math.max(...animations.map(animation => animation.length));
        const rows = 1 + Math.max(...animations.map(animation => animation.row));
        const frameWidth = width * sourceScale, frameHeight = height * sourceScale;
        if (imageWidth !== columns * frameWidth || imageHeight !== rows * frameHeight) return null;
        const idle = animationData.idle_down;
        return idle ? {frameWidth, frameHeight, sourceScale, row: idle.row, length: idle.length} : null;
    }

    function inferOffset(imageData, sprite) {
        const layout = frameLayout(imageData?.width, imageData?.height, sprite);
        if (!layout || !Number.isFinite(sprite.offsetY) ||
            imageData.data?.length !== imageData.width * imageData.height * 4) return 0;
        const {frameWidth, frameHeight, sourceScale, row, length} = layout;
        let bottom = 0;
        for (let frame = 0; frame < length; frame++) {
            for (let y = frameHeight - 1; y >= bottom; y--) {
                const start = ((row * frameHeight + y) * imageData.width + frame * frameWidth) * 4;
                let opaque = false;
                for (let x = 0; x < frameWidth; x++) {
                    if (imageData.data[start + x * 4 + 3] > 0) {opaque = true; break;}
                }
                if (opaque) {bottom = y + 1; break;}
            }
        }
        // Never move padded legacy artwork down. Attack effects and jumps do not define the ground.
        return bottom ? Math.min(0, 16 - sprite.offsetY - bottom / sourceScale) : 0;
    }

    return {frameLayout, inferOffset};
});
