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

  describe('text requests', function () {
    var txtResponse = 'This is a test response.';
    var txtInterceptor;
    var req;

    beforeEach(function () {
      txtInterceptor = nock('http://example.com')
        .get('/test.txt')
        .reply(200, txtResponse);

      req = new XMLHttpRequest();
      assume(req.responseType).equals('');
      req.open('GET', 'http://example.com/test.txt');
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

    afterEach(function () {
      nock.cleanAll();
    });
  });

  describe('#withCredentials', function () {
    var req;

    beforeEach(function () {
      req = new XMLHttpRequest();
    });

    it('defaults to false', function () {
      assume(req.withCredentials).is.false();
    });

    it('is writable', function () {
      req.withCredentials = true;
    });
  });

  after(function () {
    nock.enableNetConnect();
  });
});


