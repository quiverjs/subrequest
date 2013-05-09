
var http = require('http')
var should = require('should')
var subrequest = require('../lib/subrequest')
var nodeStream = require('quiver-node-stream')
var streamChannel = require('quiver-stream-channel')
var streamConvert = require('quiver-stream-convert')

var testPort = 8005

var createMockServer = function(port) {
  var handler = function(request, response) {
    var method = request.method
    var path = request.url

    var writeResponse = function(content) {
      response.writeHead(200)
      response.write(content)
      response.end()
    }

    if(method == 'GET') {
      path.should.equal('/get-path')
      writeResponse('get response')
    } else if(method == 'POST') {
      path.should.equal('/post-path')
      var requestStream = nodeStream.createNodeReadStreamAdapter(request)
      streamConvert.streamToText(requestStream, function(err, requestText) {
        should.not.exist(err)
        requestText.should.equal('post content')

        writeResponse('post response')
      })
    } else {
      path.should.equal('/other-path')
      writeResponse('other response')
    }
  }

  var server = http.createServer(handler)
  server.listen(port)
}

createMockServer(testPort)

describe('test subrequest', function() {
  it('test post request', function(callback) {
    var requestHead = {
      host: 'localhost',
      port: testPort,
      method: 'POST',
      path: '/post-path'
    }

    var requestBody = streamConvert.textToStream('post content')
    subrequest.subrequestToStream(requestHead, requestBody, function(err, responseStream) {
      should.not.exist(err)

      streamConvert.streamToText(responseStream, function(err, responseText) {
        should.not.exist(err)

        responseText.should.equal('post response')
        callback()
      })
    })
  })

  it('test get request', function(callback) {
    var url = 'http://localhost:8005/get-path'
    subrequest.getRequestToStream(url, function(err, responseStream) {
      should.not.exist(err)

      streamConvert.streamToText(responseStream, function(err, responseText) {
        should.not.exist(err)

        responseText.should.equal('get response')
        callback()
      })
    })
  })

  it('test http handler', function(callback) {
    var requestHead = {
      host: 'localhost',
      port: testPort,
      method: 'POST',
      path: '/post-path'
    }

    var requestBody = streamConvert.textToStreamable('post content')
    subrequest.trivialHttpSubrequestHandler(requestHead, requestBody, 
      function(err, responseHead, responseStreamable) {
        should.not.exist(err)

        streamConvert.streamableToText(responseStreamable, function(err, responseText) {
          should.not.exist(err)

          responseText.should.equal('post response')
          callback()
        })
      })
  })
})