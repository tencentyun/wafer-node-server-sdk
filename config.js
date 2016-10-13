'use strict';

exports = options => {
    options || (options = {});

    Object.keys(options).forEach(key => {
        if (exports.hasOwnProperty(key)) {
            exports[key] = String(options[key]);
        }
    });
};

// 当前使用 SDK 服务器的主机，该主机需要外网可访问
exports.ServerHost = '';

// 鉴权服务器服务地址
exports.AuthServerHost = '';

// 信道服务器服务地址
exports.TunnelServerHost = '';

// 信道服务签名密钥，该密钥需要保密
exports.TunnelSignatureKey = '';

module.exports = exports;