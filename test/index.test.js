'use strict';

var XMLHttpRequest = require('..');
var assume = require('assume');
var nock = require('nock');
var describeEventTarget = require('./describe-event-target');

describeEventTarget(XMLHttpRequest, [
  'readystatechange', 'abort', 'error', 'timeout', 'load'
]);

describe('XMLHttpRequest', function () {
  var req;

  before(function () {
    nock.disableNetConnect();
  });

  after(function () {
    nock.enableNetConnect();
  });

  beforeEach(function () {
    req = new XMLHttpRequest();
  });

  describe('read-only properties', function () {
    [
      'UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE',
      'readyState', 'status', 'statusText', 'response', 'responseText'
    ].forEach(function (prop) {
      it('#' + prop, function () {
        function write() {
          req[prop] = null;
        }

        assume(write).throws(TypeError);
      });
    });
  });

  [
    'UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'
  ].forEach(function (state, value) {
    describe('#' + state, function () {
      it('is defined with value ' + value, function () {
        assume(req[state]).equals(value);
      });
    });
  });

  describe('#withCredentials', function () {
    it('defaults to false', function () {
      assume(req.withCredentials).is.false();
    });
  });

  describe('text requests', function () {
    var txtResponse = 'This is a test response.';
    var txtInterceptor;

    beforeEach(function () {
      txtInterceptor = nock('http://example.com')
        .get('/test.txt')
        .reply(200, txtResponse);

      assume(req.responseType).equals('');
      req.open('GET', 'http://example.com/test.txt');
    });

    afterEach(function () {
      nock.cleanAll();
    });

    it('successfully completes', function (done) {
      req.addEventListener('load', function () {
        assume(req.readyState).equals(req.DONE);
        assume(req.response).equals(txtResponse);
        assume(req.responseText).equals(txtResponse);
        assume(req.status).equals(200);
        txtInterceptor.done();
        done();
      });
      req.send();
    });
  });
});


