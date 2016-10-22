'use strict';

const http = require('http');
const should = require('should');
const sinon = require('sinon');
const co = require('co');
require('should-sinon');
const httpMocks = require('node-mocks-http');
const EventEmitter = require('events');

const qcloud = require('..');
const constants = require('../lib/auth/constants');
const TunnelService = qcloud.TunnelService;
const sdkConfig = require('./support/sdk_config.json');

describe('tunnel/tunnel-service.js', function () {
    before(function () {
        const signature = require('../lib/tunnel/signature');

        // 不校验签名
        sinon.stub(signature, 'check', () => true);
    });

    beforeEach(function () {
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
                    [constants.WX_HEADER_SKEY]: 'valid-key',
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
                    [constants.WX_HEADER_SKEY]: 'valid-key',
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