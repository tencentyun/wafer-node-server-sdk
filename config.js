'use strict';

const conf = {
    // 当前使用 SDK 服务器的主机，该主机需要外网可访问
    ServerHost: '',

    // 鉴权服务器服务地址
    AuthServerUrl: '',

    // 信道服务器服务地址
    TunnelServerUrl: '',

    // 和信道服务器通信的签名密钥，该密钥需要保密
    TunnelSignatureKey: '',

    // 信道服务通信是否需要校验签名
    TunnelCheckSignature: true,

    // 网络请求超时时长（单位：毫秒）
    NetworkTimeout: 30 * 1000,
};

exports = options => {
    options || (options = {});

    Object.keys(options).forEach(key => {
        const value = options[key];

        if (key in conf && typeof value === typeof conf[key]) {
            conf[key] = value;
        }
    });
};

Object.keys(conf).forEach(key => {
    // 获取配置项
    exports[`get${key}`] = () => {
        const value = conf[key];

        if (typeof value === 'string' && !value) {
            throw new Error(`\`${key}\`不能为空，请确保 SDK 配置已正确初始化`);
        }

        return value;
    };

    // 设定配置项
    exports[`set${key}`] = val => {
        conf[key] = val;
    };
});

module.exports = exports;