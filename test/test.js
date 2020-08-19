var assert = require('assert')
var msgpack = require('msgpack')
var IFWorker = require('../index.js')

describe('MsgpackBasic', () => {
  it('try some basic feature', () => {
    assert.equal(1, 1)
    console.log(IFWorker)
    IFWorker('tcp://127.0.0.1:224')
  })
})