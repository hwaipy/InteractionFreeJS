var zmq = require("zeromq")
var msgpack = require("msgpack")

class IFWorkerCore {
  constructor(endpoint) {
    this.messageIDs = 0
    this.endpoint = endpoint
    this.dealer = new zmq.socket('dealer')
    this.dealer.connect(this.endpoint)
    this.dealer.on('message', (this._onMessage).bind(this))
    this.waitingList = new Map()
    this.timeout = 10000
    setTimeout((this._timeoutLoop).bind(this), 0)
    this.running = true
  }

  async request(target, functionName, args, kwargs) {
    let content = {
      Type: "Request",
      Function: functionName,
      Arguments: args,
      KeyworkArguments: kwargs
    }
    let contentBuffer = msgpack.pack(content)
    let messageID = "" + (this.messageIDs++);
    let message = ["", "IF1", messageID]
    if (target == "") {
      message.push("Broker")
      message.push("")
    } else {
      message.push("Service")
      message.push(target)
    }
    message.push("Msgpack")
    message.push(contentBuffer)

    let waitingList = this.waitingList
    var promise = new Promise(function (resolve, reject) {
      waitingList.set(messageID, [new Date().getTime(), resolve, reject])
    })
    this.dealer.send(message)
    return promise
  }

  _onResponse(content) {
    var responseID = content["ResponseID"];
    var result = content["Result"]
    var error = content["Error"]
    if (this.waitingList.has(responseID)) {
      var promise = this.waitingList.get(responseID)
      this.waitingList.delete(responseID)
      if (error) {
        promise[2](error)
      } else {
        promise[1](result)
      }
    }
  }

  _onRequest(content) {
    console.log("onRequest not implemented.");
  }

  _onMessage() {
    var message = Array.apply(null, arguments);
    if (message.length == 6) {
      var frame2Protocol = message[1]
      // var frame3ID = message[2]
      // var frame4From = message[3]
      var frame5Ser = message[4]
      var frame6Content = message[5]
      if (frame2Protocol != "IF1") {
        console.log("Invalid Protocol: " + frame2Protocol + ".");
      } else if (frame5Ser != "Msgpack") {
        console.log("Invalid serialization: " + frame5Ser + ".");
      } else {
        var content = msgpack.unpack(frame6Content)
        var messageType = content["Type"]
        if (messageType == "Response") {
          this._onResponse(content)
        } else if (messageType == "Request") {
          this._onRequest(content)
        } else {
          console.log("Bad message type: " + messageType + ".");
        }
      }
    } else {
      console.log("Invalid message that contains " + message.getSize() + " frames.");
    }
  }

  async _timeoutLoop() {
    function clearWaitingList(_this) {
      _this.waitingList.forEach((value, key) => {
        let timeElapsed = new Date().getTime() - value[0]
        if (timeElapsed >= _this.timeout) {
          _this._onResponse({
            'ResponseID': key,
            'Error': 'Timeout',
          })
        }
      })
    }
    while (this.running) {
      await new Promise(r => setTimeout(r, 1000));
      clearWaitingList(this)
    }
    clearWaitingList(this)
  }

  _close() {
    this.running = false
    this.dealer.close()
  }

  _createProxy(path) {
    let __this = this
    function remoteFunction() {
    }
    return new Proxy(remoteFunction, {
      get: function (target, key, receiver) {
        if (key == 'then' && path == '') return undefined
        if (key == 'close' && path == '') return (__this._close).bind(__this)
        return __this._createProxy(path + '.' + key)
      },
      apply: function (target, thisArg, args) {
        let items = path.split('.')
        if (items.length != 2 && items.length != 3) {
          throw new Error('[' + path + '] is not a valid remote function.');
        }
        return __this.request(items[items.length - 2], items[items.length - 1], args, {})
      },
    })
  }
}

async function IFWorker(endpoint) {
  let core = new IFWorkerCore(endpoint)
  return await core._createProxy('')
}
module.exports = IFWorker;

async function test() {
  worker = await IFWorker('tcp://127.0.0.1:224')
  console.log(await worker.heartbeat())
  await worker.close()
}

test()