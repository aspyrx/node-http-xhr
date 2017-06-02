'use strict';

var XMLHttpRequest = require('..');
var assume = require('assume');
var nock = require('nock');

//
// TODO: lots of tests!
//
describe('XMLHttpRequest', function () {
  before(function () {
    nock.disableNetConnect();
  });

  it('successfully completes a request', function (done) {
    var testResponse = 'This is a test';
    var testInterceptor = nock('http://example.com')
      .get('/test')
      .reply(200, testResponse);
    var req = new XMLHttpRequest();
    req.addEventListener('load', function (event) {
      testInterceptor.done();
      // eslint-disable-next-line no-invalid-this
      assume(this).equals(req);
      assume(event.target).equals(req);
      assume(event.type).equals('load');
      assume(req.readyState).equals(req.DONE);
      assume(req.response).equals(testResponse);
      assume(req.responseText).equals(testResponse);
      assume(req.status).equals(200);
      done();
    });

    req.open('GET', 'http://example.com/test');
    req.send();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  after(function () {
    nock.enableNetConnect();
  });
});


