const Module = require('node:module');
const original = Module._load;
const mock = require('./mock-obsidian.cjs');
Module._load = function (id, ...args) {
  if (id === 'obsidian') return mock;
  return original.call(this, id, ...args);
};
