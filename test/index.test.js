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
        var txtScope = nock('http://example.com')
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
          txtScope.done();
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
      var errScope;
      var errMessage = 'Test error message';
      var errCode = 'TEST_ERROR';

      beforeEach(function () {
        errScope = nock('http://example.com')
          .get('/error')
          .replyWithError({ message: errMessage, code: errCode });
      });

      it('is fired if the request encountered an error', function (done) {
        var spy = sinon.spy(function () {
          assume(spy).is.called(1);
          errScope.done();
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
          errScope.done();
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
        var timeoutScope = nock('http://example.com')
          .get('/timeout')
          .socketDelay(1000)
          .reply(204);

        var spy = sinon.spy(function () {
          assume(spy).is.called(1);
          timeoutScope.done();
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
        var txtScope = nock('http://example.com')
          .get('/test.txt')
          .reply(200, txtResponse);

        var spy = sinon.spy(function () {
          assume(spy).is.called(1);
          assume(req.readyState).equals(req.DONE);
          assume(req.responseText).equals(txtResponse);
          txtScope.done();
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
        var txtScope = nock('http://example.com')
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

          txtScope.done();
          done();
        });

        req.onreadystatechange = spy;
        req.open('GET', 'http://example.com/test.txt');
      });
    });

    describe('#status', function () {
      var emptyScope;

      beforeEach(function () {
        emptyScope = nock('http://example.com')
          .get('/empty')
          .reply(204);
      });

      it('is 0 until response headers are received', function (done) {
        var spy = sinon.spy(function () {
          assume(spy.callCount).is.at.most(4);
          if (req.readyState < req.HEADERS_RECEIVED) {
            assume(req.status).equals(0);
          }
          if (req.readyState === req.DONE) {
            emptyScope.done();
            done();
            return;
          }
        });

        req.onreadystatechange = spy;
        req.open('GET', 'http://example.com/empty');
        req.send();
      });

      it('equals status code once headers are received', function (done) {
        var spy = sinon.spy(function () {
          assume(spy.callCount).is.at.most(4);
          if (req.readyState >= req.HEADERS_RECEIVED) {
            assume(req.status).equals(204);
          }
          if (req.readyState === req.DONE) {
            emptyScope.done();
            done();
            return;
          }
        });

        req.onreadystatechange = spy;
        req.open('GET', 'http://example.com/empty');
        req.send();
      });
    });

    describe('#statusText', function () {
      it('is initially `\'\'`', function () {
        assume(req.statusText).equals('');
      });

      xit('contains status text once headers are received', function (done) {
        var emptyScope = nock('http://example.com')
          .get('/empty')
          .reply(204);

        var spy = sinon.spy(function () {
          assume(spy.callCount).is.at.most(2);
          if (req.readyState >= req.HEADERS_RECEIVED) {
            // TODO: nock doesn't let us specify the response status text
            // for now, use `null` because that's what `http.IncomingMessage`
            // uses for `#statusMessage` if the response doesn't have one
            assume(req.statusText).equals(null);
            emptyScope.done();
            done();
            return;
          }
        });

        req.onreadystatechange = spy;
        req.open('GET', 'http://example.com/empty');
      });
    });

    describe('#timeout', function () {
      var timeout = 50;
      var timeoutScope;

      beforeEach(function () {
        timeoutScope = nock('http://example.com')
          .get('/timeout')
          .socketDelay(5000)
          .reply(204);
      });

      it('is initially 0', function () {
        assume(req.timeout).equals(0);
      });

      it('times out the request if exceeded', function (done) {
        var spy = sinon.spy(function () {
          assume(spy).is.called(1);
          timeoutScope.done();
          done();
        });

        req.ontimeout = spy;
        req.timeout = timeout;
        req.open('GET', 'http://example.com/timeout');
        req.send();
      });

      it('times out even if set after request is sent', function (done) {
        var spy = sinon.spy(function () {
          assume(spy).is.called(1);
          timeoutScope.done();
          done();
        });

        req.ontimeout = spy;
        req.open('GET', 'http://example.com/timeout');
        req.send();
        req.timeout = timeout;
      });
    });

    describe('#responseType', function () {
      it('intially is `\'\'`', function () {
        assume(req.responseType).equals('');
      });

      it('silently fails to write if new value is unsupported', function () {
        req.responseType = null;
        assume(req.responseType).equals('');
      });

      it('allows supported values to be written', function () {
        req.responseType = 'text';
        assume(req.responseType).equals('text');
        req.responseType = '';
        assume(req.responseType).equals('');
      });
    });

    describe('#response', function () {
      var txtResponse = 'This is a test response.';
      var txtScope;
      beforeEach(function () {
        txtScope = nock('http://example.com')
          .get('/test.txt')
          .reply(200, txtResponse);
      });

      it('initially is `null`', function () {
        assume(req.response).equals(null);
      });

      it('supports `responseType = \'text\'`', function (done) {
        var spy = sinon.spy(function () {
          assume(spy).is.called(1);
          assume(req.response).equals(txtResponse);
          txtScope.done();
          done();
        });

        req.onload = spy;
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
        var txtScope = nock(protocol + '//example.com')
          .get('/test.txt')
          .reply(200, txtResponse);

        assume(req.responseType).equals('');
        req.open('GET', protocol + '//example.com/test.txt');

        req.addEventListener('load', function () {
          assume(req.readyState).equals(req.DONE);
          assume(req.response).equals(txtResponse);
          assume(req.responseText).equals(txtResponse);
          assume(req.status).equals(200);
          txtScope.done();
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

