let zmq = require("zeromq")
let msgpack = require("msgpack")

class IFWorkerCore {
  constructor(endpoint, serviceObject, serviceName) {
    this.messageIDs = 0
    this.endpoint = endpoint
    this.serviceName = serviceName
    this.serviceObject = serviceObject
    this.dealer = new zmq.socket('dealer')
    this.dealer.connect(this.endpoint)
    this.dealer.on('message', (this._onMessage).bind(this))
    this.waitingList = new Map()
    this.timeout = 10000
    setTimeout((this._timeoutLoop).bind(this), 0)
    setTimeout((this._heartbeatLoop).bind(this), 0)
    this.running = true
  }

  async request(target, functionName, args, kwargs) {
    let content = {
      Type: "Request",
      Function: functionName,
      Arguments: args,
      KeywordArguments: kwargs
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
    let promise = new Promise(function(resolve, reject) {
      waitingList.set(messageID, [new Date().getTime(), resolve, reject])
    })
    this.dealer.send(message)
    return promise
  }

  _onResponse(content) {
    let responseID = content["ResponseID"];
    let result = content["Result"]
    let error = content["Error"]
    if (this.waitingList.has(responseID)) {
      let promise = this.waitingList.get(responseID)
      this.waitingList.delete(responseID)
      if (error) {
        promise[2](error)
      } else {
        promise[1](result)
      }
    }
  }

  async _onRequest(content, mid, sourcePoint) {
    let functionName = content['Function']
    let args = content['Arguments']
      // let kwargs = content['KeywordArguments']
    let func = this.serviceObject[functionName]
    let response = {
      Type: "Response",
      ResponseID: mid.toString(),
    }
    try {
      if (func) {
        response['Result'] = await Promise.resolve(func.apply(this.serviceObject, args))
      } else {
        response['Error'] = "Function [" + functionName + "] not available."
      }
    } catch (e) {
      response['Error'] = e.toString()
    }
    let responseBuffer = msgpack.pack(response)
    let messageID = "" + (this.messageIDs++);
    let message = ["", "IF1", messageID]
    message.push("Direct")
    message.push(sourcePoint)
    message.push("Msgpack")
    message.push(responseBuffer)
    this.dealer.send(message)
  }

  async _onMessage() {
    let message = Array.apply(null, arguments);
    if (message.length == 6) {
      let frame2Protocol = message[1]
      let frame3ID = message[2]
      let frame4From = message[3]
      let frame5Ser = message[4]
      let frame6Content = message[5]
      if (frame2Protocol != "IF1") {
        console.log("Invalid Protocol: " + frame2Protocol + ".");
      } else if (frame5Ser != "Msgpack") {
        console.log("Invalid serialization: " + frame5Ser + ".");
      } else {
        let content = msgpack.unpack(frame6Content)
        let messageType = content["Type"]
        if (messageType == "Response") {
          this._onResponse(content)
        } else if (messageType == "Request") {
          await this._onRequest(content, frame3ID, frame4From)
        } else {
          console.log("Bad message type: " + messageType + ".");
        }
      }
    } else {
      console.log("Invalid message that contains " + message.length + " frames.");
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

  async _heartbeatLoop() {
    async function doHeartbeat(_this) {
      let isReged = await _this.request('', 'heartbeat')
      if (!isReged && _this.serviceName) {
        await _this.request('', 'registerAsService', _this.serviceName)
      }
    }
    while (this.running) {
      await new Promise(r => setTimeout(r, 3000));
      doHeartbeat(this)
    }
  }

  _close() {
    this.running = false
    this.dealer.close()
  }

  _createProxy(path) {
    let __this = this

    function remoteFunction() {}
    return new Proxy(remoteFunction, {
      get: function(target, key, receiver) {
        if (key == 'then' && path == '') return undefined
        if (key == 'close' && path == '') return (__this._close).bind(__this)
        return __this._createProxy(path + '.' + key)
      },
      apply: function(target, thisArg, args) {
        let items = path.split('.')
        if (items.length != 2 && items.length != 3) {
          throw new Error('[' + path + '] is not a valid remote function.');
        }
        return __this.request(items[items.length - 2], items[items.length - 1], args, {})
      },
    })
  }
}

async function IFWorker(endpoint, serviceObject, serviceName) {
  let core = new IFWorkerCore(endpoint, serviceObject, serviceName)
  if (serviceName) {
    await core.request('', 'registerAsService', serviceName)
  }
  let p = await core._createProxy('')
  return p
}
module.exports = IFWorker;

async function test() {
  worker = await IFWorker('tcp://127.0.0.1:224', 'JSTest', 'JSTest')
    // console.log(await worker.heartbeat())
    // console.log(await worker.listServiceNames())
  await new Promise(r => setTimeout(r, 5000));
  await worker.close()
}

// test()