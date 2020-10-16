const {
  AssertionError
} = require('assert')
var assert = require('assert')
var msgpack = require('msgpack')
var IFWorker = require('../index.js')

describe('MessageTransportTest', () => {
  endpoint = 'tcp://127.0.0.1:224'
  it('testConnectionOfSession', async() => {
    await IFWorker(endpoint)
  })

  it('testInvokeOtherClient', async() => {

    class Target {
      constructor(endpoint) {
        this.notFunction = 100
      }
      v8() {
        return "V8 great!"
      }
      v9() {
        throw Error("V9 not good.")
      }
    }

    let serviceName = Math.random().toString(36).slice(-8)
    let worker = await IFWorker(endpoint, new Target(), serviceName)
    let checker = await IFWorker(endpoint)
    let benzChecker = checker[serviceName]
    v8r = await benzChecker.v8()
    assert.strictEqual(v8r, "V8 great!")
    try {
      await benzChecker.v9()
      assert.fail("No exception raised.")
    } catch (e) {
      if (e instanceof AssertionError) throw e
      assert.strictEqual(e.toString(), "Error: V9 not good.")
    }
    try {
      await benzChecker.v11()
      assert.fail("No exception raised.")
    } catch (e) {
      if (e instanceof AssertionError) throw e
      assert.strictEqual(e.toString(), "Function [v11] not available.")
    }
  })

  it('testServiceDuplicated', async() => {
    let serviceName = Math.random().toString(36).slice(-8)
    await IFWorker(endpoint, 'W1', serviceName)
    try {
      await IFWorker(endpoint, 'W1', serviceName)
      assert.fail("No exception raised.")
    } catch (e) {
      if (e instanceof AssertionError) throw e
      assert.strictEqual(e.toString(), "Service name [" + serviceName + "] occupied.")
    }
  })



  it('testTimeCostInvocation', async() => {
    class WorkerObject {
      async wait(time) {
        await new Promise(r => setTimeout(r, time));
        return 'w'
      }

      //             async def popQueue(self):
      //                 g = await queue.get()
      //                 return g

      returnImmediatly() {
        return 'rim'
      }
    }

    let serviceName = Math.random().toString(36).slice(-8)
    await IFWorker(endpoint, new WorkerObject(), serviceName)
    client = await IFWorker(endpoint)
    let wait = client[serviceName].wait(1000)
    startTime = new Date().getTime()
    assert.strictEqual(await client[serviceName].returnImmediatly(), 'rim')
    stopTime = new Date().getTime()
    assert.strictEqual(stopTime - startTime < 500, true)
    assert.strictEqual(await wait, 'w')
    assert.strictEqual(new Date().getTime() - startTime > 500, true)
  })
})