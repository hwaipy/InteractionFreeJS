var assert = require('assert')
var msgpack = require('msgpack')
var print = require('../index.js')
describe('MsgpackBasic', function () {
  it('try some basic feature', function () {
    assert.equal([1, 2, 3].indexOf(2), 1)
    print(123)
  })
})