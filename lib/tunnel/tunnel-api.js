'use strict';

const request = require('request');
const promisify = require('es6-promisify');
const co = require('co');
const config = require('../../config');
const signature = require('./signature');
const debug = require('../helper/debug');

module.exports = {
    requestConnect: co.wrap(function *(skey, receiveUrl) {
        let protocolType = 'wss';
        let param = { skey, receiveUrl, protocolType };
        return this._sendRequest('/get/wsurl', param);
    }),

    emitMessage: co.wrap(function *(tunnelIds, messageType, messageContent) {
        let packetType = 'message';
        let packetContent = JSON.stringify({
            'type': messageType,
            'content': messageContent,
        });

        return this.emitPacket(tunnelIds, packetType, packetContent);
    }),

    emitPacket: co.wrap(function *(tunnelIds, packetType, packetContent) {
        let param = { tunnelIds, 'type': packetType };
        if (packetContent) {
            param.content = packetContent;
        }

        return this._sendRequest('/ws/push', [param]);
    }),

    _sendRequest: co.wrap(function *(apiPath, apiParam) {
        let url = config.TunnelServerHost + apiPath;
        let data = this._packReqData(apiParam);

        let params = { url, 'body': data, 'json': true };
        let result = yield promisify(request.post, { multiArgs: true })(params);
        let statusCode = result[0].statusCode;
        let body = result[1] || {};

        // 记录请求日志
        debug(`POST ${url} => [${statusCode}]`, { '[请求]': data, '[响应]': body });

        if (statusCode !== 200) {
            throw new Error('请求信道 API 失败，网络异常或信道服务器错误');
        }

        if (!('code' in body)) {
            throw new Error('信道服务器响应格式错误，无法解析 JSON 字符串');
        }

        if (body.code !== 0) {
            throw new Error(`信道服务调用失败：${body.code} - ${body.message}`);
        }

        return body;
    }),

    _packReqData(data) {
        return { data, 'signature': signature.compute(data) };
    },
};