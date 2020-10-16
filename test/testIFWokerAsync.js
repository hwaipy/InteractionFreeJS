const {
  AssertionError
} = require('assert')
var assert = require('assert')
var msgpack = require('msgpack')
var IFWorker = require('../index.js')

describe('AsyncIFWorkerTest', () => {
  it('testRemoteInvokeAndAsync', async() => {
    let worker1 = await IFWorker('tcp://127.0.0.1:224')
    assert.strictEqual(await worker1.protocol(), 'IF1')
    try {
      await invoker1.protocol2()
      assert.fail("No exception raised.")
    } catch (e) {
      if (e instanceof AssertionError) throw e
    }
  })
})