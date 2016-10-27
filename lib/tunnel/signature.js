'use strict';

const sha1 = require('../helper/sha1');
const tunnelClient = require('./tunnel-client');
const config = require('../../config');

module.exports = {
    /**
     * 计算签名
     */
    compute(input) {
        return sha1(input + tunnelClient.Key);
    },

    /**
     * 校验签名
     */
    check(input, signature) {
        // 不需要校验签名
        if (!config.getTunnelCheckSignature()) {
            return true;
        }

        return this.compute(input) === signature;
    },
};