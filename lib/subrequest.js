
var http = require('http')
var https = require('https')
var urlLib = require('url')
var error = require('quiver-error').error
var nodeStream = require('quiver-node-stream')
var streamChannel = require('quiver-stream-channel')
var pipeStream = require('quiver-pipe-stream').pipeStream
var safeCallback = require('quiver-safe-callback').safeCallback
var streamConvert = require('quiver-stream-convert')

var createNodeRequest = function(protocol) {
  return protocol == 'https' ? https.request : http.request
}

var copyFields = function(fields, source, dest) {
  dest = dest || { }

  fields.forEach(function(field) {
    dest[field] = source[field]
  })

  return dest
}

var nodeResponseToResponseHead = function(response) {
  return copyFields(['statusCode', 'headers', 'httpVersion'], response)
}

var subrequestToResponse = function(requestHead, requestBody, callback) {
  callback = safeCallback(callback)

  var request = http.request(requestHead)
  var requestWriteStream = nodeStream.createNodeWriteStreamAdapter(request)
  pipeStream(requestBody, requestWriteStream)

  request.on('response', function(response) {
    if(callback.callbackCalled()) return

    var responseHead = nodeResponseToResponseHead(response)
    var responseBody = nodeStream.createNodeReadStreamAdapter(response)
    callback(null, responseHead, responseBody)
  })

  request.on('error', function(err) {
    if(callback.callbackCalled()) return
    callback(error(500, 'subrequest error', err))
  })
}

var subrequestToStream = function(requestHead, requestBody, callback) {
  subrequestToResponse(requestHead, requestBody, function(err, responseHead, responseBody) {
    if(err) return callback(err)

    var statusCode = responseHead.statusCode
    if(statusCode != 200) return callback(error(statusCode, 'subrequest error'))

    return callback(null, responseBody)
  })
}

var getRequestToStream = function(url, callback) {
  var requestHead = urlLib.parse(url)
  return subrequestToStream(requestHead, streamChannel.createEmptyReadStream(), callback)
}

var trivialHttpSubrequestHandler = function(requestHead, requestStreamable, callback) {
  subrequestToResponse(requestHead, requestStreamable.toStream(), 
    function(err, responseHead, responseStream) {
      if(err) return callback(err)

      var responseStreamable = streamConvert.streamToStreamable(responseStream)
      callback(null, responseHead, responseStreamable)
    })
}

module.exports = {
  subrequestToResponse: subrequestToResponse,
  subrequestToStream: subrequestToStream,
  getRequestToStream: getRequestToStream,
  trivialHttpSubrequestHandler: trivialHttpSubrequestHandler
}
