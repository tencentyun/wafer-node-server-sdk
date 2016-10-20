'use strict';

const md5 = require('../helper/md5');
const config = require('../../config');

module.exports = {
    // 信道客户端 Id
    get Id() {
        return md5(config.getServerHost());
    },

    // 信道客户端 Key
    get Key() {
        return config.getTunnelSignatureKey();
    },
};