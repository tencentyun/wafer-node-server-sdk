'use strict';

const co = require('co');
const config = require('../../config');
const signature = require('./signature');
const tunnelClient = require('./tunnel-client');
const net = require('../helper/net');
const debug = require('../helper/debug');

module.exports = {
    requestConnect(receiveUrl) {
        let protocolType = 'wss';
        let param = { receiveUrl, protocolType };
        return this._sendRequest('/get/wsurl', param, true);
    },

    emitMessage(tunnelIds, messageType, messageContent) {
        let packetType = 'message';
        let packetContent = JSON.stringify({
            'type': messageType,
            'content': messageContent,
        });

        return this.emitPacket(tunnelIds, packetType, packetContent);
    },

    emitPacket(tunnelIds, packetType, packetContent) {
        let param = { tunnelIds, 'type': packetType };
        if (packetContent) {
            param.content = packetContent;
        }

        return this._sendRequest('/ws/push', [param], false);
    },

    _sendRequest: co.wrap(function *(apiPath, apiParam, withTcKey) {
        let url = config.getTunnelServerUrl() + apiPath;
        let data = this._packReqData(apiParam, withTcKey);

        let params = { url, 'body': data };

        let begin = Date.now();
        let result = yield net.jsonPost(params);
        let end = Date.now();

        let statusCode = result[0].statusCode;
        let body = result[1];

        // 记录请求日志
        debug(`POST ${url} => [${statusCode}]`, {
            '[请求]': data,
            '[响应]': body,
            '[耗时]': `${end - begin}ms`,
        });

        if (statusCode !== 200) {
            throw new Error('请求信道 API 失败，网络异常或信道服务器错误');
        }

        if (!body || typeof body !== 'object' || !('code' in body)) {
            throw new Error('信道服务器响应格式错误，无法解析 JSON 字符串');
        }

        if (body.code !== 0) {
            throw new Error(`信道服务调用失败：${body.code} - ${body.message}`);
        }

        return body;
    }),

    _packReqData(data, withTcKey) {
        let result;

        data = JSON.stringify(data);
        result = { data, 'tcId': tunnelClient.Id };

        if (withTcKey) {
            result.tcKey = tunnelClient.Key;
        }

        result.signature = signature.compute(data);
        return result;
    },
};