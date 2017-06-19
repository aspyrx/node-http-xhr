'use strict';

/** @module test/describe-event-target */

var assume = require('assume');
var sinon = require('sinon');
var assumeSinon = require('assume-sinon');

assume.use(assumeSinon);

/**
 * Performs BDD tests for the given event type for a class that implements the
 * `EventTarget` interface.
 *
 * @private
 * @param {Function} Class - The class to test.
 * @param {String} type - The event type.
 */
function describeEventType(Class, type) {
  describe('`' + type + '` event', function () {
    var dispatches;
    var instance;
    var handlerProp = 'on' + type;

    /**
     * Tests that the event handler context is well-formed for the current
     * event type.
     *
     * @private
     * @param {Object} e - The event.
     * @this instance
     */
    function testHandler(e) {
      assume(this).equals(instance);
      assume(e.type).equals(type);
      assume(e.target).equals(instance);
    }

    /**
     * Creates a handler spy that tests the event context, then calls the
     * given callback after the handler has been called `dispatches` times.
     *
     * @private
     * @param {Function} done - The callback.
     * @returns {Spy} The spy handler.
     */
    function createHandlerSpy(done) {
      var spy = sinon.spy(/** @this instance */ function () {
        testHandler.apply(this, arguments);

        if (spy.callCount !== dispatches) {
          return;
        }
        done();
      });
      return spy;
    }

    /**
     * Dispatches an event of the current type to the instance `dispatches`
     * times.
     */
    function dispatch() {
      for (var i = 0; i < dispatches; i++) {
        instance.dispatchEvent({ type: type });
      }
    }

    beforeEach(function () {
      dispatches = 3;
      instance = new Class();
    });

    describe('#' + handlerProp, function () {
      it('is initially `null`', function () {
        assume(instance[handlerProp]).equals(null);
      });

      it('reverts to `null` if assigned non-function', function () {
        var spy = sinon.spy();
        instance[handlerProp] = spy;
        assume(instance[handlerProp]).equals(spy);
        instance[handlerProp] = 'foobar';
        assume(instance[handlerProp]).equals(null);
      });

      it('is called when `' + type + '` is fired', function (done) {
        instance[handlerProp] = createHandlerSpy(done);
        dispatch();
      });

      it('removes existing handler if assigned non-function', function (done) {
        var propSpy = sinon.spy(testHandler);
        var doneSpy = sinon.spy(/** @this instance */ function () {
          testHandler.apply(this, arguments);

          assume(propSpy).is.called(1);
          instance[handlerProp] = 'foobar';
          assume(instance[handlerProp]).equals(null);

          if (doneSpy.callCount !== dispatches) {
            return;
          }
          done();
        });

        instance[handlerProp] = propSpy;
        instance.addEventListener(type, doneSpy);
        dispatch();
      });
    });

    describe('#addEventListener(`' + type + '`, fn, [opts])', function () {
      it('adds a listener for `' + type + '` events', function (done) {
        instance.addEventListener(type, createHandlerSpy(done));
        dispatch();
      });

      it('appends listeners in sequence of calls', function (done) {
        dispatches = 1;
        var spy1;
        var spy2;

        spy1 = sinon.spy(/** @this instance */ function () {
          testHandler.apply(this, arguments);
          assume(spy1).is.calledBefore(spy2);
        });
        spy2 = sinon.spy(/** @this instance */ function () {
          testHandler.apply(this, arguments);
          assume(spy2).is.calledAfter(spy1);
          done();
        });
        instance.addEventListener(type, spy1);
        instance.addEventListener(type, spy2);
        dispatch();
      });

      it('adds one-shot listener for `opts.once = true`', function (done) {
        var onceSpy = sinon.spy(testHandler);
        var doneSpy = sinon.spy(/** @this instance */ function () {
          testHandler.apply(this, arguments);
          assume(onceSpy).is.called(1);

          if (doneSpy.callCount !== dispatches) {
            return;
          }
          done();
        });

        instance.addEventListener(type, onceSpy, { once: true });
        instance.addEventListener(type, doneSpy);
        dispatch();
      });
    });

    describe('#removeEventListener(`' + type + '`, fn)', function () {
      it('removes the given event listener', function (done) {
        var spy1 = sinon.spy(testHandler);
        var spy2 = sinon.spy(/** @this instance */ function () {
          testHandler.apply(this, arguments);
          assume(spy1).is.called(1);

          if (spy2.calledOnce) {
            instance.removeEventListener(type, spy1);
          }

          if (spy2.callCount !== dispatches) {
            return;
          }
          done();
        });

        instance.addEventListener(type, spy1);
        instance.addEventListener(type, spy2);
        dispatch();
      });
    });

    describe('#dispatchEvent({ type: `' + type + '` })', function () {
      it('dispatches `' + type + '` events', function (done) {
        instance['on' + type] = createHandlerSpy(done);
        instance.addEventListener(type, testHandler);
        dispatch();
      });
    });
  });
}

/**
 * Performs BDD tests for a class that implements the EventTarget interface.
 *
 * @param {Function} Class - The class to test.
 * @param {String[]} events - The names of the events to test.
 */
module.exports = function (Class, events) {
  describe('EventTarget interface', function () {
    events.forEach(function (type) {
      describeEventType(Class, type);
    });
  });
};

