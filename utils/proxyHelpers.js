'use strict';

const isString = (element) => {
  if (!element) return false;
  return typeof element === 'string';
};

const isArray = (element) => {
  if (!element) return false;
  return Array.isArray(element);
};

const isObject = (element) => {
  if (!element) return false;
  return typeof element === 'object';
};
const isIterable = (element) => {
  if (!element) return false;
  return isArray(element) || isObject(element);
};

const forEachIn = (iterable, functionRef) => {
  Object.keys(iterable).forEach((key) => {
    functionRef(key, iterable[key]);
  });
};

const iterate = (object, parent, vars = {}) => {
  if (!isIterable(object)) return object;
  const { SFCC_ORIGIN, PROXY_ORIGIN } = vars;
  forEachIn(object, (key, value) => {
    // replace any urls to the SFCC origin with the proxy origin
    if (isString(value) && isString(key) && KEYS_TO_REWRITE.indexOf(String(key).toLowerCase()) > -1) {
      console.log(`Rewriting JSON value => ${value} for key: ${key}`);
      object[key] = value.replace(SFCC_ORIGIN, PROXY_ORIGIN);
      console.log(`new value => ${object[key]}`);
    }
    iterate(value, parent, vars);
  });
  return object;
};

module.exports = {
  iterate
};

// use all lowercase keys
const KEYS_TO_REWRITE = [
  'redirecturl'
];
