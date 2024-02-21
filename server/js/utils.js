
var Utils = {},
    sanitizer = require('sanitizer'),
    Types = require("../../shared/js/gametypes");

module.exports = Utils;
const bad_words = require("profane-words");

Utils.sanitize = function(string) {
    // Strip unsafe tags, then escape as html entities.
    let injectSafe = sanitizer.escape(sanitizer.sanitize(string));
    // Replace bad words with asterisks
    const badWordsLength = bad_words.length;
    for (let i = 0; i < badWordsLength; i++) {
        injectSafe = injectSafe.replace(new RegExp("\\b"+bad_words[i]+"\\b", "ig"), "*".repeat(bad_words[i].length));
    }
    return injectSafe;
};

Utils.random = function(range) {
    return Math.floor(Math.random() * range);
};

Utils.randomRange = function(min, max) {
    return min + (Math.random() * (max - min));
};

Utils.randomInt = function(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
};

Utils.clamp = function(min, max, value) {
    if(value < min) {
        return min;
    } else if(value > max) {
        return max;
    } else {
        return value;
    }
};

Utils.randomOrientation = function() {
    var o, r = Utils.random(4);
    
    if(r === 0)
        o = Types.Orientations.LEFT;
    if(r === 1)
        o = Types.Orientations.RIGHT;
    if(r === 2)
        o = Types.Orientations.UP;
    if(r === 3)
        o = Types.Orientations.DOWN;
    
    return o;
};

Utils.Mixin = function(target, source) {
  if (source) {
    for (var key, keys = Object.keys(source), l = keys.length; l--; ) {
      key = keys[l];

      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

Utils.distanceTo = function(x, y, x2, y2) {
    var distX = Math.abs(x - x2);
    var distY = Math.abs(y - y2);

    return (distX > distY) ? distX : distY;
};

Utils.shuffleArray = function(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

Utils.shuffleAndGetRandom = function(arrayOrValue) {
    const shuffledArray = Array.isArray(arrayOrValue) ? Utils.shuffleArray([...arrayOrValue]) : arrayOrValue;
    return Array.isArray(shuffledArray) ? shuffledArray[Math.floor(Math.random() * shuffledArray.length)] : shuffledArray;
};

