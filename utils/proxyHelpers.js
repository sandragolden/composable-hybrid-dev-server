'use strict';

const SFCC_ORIGIN = process.env.SFCC_ORIGIN;
const PROXY_ORIGIN = process.env.PROXY_ORIGIN;

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

const iterate = (object, parent) => {
  if (!isIterable(object)) return object;
  forEachIn(object, (key, value) => {
    // replace any urls to the SFCC origin with the proxy origin
    if (isString(value) && isString(key) && KEYS_TO_REWRITE.indexOf(String(key).toLowerCase()) > -1) {
      console.log(`Rewriting JSON value => ${value} for key: ${key}`);
      object[key] = value.replace(SFCC_ORIGIN, PROXY_ORIGIN);
    }
    iterate(value, parent);
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
