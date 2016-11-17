'use strict';

const http = require('http');
const should = require('should');
const httpMocks = require('node-mocks-http');

const qcloud = require('../../../index.js');
const constants = require('../../../lib/auth/constants');
const LoginService = qcloud.LoginService;
const sdkConfig = require('../../support/sdk_config.json');

describe('auth/login-service.js', function () {
    beforeEach(function () {
        qcloud.config(sdkConfig);
    });

    describe('LoginService', function () {
        it('should throw error if no req/res or invalid req/res passed into constructor', function () {
            should.throws(function () {
                new LoginService();
            });

            should.throws(function () {
                new LoginService(createRequest(), 'response');
            });

            should.throws(function () {
                new LoginService('request', createResponse());
            });

            should.doesNotThrow(function () {
                new LoginService(createRequest(), createResponse());
            });
        });
    });

    describe('LoginService#login()', function () {
        it('should return a promise if no callback function passed in', function () {
            const request = createRequest();
            const response = createResponse();
            const loginService = LoginService.create(request, response);
            const result = loginService.login().catch(() => void(0));
            result.should.be.instanceof(Promise);
        });

        it('should return undefined if a callback function passed in', function (done) {
            const request = createRequest();
            const response = createResponse();

            const callback = (err) => {
                err.should.be.instanceof(Error);
                done();
            };

            const result = LoginService.create(request, response).login(callback);
            should(result).be.an.undefined();
        });

        it('should respond with nothing if response headers has been sent', function (done) {
            const request = createRequest();
            const response = createResponse();
            response.headersSent = true;

            const callback = (err) => {
                response._getData().should.be.equal('');
                done();
            };

            LoginService.create(request, response).login(callback);
        });

        it('should return `user_info` and respond with id/skey if carry with valid code/encryptedData/iv headers', function (done) {
            const headers = {
                [constants.WX_HEADER_CODE]: 'valid-code',
                [constants.WX_HEADER_ENCRYPTED_DATA]: 'valid-data',
                [constants.WX_HEADER_IV]: 'valid-iv',
            };

            const request = createRequest({ method: 'GET', url: '/login', headers });
            const response = createResponse();

            LoginService.create(request, response).login().then(result => {
                const body = JSON.parse(response._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('session').which.is.an.Object();
                body.session.id.should.be.a.String();
                body.session.skey.should.be.a.String();

                result.should.have.property('userInfo').which.is.an.Object();
            }).then(done, done);
        });

        it('should pass `user_info` to callback and respond with id/skey if carry with valid code/encryptedData/iv headers', function (done) {
            const headers = {
                [constants.WX_HEADER_CODE]: 'valid-code',
                [constants.WX_HEADER_ENCRYPTED_DATA]: 'valid-data',
                [constants.WX_HEADER_IV]: 'valid-iv',
            };

            const request = createRequest({ method: 'GET', url: '/login', headers });
            const response = createResponse();

            LoginService.create(request, response).login((err, result) => {
                const body = JSON.parse(response._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('session').which.is.an.Object();
                body.session.id.should.be.a.String();
                body.session.skey.should.be.a.String();

                should(err).be.Null();
                result.should.have.property('userInfo').which.is.an.Object();

                done();
            });
        });

        it('should respond with error if request headers do not contain code/encryptedData/iv', function (done) {
            const request = createRequest({ method: 'GET', url: '/login' });
            const response = createResponse();

            LoginService.create(request, response).login().catch(err => {
                const body = JSON.parse(response._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(done, done);
        });

        it('should respond with error if carry with invalid code/encryptedData/iv headers', function (done) {
            let wait = (err) => {
                if (err) {
                    wait = () => void(0);
                    return done(err);
                }
                wait.count = (wait.count || 0) + 1;
                if (wait.count === 3) done();
            }

            // test with invalid code
            const headers1 = {
                [constants.WX_HEADER_CODE]: 'invalid-code',
                [constants.WX_HEADER_ENCRYPTED_DATA]: 'valid-data',
                [constants.WX_HEADER_IV]: 'valid-iv',
            };

            const request1 = createRequest({ method: 'GET', url: '/login', headers: headers1 });
            const response1 = createResponse();

            LoginService.create(request1, response1).login().catch(err => {
                const body = JSON.parse(response1._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(wait, wait);

            // test with invalid encryptData
            const headers2 = {
                [constants.WX_HEADER_CODE]: 'valid-code',
                [constants.WX_HEADER_ENCRYPTED_DATA]: 'invalid-data',
                [constants.WX_HEADER_IV]: 'valid-iv',
            };

            const request2 = createRequest({ method: 'GET', url: '/login', headers: headers2 });
            const response2 = createResponse();

            LoginService.create(request2, response2).login().catch(err => {
                const body = JSON.parse(response2._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(wait, wait);

            // test with invalid iv
            const headers3 = {
                [constants.WX_HEADER_CODE]: 'valid-code',
                [constants.WX_HEADER_ENCRYPTED_DATA]: 'valid-data',
                [constants.WX_HEADER_IV]: 'invalid-iv',
            };

            const request3 = createRequest({ method: 'GET', url: '/login', headers: headers3 });
            const response3 = createResponse();

            LoginService.create(request3, response3).login().catch(err => {
                const body = JSON.parse(response3._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(wait, wait);
        });

        it('should respond with error if auth-server respond with invalid data', function (done) {
            const headers = {
                [constants.WX_HEADER_CODE]: 'expect-invalid-json',
                [constants.WX_HEADER_ENCRYPTED_DATA]: 'valid-data',
                [constants.WX_HEADER_IV]: 'valid-iv',
            };

            const request = createRequest({ method: 'GET', url: '/login', headers });
            const response = createResponse();

            LoginService.create(request, response).login().catch(err => {
                const body = JSON.parse(response._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(done, done);
        });

        it('should respond with error if auth-server send 500 result', function (done) {
             const headers = {
                 [constants.WX_HEADER_CODE]: 'expect-500',
                 [constants.WX_HEADER_ENCRYPTED_DATA]: 'valid-data',
                 [constants.WX_HEADER_IV]: 'valid-iv',
             };

             const request = createRequest({ method: 'GET', url: '/login', headers });
             const response = createResponse();

             LoginService.create(request, response).login().catch(err => {
                 const body = JSON.parse(response._getData());
                 body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                 body.should.have.property('error').which.is.a.String();
             }).then(done, done);
        });

        it('should respond with error if auth-server timedout', function (done) {
            const headers = {
                [constants.WX_HEADER_CODE]: 'expect-timeout',
                [constants.WX_HEADER_ENCRYPTED_DATA]: 'valid-data',
                [constants.WX_HEADER_IV]: 'valid-iv',
            };

            const request = createRequest({ method: 'GET', url: '/login', headers });
            const response = createResponse();

            LoginService.create(request, response).login().catch(err => {
                const body = JSON.parse(response._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(done, done);
        });
    });

    describe('LoginService#check()', function () {
        it('should return a promise if no callback function passed in', function () {
            const request = createRequest();
            const response = createResponse();
            const loginService = LoginService.create(request, response);
            const result = loginService.check().catch(() => void(0));;
            result.should.be.instanceof(Promise);
        });

        it('should return undefined if a callback function passed in', function () {
            const request = createRequest();
            const response = createResponse();
            const callback = () => {};
            const result = LoginService.create(request, response).check(callback);
            should(result).be.an.undefined();
        });

        it('should return `user_info` if carry with valid id/skey headers', function (done) {
            const headers = {
                [constants.WX_HEADER_ID]: 'valid-id',
                [constants.WX_HEADER_SKEY]: 'valid-skey',
            };

            const request = createRequest({ method: 'GET', url: '/check', headers });
            const response = createResponse();

            LoginService.create(request, response).check().then(result => {
                result.should.have.property('userInfo').which.is.an.Object();
            }).then(done, done);
        });

        it('should respond with error if request headers do not contain id/skey', function (done) {
            const request = createRequest({ method: 'GET', url: '/check' });
            const response = createResponse();

            LoginService.create(request, response).check().catch(err => {
                const body = JSON.parse(response._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(done, done);
        });

        it('should respond with error if carry with invalid id/skey headers', function (done) {
            let wait = (err) => {
                if (err) {
                    wait = () => void(0);
                    return done(err);
                }
                wait.count = (wait.count || 0) + 1;
                if (wait.count === 2) done();
            }

            // test with invalid code
            const headers1 = {
                [constants.WX_HEADER_ID]: 'invalid-id',
                [constants.WX_HEADER_SKEY]: 'valid-skey',
            };

            const request1 = createRequest({ method: 'GET', url: '/check', headers: headers1 });
            const response1 = createResponse();

            LoginService.create(request1, response1).check().catch(err => {
                const body = JSON.parse(response1._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(wait, wait);

            // test with invalid encryptData
            const headers2 = {
                [constants.WX_HEADER_ID]: 'valid-id',
                [constants.WX_HEADER_SKEY]: 'invalid-skey',
            };

            const request2 = createRequest({ method: 'GET', url: '/check', headers: headers2 });
            const response2 = createResponse();

            LoginService.create(request2, response2).check().catch(err => {
                const body = JSON.parse(response2._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(wait, wait);
        });

        it('should respond with error if auth-server respond with invalid data', function (done) {
            const headers = {
                [constants.WX_HEADER_ID]: 'expect-invalid-json',
                [constants.WX_HEADER_SKEY]: 'valid-skey',
            };

            const request = createRequest({ method: 'GET', url: '/check', headers });
            const response = createResponse();

            LoginService.create(request, response).check().catch(err => {
                const body = JSON.parse(response._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(done, done);
        });

        it('should respond with error if auth-server respond with 60011/60012', function (done) {
            let wait = (err) => {
                if (err) {
                    wait = () => void(0);
                    return done(err);
                }
                wait.count = (wait.count || 0) + 1;
                if (wait.count === 2) done();
            }

            // test 60011 error
            const headers1 = {
                [constants.WX_HEADER_ID]: 'expect-60011',
                [constants.WX_HEADER_SKEY]: 'valid-skey',
            };

            const request1 = createRequest({ method: 'GET', url: '/check', headers: headers1 });
            const response1 = createResponse();

            LoginService.create(request1, response1).check().catch(err => {
                const body = JSON.parse(response1._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(wait, wait);

            // test 60012 error
            const headers2 = {
                [constants.WX_HEADER_ID]: 'expect-60012',
                [constants.WX_HEADER_SKEY]: 'valid-skey',
            };

            const request2 = createRequest({ method: 'GET', url: '/check', headers: headers2 });
            const response2 = createResponse();

            LoginService.create(request2, response2).check().catch(err => {
                const body = JSON.parse(response2._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(wait, wait);
        });

        it('should respond with error if auth-server send 500 result', function (done) {
             const headers = {
                 [constants.WX_HEADER_ID]: 'expect-500',
                 [constants.WX_HEADER_SKEY]: 'valid-skey',
             };

             const request = createRequest({ method: 'GET', url: '/check', headers });
             const response = createResponse();

             LoginService.create(request, response).check().catch(err => {
                 const body = JSON.parse(response._getData());
                 body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                 body.should.have.property('error').which.is.a.String();
             }).then(done, done);
        });

        it('should respond with error if auth-server timedout', function (done) {
            const headers = {
                [constants.WX_HEADER_ID]: 'expect-timeout',
                [constants.WX_HEADER_SKEY]: 'valid-skey',
            };

            const request = createRequest({ method: 'GET', url: '/check', headers });
            const response = createResponse();

            LoginService.create(request, response).check().catch(err => {
                const body = JSON.parse(response._getData());
                body.should.have.property(constants.WX_SESSION_MAGIC_ID).which.is.equal(1);
                body.should.have.property('error').which.is.a.String();
            }).then(done, done);
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