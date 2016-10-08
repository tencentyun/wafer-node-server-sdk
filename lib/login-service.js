'use strict';

const http = require('http');
const co = require('co');
const promisify = require('es6-promisify');
const request = require('request');
const config = require('../config');
const constants = require('./constants');
const LoginError = require('./login-error');

class LoginService {
    constructor(req, res) {
        if (!(req instanceof http.IncomingMessage)) {
            throw new Error('LoginService::req must be instanceof `http.IncomingMessage`');
        }

        if (!(res instanceof http.ServerResponse)) {
            throw new Error('LoginService::res must be instanceof `http.ServerResponse`');
        }

        this.authUrl = config.AUTH_URL;
        this.req = req;
        this.res = res;
    }

    static create(req, res) {
        return new this(req, res);
    }

    login(callback) {
        callback = this._checkCallback(callback);

        co.wrap(function *() {
            try {
                let data = this._getLoginData();
                let result = yield this._sendRequest(data);

                let response = result[0];
                if (response.statusCode !== 200) {
                    throw new Error('interal server error');
                }

                let body = result[1];
                if (body.returnCode === 0) {
                    let returnData = body.returnData;

                    this._writeJsonResult({
                        [constants.WX_SESSION_MAGIC_ID]: 1,
                        session: {
                            id: returnData.id,
                            skey: returnData.skey,
                        },
                    });

                    callback(null, { 'userInfo': returnData.userInfo });
                } else {
                    throw new Error(body.returnMessage);
                }

            } catch (err) {
                callback(new LoginError(constants.ERR_LOGIN_FAILED, err.message));
            }
        }).call(this);
    }

    check(callback) {
        callback = this._checkCallback(callback);

        co.wrap(function *() {
            try {
                let data = this._getCheckData();
                let result = yield this._sendRequest(data);

                let response = result[0];
                if (response.statusCode !== 200) {
                    throw new Error('interal server error');
                }

                let body = result[1];
                switch (body.returnCode) {
                case 0:
                    callback(null, { 'userInfo': returnData.userInfo });
                    break;

                case 60011:
                    throw new LoginError(constants.ERR_SESSION_EXPIRED, body.returnMessage);
                    break;

                default:
                    throw new Error(body.returnMessage);
                    break;
                }

            } catch (err) {
                if (err instanceof LoginError) {
                    callback(err);
                } else {
                    callback(new LoginError(constants.ERR_CHECK_LOGIN_FAILED, err.message));
                }
            }
        }).call(this);
    }

    writeError(err) {
        if (!(err instanceof LoginError)) {
            throw new Error('unknown error passed to LoginService::writeError');
        }

        this._writeJsonResult({
            [constants.WX_SESSION_MAGIC_ID]: 1,
            error: err.type,
        });
    }

    _checkCallback(callback) {
        if (!callback) {
            callback = function () {};
        }

        if (typeof callback !== 'function') {
            throw new Error('`callback` must be a function');
        }

        return callback;
    }

    _writeJsonResult(obj) {
        this.res.writeHead(200, { 'Content-Type': 'application/json' });
        this.res.end(JSON.stringify(obj));
    }

    _sendRequest(data) {
        let params = { 'url': this.authUrl, 'body': data, 'json': true };
        return promisify(request.post, { multiArgs: true })(params);
    }

    _getLoginData() {
        let data = [
            ['code', constants.WX_HEADER_CODE],
            ['encrypt_data', constants.WX_HEADER_ENCRYPT_DATA],
        ].reduce((ret, item) => {
            ret[item[0]] = this._getHeader(item[1]);
            return ret;
        }, {});

        return this._packReqData(constants.INTERFACE_LOGIN, data);
    }

    _getCheckData() {
        let data = [
            ['id', constants.WX_HEADER_ID],
            ['skey', constants.WX_HEADER_SKEY],
        ].reduce((ret, item) => {
            ret[item[0]] = this._getHeader(item[1]);
            return ret;
        }, {});

        return this._packReqData(constants.INTERFACE_CHECK, data);
    }

    _getHeader(headerKey) {
        let key = String(headerKey).toLowerCase();
        return this.req.headers[key] || '';
    }

    _packReqData(interfaceName, data) {
        return {
            'version': 1,
            'componentName': 'MA',
            'interface': {
                'interfaceName': interfaceName,
                'para': data,
            },
        };
    }
}

module.exports = LoginService;