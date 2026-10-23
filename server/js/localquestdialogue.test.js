const {validateDialogue} = require('./localquestdialogue');

test.each([
    'Please collect supplies.',
    'Collect <span class="dialogue-item">three apples</span>.',
    '<span class="dialogue-danger dialogue-shake">Defeat <span class="dialogue-wave">{{remaining}}</span> rats</span>.',
    "Bring <span class='dialogue-item'>supplies</span>, then <span class='dialogue-wave dialogue-shake'>return</span>.",
    '<SPAN CLASS="dialogue-item">{{done}} / {{amount}}</SPAN>',
    'A literal &lt;sign&gt; and an ampersand & are ordinary text.'
])('dialogue preserves supported nested styles and exact progress counters: %s', value => {
    expect(() => validateDialogue(value, 'Progress dialogue')).not.toThrow();
});

test.each([
    '<script>alert(1)</script>',
    '<style>body{display:none}</style>',
    '<span class="dialogue-item" onclick="alert(1)">apple</span>',
    '<span class="dialogue-item" style="color:red">apple</span>',
    '<span class="dialogue-item" href="https://example.com">apple</span>',
    '<a href="https://example.com">apple</a>',
    '<img src="https://example.com/a.png">',
    '<span class="dialogue-item unknown-style">apple</span>',
    '<span class="dialogue-glyph">apple</span>',
    '<span class="dialogue&#45;item">apple</span>',
    '<span class="">apple</span>',
    '<span>apple</span>',
    '<span class=dialogue-item>apple</span>',
    '<br>',
    '<svg><span class="dialogue-item">apple</span></svg>',
    '<!-- hidden markup -->apple',
    '<span class="dialogue-item">apple',
    'apple</span>',
    '<span class="dialogue-item">apple</span></span>',
    '<span class="dialogue-item" class="dialogue-wave">apple</span>',
    '<span class="dialogue-item"/>apple'
])('dialogue rejects unsupported or malformed markup without stripping it: %s', value => {
    expect(() => validateDialogue(value, 'Start dialogue')).toThrow('allows only balanced');
});

test.each(['{{process.exit()}}', '{{constructor}}', '{{remaining + 1}}', '{{ remaining }}', '<span class="dialogue-item">{{done}} {{global.process}}</span>'])('dialogue rejects template expressions: %s', value => {
    expect(() => validateDialogue(value, 'Progress dialogue')).toThrow('supports only');
});

test('dialogue validates nonempty visible content and the existing size bound', () => {
    expect(() => validateDialogue('<span class="dialogue-item"></span>', 'Start dialogue')).toThrow('needs some dialogue text');
    expect(() => validateDialogue('a'.repeat(2001), 'Start dialogue')).toThrow('2000');
});
