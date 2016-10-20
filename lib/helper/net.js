'use strict';

const request = require('request');
const promisify = require('es6-promisify');
const config = require('../../config');

const postRequest = promisify(request.post, { multiArgs: true });

module.exports = {
    jsonPost(params) {
        const timeout = config.getNetworkTimeout();
        params = Object.assign({ timeout, 'json': true }, params);
        return postRequest(params);
    },
};