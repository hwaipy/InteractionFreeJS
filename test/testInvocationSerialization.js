var assert = require('assert')
var msgpack = require('msgpack')
var IFWorker = require('../index.js')

describe('InvocationSerializationTest', () => {
  let mapIn = {
    "keyString": "value1",
    "keyInt": 123,
    "keySignedLong": Math.pow(2, 63),
    "keyBooleanFalse": false,
    "keyBooleanTrue": true,
    "keyByteArray": Buffer.from(new Uint8Array([1, 2, 2, 2, 2, 1, 1, 2, 2, 1, 1, 4, 5, 0, 4, 4, -1])),
    "keyIntArray": [3, 526255, 1321, 4, -1],
    "keyNull": null,
    "keyDouble": 1.242,
    "keyDouble2": -12.2323e-100
  }
  map = {
    "keyMap": mapIn
  }

  it('testMapPackAndUnpack', () => {
    let bytes = msgpack.pack(map)
    let unpacked = msgpack.unpack(bytes)
    assert.deepStrictEqual(unpacked, map)
  })

  it('testOverDeepth', () => {
    let m = {
      "a": "b"
    }
    for (let i = 0; i < 30; i++) {
      m = {
        'a': m
      }
    }
    let bytes = msgpack.pack(m)
    let unpacked = msgpack.unpack(bytes)
    assert.deepStrictEqual(unpacked, m)
  })
})