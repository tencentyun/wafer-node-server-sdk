'use strict';

const http = require('http');
const co = require('co');
const ServiceBase = require('../service-base');
const constants = require('./constants');
const authApi = require('./auth-api');
const AuthAPIError = require('./auth-api-error');
const LoginServiceError = require('./login-service-error');

class LoginService extends ServiceBase {
    login(callback) {
        const promise = co.wrap(function *() {
            try {
                const code = this._getHeader(constants.WX_HEADER_CODE);
                const encryptedData = this._getHeader(constants.WX_HEADER_ENCRYPTED_DATA);
                const iv = this._getHeader(constants.WX_HEADER_IV);

                const result = yield authApi.login(code, encryptedData, iv);

                this.writeJsonResult({
                    [constants.WX_SESSION_MAGIC_ID]: 1,
                    session: {
                        id: result.id,
                        skey: result.skey,
                    },
                });

                return { 'userInfo': result.user_info };
            } catch (err) {
                let error = new LoginServiceError(constants.ERR_LOGIN_FAILED, err.message);
                this._writeError(error);
                throw error;
            }
        }).call(this);

        return this._promiseOrCallback(promise, callback);
    }

    check(callback) {
        const promise = co.wrap(function *() {
            try {
                const id = this._getHeader(constants.WX_HEADER_ID);
                const skey = this._getHeader(constants.WX_HEADER_SKEY);

                const result = yield authApi.checkLogin(id, skey);

                return { 'userInfo': result.user_info };
            } catch (err) {
                let error;

                if (err instanceof AuthAPIError) {
                    switch (err.code) {
                    case constants.RETURN_CODE_SKEY_EXPIRED:
                    case constants.RETURN_CODE_WX_SESSION_FAILED:
                        error = new LoginServiceError(constants.ERR_INVALID_SESSION, err.message);
                        break;

                    default:
                        error = new LoginServiceError(constants.ERR_CHECK_LOGIN_FAILED, err.message);
                        break;
                    }
                } else {
                    error = new LoginServiceError(constants.ERR_CHECK_LOGIN_FAILED, err.message);
                }

                this._writeError(error);
                throw error;
            }
        }).call(this);

        return this._promiseOrCallback(promise, callback);
    }

    _writeError(err) {
        if (this.res.headersSent) {
            return;
        }

        this.writeJsonResult({
            [constants.WX_SESSION_MAGIC_ID]: 1,
            error: err.type,
            message: err.message,
        });
    }

    _promiseOrCallback(promise, callback) {
        if (typeof callback !== 'function') {
            return promise;
        }

        promise.then(
            result => setTimeout(() => callback(null, result), 0),
            error => setTimeout(() => callback(error), 0)
        );
    }

    _getHeader(headerKey) {
        let headerValue = super.getHeader(headerKey);

        if (!headerValue) {
            throw new Error(`请求头未包含 ${headerKey}，请配合客户端 SDK 登录后再进行请求`);
        }

        return headerValue;
    }
}

module.exports = LoginService;