'use strict';

const http = require('http');
const should = require('should');
const sinon = require('sinon');
const co = require('co');
require('should-sinon');
const httpMocks = require('node-mocks-http');
const EventEmitter = require('events');

const qcloud = require('../../../index.js');
const constants = require('../../../lib/auth/constants');
const signature = require('../../../lib/tunnel/signature');
const TunnelService = qcloud.TunnelService;
const sdkConfig = require('../../support/sdk_config.json');

describe('tunnel/tunnel-service.js', function () {
    before(function () {
        qcloud.config(sdkConfig);
    });

    describe('TunnelService', function () {
        it('should throw error if no req/res or invalid req/res passed into constructor', function () {
            should.throws(function () {
                new TunnelService();
            });

            should.throws(function () {
                new TunnelService(createRequest(), 'response');
            });

            should.throws(function () {
                new TunnelService('request', createResponse());
            });

            should.doesNotThrow(function () {
                new TunnelService(createRequest(), createResponse());
            });
        });

        describe('TunnelService#get receiveUrl', function () {
            it('should cache result when call `receiveUrl` more than once', function () {
                const request = createRequest();
                const response = createResponse();
                const tunnelService = TunnelService.create(request, response);

                const cached = tunnelService.receiveUrl;
                tunnelService.receiveUrl.should.be.equal(cached);
            });
        });

        describe('TunnelService#handle()', function () {
            it('should respond with 501 error if request method is neither GET nor POST', function () {
                const request = createRequest({ 'method': 'PUT' });
                const response = createResponse();

                TunnelService.create(request, response).handle();

                const body = JSON.parse(response._getData());
                body.code.should.be.equal(501);
            });
        });

        describe('TunnelService#handle() - GET', function () {
            it('should respond with websocket connection url and call `onRequest` with `tunnelId`', function (done) {
                const request = createRequest({ 'method': 'GET', 'url': '/tunnel' });
                const response = createResponse();

                TunnelService.create(request, response).handle({
                    onRequest(tunnelId, userInfo) {
                        co(function *() {
                            const body = JSON.parse(response._getData());
                            body.url.should.be.a.String();

                            tunnelId.should.be.a.String();
                            should(userInfo).be.Null();
                        }).then(done, done);
                    }
                });
            });

            it('should respond with websocket connection url and call `onRequest` with `tunnelId/userInfo` if `checkLogin` is true', function (done) {
                const headers = {
                    [constants.WX_HEADER_ID]: 'valid-id',
                    [constants.WX_HEADER_SKEY]: 'valid-skey',
                };
                const request = createRequest({ 'method': 'GET', 'url': '/tunnel', headers });
                const response = createResponse();

                TunnelService.create(request, response).handle({
                    onRequest(tunnelId, userInfo) {
                        co(function *() {
                            const body = JSON.parse(response._getData());
                            body.url.should.be.a.String();

                            tunnelId.should.be.a.String();
                            userInfo.should.be.an.Object();
                        }).then(done, done);
                    }
                }, { 'checkLogin': true });
            });

            it('should respond with error if `checkLogin` is true but without session info', function (done) {
                const request = createRequest({ 'method': 'GET', 'url': '/tunnel' });
                const response = createResponse({ eventEmitter: EventEmitter });
                const tunnelHandler = { onRequest: sinon.spy() };

                response.on('end', function () {
                    co(function *() {
                        const body = JSON.parse(response._getData());

                        body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                        body.should.have.property('error').which.is.a.String();
                        tunnelHandler.onRequest.should.not.be.called();
                    }).then(done, done);
                });

                TunnelService.create(request, response).handle(tunnelHandler, { 'checkLogin': true });
            });

            it('should respond with error if `checkLogin` is true but with invalid session info', function (done) {
                const headers = {
                    [constants.WX_HEADER_ID]: 'invalid-id',
                    [constants.WX_HEADER_SKEY]: 'valid-skey',
                };
                const request = createRequest({ 'method': 'GET', 'url': '/tunnel', headers });
                const response = createResponse({ eventEmitter: EventEmitter });
                const tunnelHandler = { onRequest: sinon.spy() };

                response.on('end', function () {
                    co(function *() {
                        const body = JSON.parse(response._getData());

                        body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                        body.should.have.property('error').which.is.a.String();
                        tunnelHandler.onRequest.should.not.be.called();
                    }).then(done, done);
                });

                TunnelService.create(request, response).handle(tunnelHandler, { 'checkLogin': true });
            });

            it('should respond with error if check signature failed', function (done) {
                qcloud.config.setTunnelCheckSignature(true);

                const request = createRequest({ 'method': 'GET', 'url': '/tunnel' });
                const response = createResponse({ eventEmitter: EventEmitter });
                const tunnelHandler = { onRequest: sinon.spy() };

                response.on('end', function () {
                    qcloud.config.setTunnelCheckSignature(false);

                    co(function *() {
                        const body = JSON.parse(response._getData());

                        body.should.not.have.property(constants.WX_SESSION_MAGIC_ID);
                        body.should.have.property('error').which.is.a.String();
                        tunnelHandler.onRequest.should.not.be.called();
                    }).then(done, done);
                });

                TunnelService.create(request, response).handle(tunnelHandler);
            });
        });

        describe('TunnelService#handle() - POST', function () {
            let tunnelHandler;

            beforeEach(function () {
                tunnelHandler = {
                    onRequest: sinon.spy(),
                    onConnect: sinon.spy(),
                    onMessage: sinon.spy(),
                    onClose: sinon.spy(),
                };
            });

            it('should respond with error if request body is not an object', function () {
                const body = 'this is a string';
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle();
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(9001);
            });

            it('should respond with error if request body has no data', function () {
                const body = {};
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle();
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(9002);
            });

            it('should respond with error if request signature is invalid', function () {
                qcloud.config.setTunnelCheckSignature(true);

                const body = { 'data': '{}', 'signature': 'invalid-signature' };
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle();
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(9003);

                qcloud.config.setTunnelCheckSignature(false);
            });

            it('should respond with error if request body.data is invalid', function () {
                const body = { 'data': 'whatever', 'signature': 'valid-signature' };
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle();
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(9004);
            });

            it('should respond with ok if request body is valid', function () {
                const body = { 'data': '{}', 'signature': 'valid-signature' };
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle();
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(0);
            });

            it('should only call `onConnect` handler if received `connect` packet', function () {
                const data = '{"tunnelId":"tunnel1","type":"connect"}';
                const body = { data, 'signature': 'valid-signature' };
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle(tunnelHandler);
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(0);

                tunnelHandler.onRequest.should.not.be.called();
                tunnelHandler.onMessage.should.not.be.called();
                tunnelHandler.onClose.should.not.be.called();

                tunnelHandler.onConnect.should.be.calledOnce();
                tunnelHandler.onConnect.should.be.calledWith('tunnel1');
            });

            it('should only call `onMessage` handler if received `message` packet', function () {
                const data = JSON.stringify({
                    tunnelId: 'tunnel1',
                    type: 'message',
                    content: JSON.stringify({ type: 'hi', content: 'hello, everyone.' }),
                });
                const body = { data, 'signature': 'valid-signature' };
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle(tunnelHandler);
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(0);

                tunnelHandler.onRequest.should.not.be.called();
                tunnelHandler.onConnect.should.not.be.called();
                tunnelHandler.onClose.should.not.be.called();

                tunnelHandler.onMessage.should.be.calledOnce();
                tunnelHandler.onMessage.should.be.calledWithExactly('tunnel1', 'hi', 'hello, everyone.');
            });

            it('should only call `onMessage` handler if received `message` packet but unknown message-type', function () {
                const data = JSON.stringify({
                    tunnelId: 'tunnel1',
                    type: 'message',
                    content: 'hi, there',
                });
                const body = { data, 'signature': 'valid-signature' };
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle(tunnelHandler);
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(0);

                tunnelHandler.onRequest.should.not.be.called();
                tunnelHandler.onConnect.should.not.be.called();
                tunnelHandler.onClose.should.not.be.called();

                tunnelHandler.onMessage.should.be.calledOnce();
                tunnelHandler.onMessage.should.be.calledWithExactly('tunnel1', 'UnknownRaw', 'hi, there');
            });

            it('should only call `onMessage` handler if received `message` packet but no content', function () {
                const data = JSON.stringify({
                    tunnelId: 'tunnel1',
                    type: 'message',
                });
                const body = { data, 'signature': 'valid-signature' };
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle(tunnelHandler);
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(0);

                tunnelHandler.onRequest.should.not.be.called();
                tunnelHandler.onConnect.should.not.be.called();
                tunnelHandler.onClose.should.not.be.called();

                tunnelHandler.onMessage.should.be.calledOnce();
                tunnelHandler.onMessage.should.be.calledWithExactly('tunnel1', 'UnknownRaw', undefined);
            });

            it('should only call `onClose` handler if received `close` packet', function () {
                const data = JSON.stringify({
                    tunnelId: 'tunnel1',
                    type: 'close',
                });
                const body = { data, 'signature': 'valid-signature' };
                const request = createRequest({ 'method': 'POST', 'url': '/tunnel', body });
                const response = createResponse();

                TunnelService.create(request, response).handle(tunnelHandler);
                const result = JSON.parse(response._getData());
                result.code.should.be.equal(0);

                tunnelHandler.onRequest.should.not.be.called();
                tunnelHandler.onConnect.should.not.be.called();
                tunnelHandler.onMessage.should.not.be.called();

                tunnelHandler.onClose.should.be.calledOnce();
                tunnelHandler.onClose.should.be.calledWithExactly('tunnel1');
            });
        });

        describe('TunnelService.broadcast()', function () {
            it('should return a promise', function (done) {
                const tunnelIds = ['tunnel1', 'tunnel2'];
                const messageType = 'hi';
                const messageContent = 'hello, everybody!';

                const result = TunnelService.broadcast(tunnelIds, messageType, messageContent);
                result.should.be.instanceof(Promise);
                result.then(() => done());
            });

            it('should respond with error if tunnel-server send 500 result', function (done) {
                const tunnelIds = ['expect-500', 'tunnel2'];
                const messageType = 'hi';
                const messageContent = 'hello, everybody!';

                const result = TunnelService.broadcast(tunnelIds, messageType, messageContent);
                result.catch(err => done());
            });

            it('should respond with error if tunnel-server return invalid json', function (done) {
                const tunnelIds = ['expect-invalid-json', 'tunnel2'];
                const messageType = 'hi';
                const messageContent = 'hello, everybody!';

                const result = TunnelService.broadcast(tunnelIds, messageType, messageContent);
                result.catch(err => done());
            });

            it('should failed if tunnel-server return failed result', function (done) {
                const tunnelIds = ['expect-failed-result', 'tunnel2'];
                const messageType = 'hi';
                const messageContent = 'hello, everybody!';

                const result = TunnelService.broadcast(tunnelIds, messageType, messageContent);
                result.catch(err => done());
            });
        });

        describe('TunnelService.emit()', function () {
            it('should return a promise', function (done) {
                const tunnelId = 'tunnel1';
                const messageType = 'hi';
                const messageContent = 'hello, how are you!';

                const result = TunnelService.emit(tunnelId, messageType, messageContent);
                result.should.be.instanceof(Promise);
                result.then(() => done());
            });

            it('should respond with error if tunnel-server send 500 result', function (done) {
                const tunnelId = 'expect-500';
                const messageType = 'hi';
                const messageContent = 'hello, how are you!';

                const result = TunnelService.emit(tunnelId, messageType, messageContent);
                result.catch(err => done());
            });

            it('should respond with error if tunnel-server return invalid json', function (done) {
                const tunnelId = 'expect-invalid-json';
                const messageType = 'hi';
                const messageContent = 'hello, how are you!';

                const result = TunnelService.emit(tunnelId, messageType, messageContent);
                result.catch(err => done());
            });

            it('should failed if tunnel-server return failed result', function (done) {
                const tunnelId = 'expect-failed-result';
                const messageType = 'hi';
                const messageContent = 'hello, how are you!';

                const result = TunnelService.emit(tunnelId, messageType, messageContent);
                result.catch(err => done());
            });
        });

        describe('TunnelService.closeTunnel()', function () {
            it('should return a promise', function (done) {
                const tunnelId = 'tunnel1';
                const result = TunnelService.closeTunnel(tunnelId);
                result.should.be.instanceof(Promise);
                result.then(() => done());
            });

            it('should respond with error if tunnel-server send 500 result', function (done) {
                const tunnelId = 'expect-500';
                const result = TunnelService.closeTunnel(tunnelId);
                result.catch(err => done());
            });

            it('should respond with error if tunnel-server return invalid json', function (done) {
                const tunnelId = 'expect-invalid-json';
                const result = TunnelService.closeTunnel(tunnelId);
                result.catch(err => done());
            });

            it('should failed if tunnel-server return failed result', function (done) {
                const tunnelId = 'expect-failed-result';
                const result = TunnelService.closeTunnel(tunnelId);
                result.catch(err => done());
            });
        });
    });
});

function createRequest(options) {
    const request = httpMocks.createRequest(options);
    Object.setPrototypeOf(request, http.IncomingMessage.prototype);
    return request;
}

function createResponse(options) {
    const response = httpMocks.createResponse(options);
    Object.setPrototypeOf(response, http.ServerResponse.prototype);
    return response;
}