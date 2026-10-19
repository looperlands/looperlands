define(['sprites'], function (sprites) {
    // Some supplied item sheets have already clipped the weapon. Allow their
    // metadata to point at an intact region of the original gameplay sheet.
    return {
        get: function (weaponName, scale = 1) {
            const source = sprites[weaponName];
            const icon = source?.icon;
            if (!icon) return null;

            const animations = Object.values(source.animations);
            const sheetWidth = source.width * Math.max(...animations.map(animation => animation.length));
            const sheetHeight = source.height * Math.max(...animations.map(animation => animation.row + 1));
            return {
                width: icon.width,
                height: icon.height,
                style: {
                    'background-image': 'url("img/' + scale + '/' + source.id + '.png")',
                    'background-size': (sheetWidth / icon.width * 100) + '% ' + (sheetHeight / icon.height * 100) + '%',
                    'background-position': (icon.x / (sheetWidth - icon.width) * 100) + '% ' + (icon.y / (sheetHeight - icon.height) * 100) + '%',
                    'background-repeat': 'no-repeat'
                }
            };
        }
    };
});
