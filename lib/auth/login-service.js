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
        const code = this.getHeader(constants.WX_HEADER_CODE);
        const encryptData = this.getHeader(constants.WX_HEADER_ENCRYPT_DATA);

        const promise = co.wrap(function *() {
            try {
                const result = yield authApi.login(code, encryptData);

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

        if (typeof callback !== 'function') {
            return promise;
        }

        promise.then(
            result => setTimeout(() => callback(null, result), 0),
            error => setTimeout(() => callback(error), 0)
        );
    }

    check(callback) {
        const id = this.getHeader(constants.WX_HEADER_ID);
        const skey = this.getHeader(constants.WX_HEADER_SKEY);

        const promise = co.wrap(function *() {
            try {
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

        if (typeof callback !== 'function') {
            return promise;
        }

        promise.then(
            result => setTimeout(() => callback(null, result), 0),
            error => setTimeout(() => callback(error), 0)
        );
    }

    _writeError(err) {
        if (!(err instanceof LoginServiceError)) {
            throw new Error('unknown error passed to LoginService::writeError');
        }

        if (this.res.headersSent) {
            return;
        }

        this.writeJsonResult({
            [constants.WX_SESSION_MAGIC_ID]: 1,
            error: err.type,
            message: err.message,
        });
    }
}

module.exports = LoginService;