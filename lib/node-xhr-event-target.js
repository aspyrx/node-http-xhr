'use strict';

/**
 * Node.js `XMLHttpRequestEventTarget` implementation.
 *
 * @module node-xhr-event-target
 * @author Stan Zhang <stan.zhang2@gmail.com>
 */

var EventTarget = require('./node-event-target');

/**
 * Creates a new `XMLHttpRequestEventTarget`.
 *
 * @classdesc The interface that describes the event handlers for an
 * `XMLHttpRequest`.
 *
 * NOTE: Currently, some features are lacking:
 * - Some ProgressAPI events (`loadstart`, `loadend`, `progress`)
 *
 * See {@link
 * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget
 * `XMLHttpRequestEventTarget` on MDN
 * } for more details.
 *
 * @class
 */
module.exports = function () {
  EventTarget.call(this);

  /**
   * `readystatechange` event handler.
   *
   * @private
   * @type {?Function}
   */
  this._onreadystatechange = null;

  /**
   * `abort` event handler.
   *
   * @private
   * @type {?Function}
   */
  this._onabort = null;

  /**
   * `error` event handler.
   *
   * @private
   * @type {?Function}
   */
  this._onerror = null;

  /**
   * `timeout` event handler.
   *
   * @private
   * @type {?Function}
   */
  this._ontimeout = null;

  /**
   * `load` event handler.
   *
   * @private
   * @type {?Function}
   */
  this._onload = null;
};

var NodeXHREventTarget = module.exports;

NodeXHREventTarget.prototype = new EventTarget();

//
// Set up event handler properties
//
[
  /**
   * The {@link
   * module:node-http-xhr#readyState
   * `readyState`
   * } changed.
   *
   * @event module:node-http-xhr#readystatechange
   */
  'readystatechange',
  /**
   * The request was aborted.
   *
   * @event module:node-http-xhr#abort
   */
  'abort',
  /**
   * An error was encountered.
   *
   * @event module:node-http-xhr#error
   * @type {Error}
  */
  'error',
  /**
   * The request timed out.
   *
   * @event module:node-http-xhr#timeout
   */
  'timeout',
  /**
   * The response finished loading.
   *
   * @event module:node-http-xhr#load
   */
  'load'
].forEach(function (type) {
  var key = 'on' + type;
  Object.defineProperty(NodeXHREventTarget.prototype, key, {
    get: function getHandler() { return this['_' + key]; },
    set: function setHandler(handler) {
      if (typeof handler === 'function') {
        this.addEventListener(type, handler);
        this['_' + key] = handler;
      } else {
        var old = this['_' + key];
        if (old) {
          this.removeEventListener(type, old);
        }

        this['_' + key] = null;
      }
    }
  });
});

