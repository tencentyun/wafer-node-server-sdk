'use strict';

exports = options => {
    options || (options = {});

    Object.keys(options).forEach(key => {
        if (exports.hasOwnProperty(key)) {
            exports[key] = options[key];
        }
    });
};

// SDK 密钥，该密钥需要保密
exports.SecretKey = '';

// 当前使用 SDK 服务器的主机，该主机需要外网可访问
exports.ServerHost = '';

// 鉴权服务器服务地址
exports.AuthServerHost = '';

// 信道服务器服务地址
exports.TunnelServerHost = '';

module.exports = exports;