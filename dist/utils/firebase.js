"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generatePushID = exports.$remove = exports.$update = exports.$fetch = exports.db = void 0;

var firebase = _interopRequireWildcard(require("firebase-admin"));

const db = firebase.database().ref('/');
exports.db = db;

const $fetch = async (path = '') => {
  const querySnapshot = await db.child(path).once('value');
  return querySnapshot.exists() ? querySnapshot.val() : {};
};

exports.$fetch = $fetch;

const $update = async (path = '', data) => {
  await db.child(path).update(data);
  return data;
};

exports.$update = $update;

const $remove = async (path = '', data) => {
  await db.child(path).remove();
  return data;
};

exports.$remove = $remove;

const generatePushID = timestamp => {
  const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  let lastPushTime = 0;
  let lastRandChars = [];
  return (() => {
    let now = timestamp;
    let duplicateTime = now === lastPushTime;
    lastPushTime = now;
    let timeStampChars = new Array(8);

    for (var i = 7; i >= 0; i--) {
      timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
      now = Math.floor(now / 64);
    }

    if (now !== 0) throw new Error('We should have converted the entire timestamp.');
    let id = timeStampChars.join('');

    if (!duplicateTime) {
      for (i = 0; i < 12; i++) {
        lastRandChars[i] = Math.floor(Math.random() * 64);
      }
    } else {
      for (i = 11; i >= 0 && lastRandChars[i] === 63; i--) {
        lastRandChars[i] = 0;
      }

      lastRandChars[i]++;
    }

    for (i = 0; i < 12; i++) {
      id += PUSH_CHARS.charAt(lastRandChars[i]);
    }

    if (id.length !== 20) throw new Error('Length should be 20.');
    return id;
  })();
};

exports.generatePushID = generatePushID;