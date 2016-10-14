'use strict';

const md5 = require('../helper/md5');
const config = require('../../config');

module.exports = {
    // 信道客户端 Id
    get Id() {
        return (this._id || (this._id = md5(config.ServerHost)));
    },

    // 信道客户端 Key
    get Key() {
        return (this._key || (this._key = config.TunnelSignatureKey));
    },
};