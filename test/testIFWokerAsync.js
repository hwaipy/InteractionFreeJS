var assert = require('assert')
var msgpack = require('msgpack')
var IFWorker = require('../index.js')

describe('MsgpackBasic1', () => {
  it('try some basic feature', () => {
    assert.equal(1, 1)
    console.log(IFWorker)
    IFWorker('tcp://127.0.0.1:224')
  })
})


// __author__ = 'Hwaipy'

// import unittest
// import time
// from interactionfreepy import IFBroker
// from interactionfreepy import IFWorker
// from interactionfreepy import Message, IFException
// from tornado.ioloop import IOLoop
// import threading
// from asyncio import Queue


// class AsyncIFWorkerTest(unittest.TestCase):
//     testPort = 20112
//     brokerAddress = 'tcp://127.0.0.1:{}'.format(testPort)

//     @classmethod
//     def setUpClass(cls):
//         broker = IFBroker(AsyncIFWorkerTest.brokerAddress)

//     def setUp(self):
//         pass

//     def testRemoteInvokeAndAsync(self):
//         worker1 = IFWorker(AsyncIFWorkerTest.brokerAddress)
//         invoker1 = worker1.asyncInvoker()

//         async def test():
//             self.assertEqual(await invoker1.protocol(), 'IF1')
//             try:
//                 await invoker1.protocol2()
//                 self.fail('No exception raised.')
//             except IFException as e:
//                 self.assertEqual(e.__str__(), 'Function [protocol2] not available.')

//         IOLoop.current().add_callback(test)

//     def tearDown(self):
//         pass

//     @classmethod
//     def tearDownClass(cls):
//         time.sleep(1)
//         # IOLoop.current().stop()


// if __name__ == '__main__':
//     unittest.main()
