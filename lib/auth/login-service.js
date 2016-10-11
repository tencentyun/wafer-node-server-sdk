'use strict';

const http = require('http');
const co = require('co');
const promisify = require('es6-promisify');
const request = require('request');
const constants = require('./constants');
const LoginServiceError = require('./login-service-error');

const debug = (() => {
    return ((+process.env.DEBUG_SDK === 1)
        ? console.log.bind(console)
        : () => void(0));
})();

class LoginService {
    constructor(req, res) {
        if (!(req instanceof http.IncomingMessage)) {
            throw new Error('LoginService::req must be instanceof `http.IncomingMessage`');
        }

        if (!(res instanceof http.ServerResponse)) {
            throw new Error('LoginService::res must be instanceof `http.ServerResponse`');
        }

        if (!LoginService.AUTH_URL) {
            throw new Error('Please call method `LoginService.setAuthUrl()` first to set AUTH_URL');
        }

        this.req = req;
        this.res = res;
    }

    static create(req, res) {
        return new this(req, res);
    }

    static setAuthUrl(authUrl) {
        this.AUTH_URL = authUrl;
    }

    login(callback) {
        return (typeof callback === 'function'
            ? this._login(callback)
            : promisify(this._login, this)());
    }

    check(callback) {
        return (typeof callback === 'function'
            ? this._check(callback)
            : promisify(this._check, this)());
    }

    _login(callback) {
        co.wrap(function *() {
            try {
                let data = this._getLoginData();
                debug('========================================');
                debug('LoginService::login [data] =>', JSON.stringify(data, null, 2));
                debug('========================================\n');

                let result = yield this._sendRequest(data);

                let response = result[0];
                if (response.statusCode !== 200) {
                    throw new Error('请求鉴权 API 失败，网络异常或鉴权服务器错误');
                }

                let body = result[1];
                debug('========================================');
                debug('LoginService::login [result] =>', typeof body === 'object' ? JSON.stringify(body, null, 2) : body);
                debug('========================================\n');

                if (typeof body !== 'object') {
                    throw new Error('鉴权服务器响应格式错误，无法解析 JSON 字符串');
                }

                if (body.returnCode === 0) {
                    let returnData = body.returnData;

                    this._writeJsonResult({
                        [constants.WX_SESSION_MAGIC_ID]: 1,
                        session: {
                            id: returnData.id,
                            skey: returnData.skey,
                        },
                    });

                    setTimeout(() => {
                        callback(null, { 'userInfo': returnData.user_info });
                    }, 0);
                } else {
                    throw new Error(`#${body.returnCode} - ${body.returnMessage}`);
                }

            } catch (err) {
                let error = new LoginServiceError(constants.ERR_LOGIN_FAILED, err.message);
                this._writeError(error);
                setTimeout(() => callback(error), 0);
            }
        }).call(this);
    }

    _check(callback) {
        co.wrap(function *() {
            try {
                let data = this._getCheckData();
                debug('========================================');
                debug('LoginService::check [data] =>', JSON.stringify(data, null, 2));
                debug('========================================\n');

                let result = yield this._sendRequest(data);

                let response = result[0];
                if (response.statusCode !== 200) {
                    throw new Error('请求鉴权 API 失败，网络异常或鉴权服务器错误');
                }

                let body = result[1];
                debug('========================================');
                debug('LoginService::check [result] =>', typeof body === 'object' ? JSON.stringify(body, null, 2) : body);
                debug('========================================\n');

                if (typeof body !== 'object') {
                    throw new Error('鉴权服务器响应格式错误，无法解析 JSON 字符串');
                }

                switch (body.returnCode) {
                case constants.RETURN_CODE_SUCCESS:
                    let returnData = body.returnData;

                    setTimeout(() => {
                        callback(null, { 'userInfo': returnData.user_info });
                    }, 0);
                    break;

                case constants.RETURN_CODE_SKEY_EXPIRED:
                case constants.RETURN_CODE_WX_SESSION_FAILED:
                    throw new LoginServiceError(constants.ERR_INVALID_SESSION, body.returnMessage);
                    break;

                default:
                    throw new Error(`#${body.returnCode} - ${body.returnMessage}`);
                    break;
                }

            } catch (err) {
                let error;
                if (err instanceof LoginServiceError) {
                    error = err;
                } else {
                    error = new LoginServiceError(constants.ERR_CHECK_LOGIN_FAILED, err.message);
                }

                this._writeError(error);
                setTimeout(() => callback(error), 0);
            }
        }).call(this);
    }

    _writeError(err) {
        if (!(err instanceof LoginServiceError)) {
            throw new Error('unknown error passed to LoginService::writeError');
        }

        if (this.res.headersSent) {
            return;
        }

        this._writeJsonResult({
            [constants.WX_SESSION_MAGIC_ID]: 1,
            error: err.type,
            message: err.message,
        });
    }

    _writeJsonResult(obj) {
        this.res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        this.res.end(JSON.stringify(obj));
    }

    _sendRequest(data) {
        let params = { 'url': LoginService.AUTH_URL, 'body': data, 'json': true };
        return promisify(request.post, { multiArgs: true })(params);
    }

    _getLoginData() {
        let data = {
            'code': this._getHeader(constants.WX_HEADER_CODE),
            'encrypt_data': this._getHeader(constants.WX_HEADER_ENCRYPT_DATA),
        };

        return this._packReqData(constants.INTERFACE_LOGIN, data);
    }

    _getCheckData() {
        let data = {
            'id': this._getHeader(constants.WX_HEADER_ID),
            'skey': this._getHeader(constants.WX_HEADER_SKEY),
        };

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