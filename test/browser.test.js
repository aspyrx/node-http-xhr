'use strict';

var assume = require('assume');

describe('XMLHttpRequest in browser', function () {
  describe('exports window.XMLHttpRequest', function () {
    var MockXHR = {};
    global.window = { XMLHttpRequest: MockXHR };

    var XMLHttpRequest = require('../lib/browser');
    assume(XMLHttpRequest).equals(MockXHR);
  });
});

