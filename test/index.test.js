'use strict';

var XMLHttpRequest = require('..');
var assume = require('assume');
var nock = require('nock');

/**
 * Performs BDD tests for a class that implements the EventTarget interface.
 *
 * @param {Function} Class - The class to test.
 * @param {String[]} events - The names of the events to test.
 */
function describeEventTarget(Class, events) {
  /* eslint-disable no-invalid-this */
  describe('EventTarget [' + events.join(', ') + ']', function () {
    var instance;

    /**
     * Tests that the given event targeted at the instance is well-formed.
     *
     * @param {Event} e - The event.
     * @param {String} type - The type of the event.
     */
    function testEvent(e, type) {
      assume(this).equals(instance);
      assume(e.type).equals(type);
      assume(e.target).equals(instance);
    }

    beforeEach(function () {
      instance = new Class();
    });

    events.forEach(function (type) {
      var prop = 'on' + type;
      describe('#' + prop, function () {
        it('is initially `null`', function () {
          assume(instance[prop]).equals(null);
        });

        it('is called when `' + type + '` is fired', function (done) {
          instance[prop] = function handler(e) {
            testEvent.bind(this)(e, type);
            done();
          };

          instance.dispatchEvent({ type: type });
        });
      });
    });

    describe('#addEventListener()', function () {
      events.forEach(function (type) {
        it('adds a listener for `' + type + '` events', function (done) {
          function handler(e) {
            testEvent.bind(this)(e, type);
            done();
          }

          instance.addEventListener(type, handler);
          instance.dispatchEvent({ type: type });
        });

        it(
          'adds one-shot `' + type + '` listener for truthy `once` option',
          function (done) {
            var onceHandlerCalled = false;
            function onceHandler(e) {
              testEvent.bind(this)(e, type);
              assume(onceHandlerCalled).is.false();
              onceHandlerCalled = true;
            }

            var dispatches = 3;
            var calls = 0;
            function doneHandler(e) {
              testEvent.bind(this)(e, type);

              calls++;
              assume(calls).is.at.most(dispatches);
              if (calls === dispatches) {
                return done();
              }
            }

            instance.addEventListener(type, onceHandler, { once: true });
            instance.addEventListener(type, doneHandler);

            for (var i = 0; i < dispatches; i++) {
              instance.dispatchEvent({ type: type });
            }
          }
        );
      });
    });

    describe('#dispatchEvent()', function () {
      events.forEach(function (type) {
        it('dispatches `' + type + '` events', function (done) {
          var dispatches = 3;
          var calls = 0;
          function handler(e) {
            testEvent.bind(this)(e, type);

            calls++;
            assume(calls).is.at.most(dispatches);
            if (calls === dispatches) {
              return done();
            }
          }

          instance['on' + type] = handler;
          instance.addEventListener(type, handler);

          for (var i = 0; i < dispatches; i++) {
            instance.dispatchEvent({ type: type });
          }
        });
      });
    });
  });
  /* eslint-enable no-invalid-this */
}

//
// TODO: lots of tests!
//
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

  describeEventTarget(XMLHttpRequest, [
    'readystatechange', 'abort', 'error', 'timeout', 'load'
  ]);

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

    it('is writable', function () {
      req.withCredentials = true;
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
      req.addEventListener('load', function (event) {
        // eslint-disable-next-line no-invalid-this
        assume(this).equals(req);
        assume(event.target).equals(req);
        assume(event.type).equals('load');
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


