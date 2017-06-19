/* eslint max-nested-callbacks: ['error', 5] */

/** @module test/index */

'use strict';

var XMLHttpRequest = require('..');
var XMLHttpRequestEventTarget = require('../lib/node-xhr-event-target');
var assume = require('assume');
var sinon = require('sinon');
var assumeSinon = require('assume-sinon');
var nock = require('nock');

assume.use(assumeSinon);

var req;

/**
 * Describes XMLHttpRequest events.
 *
 * @private
 */
function describeXHREvents() {
  describe('events', function () {
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
      var errInterceptor;
      var errMessage = 'Test error message';
      var errCode = 'TEST_ERROR';

      beforeEach(function () {
        errInterceptor = nock('http://example.com')
          .get('/error')
          .replyWithError({ message: errMessage, code: errCode });
      });

      it('is fired if the request encountered an error', function (done) {
        var spy = sinon.spy(function () {
          assume(spy).is.called(1);
          errInterceptor.done();
          done();
        });

        req.onerror = spy;
        req.open('GET', 'http://example.com/error');
        req.send();
      });

      it('uses original error if uncaught at instance level', function (done) {
        var originalHandler;
        var spy = sinon.spy(function (err) {
          process.on('uncaughtException', originalHandler);
          assume(spy).is.called(1);
          assume(err.message).equals(errMessage);
          assume(err.code).equals(errCode);
          errInterceptor.done();
          done();
        });

        // Remove mocha's process-level error handler and install our spy
        assume(process.listeners('uncaughtException').length).equals(1);
        originalHandler = process.listeners('uncaughtException')[0];
        process.removeListener('uncaughtException', originalHandler);
        process.once('uncaughtException', spy);

        req.open('GET', 'http://example.com/error');
        req.send();
      });
    });

    describe('`timeout` event', function () {
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

    describe('`load` event', function () {
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

  });
}

/**
 * Describes XMLHttpRequest properties.
 */
function describeXHRProps() {
  describe('read-only properties', function () {
    [
      'UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE',
      'readyState', 'status', 'statusText', 'response', 'responseText'
    ].forEach(function (prop) {
      it('#' + prop, function () {
        assume(function () {
          req[prop] = null;
        }).throws(TypeError);
      });
    });
  });

  describe('properties', function () {
    [
      'UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'
    ].forEach(function (state, value) {
      describe('#' + state, function () {
        it('is defined with value ' + value, function () {
          assume(req[state]).equals(value);
        });
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

    describe('#status', function () {
      var txtInterceptor;

      beforeEach(function () {
        txtInterceptor = nock('http://example.com')
          .get('/test.txt')
          .reply(204);
      });

      it('is 0 until response headers are received', function (done) {
        var spy = sinon.spy(function () {
          assume(spy.callCount).is.at.most(4);
          if (req.readyState < req.HEADERS_RECEIVED) {
            assume(req.status).equals(0);
          }
          if (req.readyState === req.DONE) {
            txtInterceptor.done();
            done();
            return;
          }
        });

        req.onreadystatechange = spy;
        req.open('GET', 'http://example.com/test.txt');
        req.send();
      });

      it('equals status code once headers are received', function (done) {
        var spy = sinon.spy(function () {
          assume(spy.callCount).is.at.most(4);
          if (req.readyState >= req.HEADERS_RECEIVED) {
            assume(req.status).equals(204);
          }
          if (req.readyState === req.DONE) {
            txtInterceptor.done();
            done();
            return;
          }
        });

        req.onreadystatechange = spy;
        req.open('GET', 'http://example.com/test.txt');
        req.send();
      });
    });

    describe('#withCredentials', function () {
      it('defaults to false', function () {
        assume(req.withCredentials).is.false();
      });
    });
  });
}

describe('XMLHttpRequest', function () {
  before(function () {
    nock.disableNetConnect();
  });

  after(function () {
    nock.enableNetConnect();
  });

  beforeEach(function () {
    req = new XMLHttpRequest();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  it('.prototype inherits XMLHttpRequestEventTarget', function () {
    assume(XMLHttpRequest.prototype).inherits(XMLHttpRequestEventTarget);
  });

  describeXHREvents();

  describeXHRProps();

  describe('text request', function () {
    ['http:', 'https:'].forEach(function (protocol) {
      it('works with protocol `' + protocol + '`', function (done) {
        var txtResponse = 'This is a test response.';
        var txtInterceptor = nock(protocol + '//example.com')
          .get('/test.txt')
          .reply(200, txtResponse);

        assume(req.responseType).equals('');
        req.open('GET', protocol + '//example.com/test.txt');

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

    it('does not work with other protocols', function () {
      req.open('GET', 'test-protocol://example.com/test.txt');

      assume(function () {
        req.send();
      }).throws(/unsupported protocol/i);
    });
  });
});

