(() => {
    'use strict';
    async function encode(file) {
        if (!file || file.size > 10 * 1024 * 1024) throw new Error('Choose an audio file smaller than 10 MB.');
        const Context = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!Context) throw new Error('This browser cannot import audio. Try a browser with Web Audio support.');
        let decoded;
        try {decoded = await new Context(1, 1, 22050).decodeAudioData(await file.arrayBuffer());}
        catch (_) {throw new Error('This audio format could not be read. Try WAV, MP3 or Ogg.');}
        if (!Number.isFinite(decoded.duration) || decoded.duration < .1 || decoded.duration > 30) throw new Error('Choose a clip between 0.1 and 30 seconds long. Trim longer recordings first.');
        // Use one consistent mono format: every source can pan predictably in every supported browser.
        const context = new Context(1, Math.ceil(decoded.duration * 22050), 22050);
        const source = context.createBufferSource(); source.buffer = decoded; source.connect(context.destination); source.start();
        const rendered = await context.startRendering(), samples = rendered.getChannelData(0);
        const wav = new ArrayBuffer(44 + samples.length * 2), view = new DataView(wav);
        const text = (offset, value) => {for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));};
        text(0, 'RIFF'); view.setUint32(4, wav.byteLength - 8, true); text(8, 'WAVEfmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
        view.setUint32(24, 22050, true); view.setUint32(28, 44100, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        text(36, 'data'); view.setUint32(40, samples.length * 2, true);
        for (let i = 0; i < samples.length; i++) {const value = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);}
        const bytes = new Uint8Array(wav); let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return {name: file.name, audio: btoa(binary)};
    }
    window.AmbientUpload = {encode};
})();
