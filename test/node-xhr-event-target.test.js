'use strict';

var describeEventTarget = require('./describe-event-target');
var XMLHttpRequestEventTarget = require('../lib/node-xhr-event-target.js');

describe('XMLHttpRequestEventTarget', function () {
  describeEventTarget(XMLHttpRequestEventTarget, [
    'readystatechange', 'abort', 'error', 'timeout', 'load'
  ]);
});

