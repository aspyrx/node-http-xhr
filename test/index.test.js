/* eslint max-nested-callbacks: ['error', 5] */

'use strict';

var XMLHttpRequest = require('..');
var assume = require('assume');
var sinon = require('sinon');
var assumeSinon = require('assume-sinon');
var nock = require('nock');
var describeEventTarget = require('./describe-event-target');

assume.use(assumeSinon);

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

  describe('`readystatechange` event', function () {
    it('is fired whenever the ready state changes', function (done) {
      var txtInterceptor = nock('http://example.com')
        .get('/test.txt')
        .reply(200, 'This is a test response.');

      var spy = sinon.spy(function () {
        assume(spy.callCount).is.at.most(4);
        if (spy.callCount === 1) {
          assume(req.readyState).equals(req.OPENED);
          req.send();
          return;
        }
        if (spy.callCount === 2) {
          assume(req.readyState).equals(req.HEADERS_RECEIVED);
          return;
        }
        if (spy.callCount === 3) {
          assume(req.readyState).equals(req.LOADING);
          return;
        }

        assume(req.readyState).equals(req.DONE);
        txtInterceptor.done();
        done();
      });

      assume(req.readyState).equals(req.UNSENT);
      req.onreadystatechange = spy;
      req.open('GET', 'http://example.com/test.txt');
    });
  });

  describe('`abort` event', function () {
    it('is fired if the request was aborted', function (done) {
      nock('http://example.com')
        .get('/empty')
        .reply(204);

      var spy = sinon.spy(function () {
        assume(spy).is.called(1);
        done();
      });

      req.onabort = spy;
      req.open('GET', 'http://example.com/empty');
      req.send();
      req.abort();
    });
  });

  describe('`error` event', function () {
    it('is fired if the request encountered an error', function (done) {
      var errInterceptor = nock('http://example.com')
        .get('/error')
        .replyWithError('Test error message');

      var spy = sinon.spy(function () {
        assume(spy).is.called(1);
        errInterceptor.done();
        done();
      });

      req.onerror = spy;
      req.open('GET', 'http://example.com/error');
      req.send();
    });
  });

  describe('`timeout` events', function () {
    it('is fired if the request timed out', function (done) {
      var timeoutInterceptor = nock('http://example.com')
        .get('/timeout')
        .socketDelay(1000)
        .reply(204);

      var spy = sinon.spy(function () {
        assume(spy).is.called(1);
        timeoutInterceptor.done();
        done();
      });

      req.ontimeout = spy;
      req.timeout = 100;
      req.open('GET', 'http://example.com/timeout');
      req.send();
    });
  });

  describe('`load` events', function () {
    it('is fired once the request loads', function (done) {
      var txtResponse = 'This is a test response.';
      var txtInterceptor = nock('http://example.com')
        .get('/test.txt')
        .reply(200, txtResponse);

      var spy = sinon.spy(function () {
        assume(spy).is.called(1);
        assume(req.readyState).equals(req.DONE);
        assume(req.responseText).equals(txtResponse);
        txtInterceptor.done();
        done();
      });

      req.onload = spy;
      req.open('GET', 'http://example.com/test.txt');
      req.send();
    });
  });

  describe('#readyState', function () {
    it('is initially `UNSENT`', function () {
      assume(req.readyState).equals(req.UNSENT);
    });

    it('changes to `OPENED` once the request is opened', function (done) {
      var spy = sinon.spy(function () {
        assume(spy).is.called(1);
        assume(req.readyState).equals(req.OPENED);
        done();
      });

      req.onreadystatechange = spy;
      req.open('GET', 'http://example.com/test.txt');
    });

    it('changes to `HEADERS_RECEIVED` once headers are received', function (done) {
      var txtHeaders = {
        'Content-Type': 'text/plain'
      };
      nock('http://example.com')
        .get('/test.txt')
        .reply(200, 'This is a test response.', txtHeaders);

      var spy = sinon.spy(function () {
        assume(spy.callCount).is.at.most(2);
        if (spy.callCount === 1) {
          assume(req.readyState).equals(req.OPENED);
          req.send();
          return;
        }

        assume(req.readyState).equals(req.HEADERS_RECEIVED);
        Object.keys(txtHeaders).forEach(function (key) {
          assume(req.getResponseHeader(key)).equals(txtHeaders[key]);
        });

        done();
      });

      req.onreadystatechange = spy;
      req.open('GET', 'http://example.com/test.txt');
    });

    it('changes to `LOADING` once response body is loading', function (done) {
      var txtResponse = 'This is a test response.';
      nock('http://example.com')
        .get('/test.txt')
        .reply(200, txtResponse);

      var spy = sinon.spy(function () {
        assume(spy.callCount).is.at.most(3);
        if (spy.callCount === 1) {
          assume(req.readyState).equals(req.OPENED);
          req.send();
          return;
        }
        if (spy.callCount === 2) {
          assume(req.readyState).equals(req.HEADERS_RECEIVED);
          return;
        }

        assume(req.readyState).equals(req.LOADING);
        assume(txtResponse).startsWith(req.responseText);

        done();
      });

      req.onreadystatechange = spy;
      req.open('GET', 'http://example.com/test.txt');
    });

    it('changes to `DONE` once response is fully loaded', function (done) {
      var txtResponse = 'This is a test response.';
      var txtInterceptor = nock('http://example.com')
        .get('/test.txt')
        .reply(200, txtResponse);

      var spy = sinon.spy(function () {
        assume(spy.callCount).is.at.most(4);
        if (spy.callCount === 1) {
          assume(req.readyState).equals(req.OPENED);
          req.send();
          return;
        }
        if (spy.callCount === 2) {
          assume(req.readyState).equals(req.HEADERS_RECEIVED);
          return;
        }
        if (spy.callCount === 3) {
          assume(req.readyState).equals(req.LOADING);
          return;
        }

        assume(req.readyState).equals(req.DONE);
        assume(txtResponse).equals(req.responseText);

        txtInterceptor.done();
        done();
      });

      req.onreadystatechange = spy;
      req.open('GET', 'http://example.com/test.txt');
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


