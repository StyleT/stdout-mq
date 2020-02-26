'use strict';

const fastSafeStringify = require('fast-safe-stringify');

/**
 * Serialize JSON
 * @param {Object} obj object to be serialized JSON
 * @returns {String} JSON representation of the object
 */
const tryStringify = (obj) => {
  try { return JSON.stringify(obj); } catch (_) { /* do nothing */ }
  return fastSafeStringify(obj);
};

/**
 * Validate Mq Settings
 * @param {String} queue queue for distributing messages
 * @returns {Boolean} if validation fails it will throw an error
 */
const validateMqSettings = ({ queue = null }) => {
  if (!queue) {
    throw Error('You must provide queue!');
  }
  return true;
};

/**
 * @see Original source code was taken from {@link https://github.com/prototypejs/prototype/blob/5fddd3e/src/prototype/lang/string.js#L702}
 * @param {String} str String which should be checked
 * @returns {Boolean} When String has JSON format it returns true in another way - false
 */
function isJSON(str) {
  let strToCheck = str;

  if (/^\s*$/.test(strToCheck)) return false;

  strToCheck = strToCheck.replace(/\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
  strToCheck = strToCheck.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g, ']');
  strToCheck = strToCheck.replace(/(?:^|:|,)(?:\s*\[)+/g, '');

  return (/^[\],:{}\s]*$/).test(strToCheck);
}

module.exports = {
  tryStringify,
  validateMqSettings,
  isJSON,
};
