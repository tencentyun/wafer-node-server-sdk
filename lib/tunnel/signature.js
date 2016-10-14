'use strict';

const sha1 = require('../helper/sha1');
const tunnelClient = require('./tunnel-client');

module.exports = {
    /**
     * 计算签名
     */
    compute(input) {
        if (typeof input === 'object') {
            input = JSON.stringify(input);
        }

        return sha1(input + tunnelClient.Key);
    },

    /**
     * 校验签名
     */
    check(input, signature) {
        return this.compute(input) === signature;
    },
};