'use strict';

const url = require('url');
const co = require('co');
const ServiceBase = require('../service-base');
const LoginService = require('../auth/login-service');
const debug = require('../helper/debug');
const md5 = require('../helper/md5');
const config = require('../../config');
const signature = require('./signature');
const tunnelClient = require('./tunnel-client');
const tunnelApi = require('./tunnel-api');

class TunnelService extends ServiceBase {
    /**
     * 广播消息到多个信道
     * @param  {Array} tunnelIds       信道IDs
     * @param  {String} messageType    消息类型
     * @param  {String} messageContent 消息内容
     */
    static broadcast(tunnelIds, messageType, messageContent) {
        debug(`${this.name} [broadcast] =>`, { tunnelIds, messageType, messageContent });
        return tunnelApi.emitMessage(tunnelIds, messageType, messageContent);
    }

    /**
     * 发送消息到指定信道
     * @param  {String} tunnelId       信道ID
     * @param  {String} messageType    消息类型
     * @param  {String} messageContent 消息内容
     */
    static emit(tunnelId, messageType, messageContent) {
        debug(`${this.name} [emit] =>`, { tunnelId, messageType, messageContent });
        return tunnelApi.emitMessage([tunnelId], messageType, messageContent);
    }

    /**
     * 关闭指定信道
     * @param  {String} tunnelId 信道ID
     */
    static closeTunnel(tunnelId) {
        debug(`${this.name} [closeTunnel] =>`, { tunnelId });
        return tunnelApi.emitPacket([tunnelId], 'close');
    }

    handle(handler, options) {
        handler || (handler = {});

        options = Object.assign({
            checkLogin: false,
            getBody: () => this.req.body,
        }, options || {});

        switch (this.req.method) {
        case 'GET':
            this.handleGet(handler, options);
            break;

        case 'POST':
            this.handlePost(handler, options);
            break;

        default:
            this.writeJsonResult({ 'code': 501, 'message': 'Not Implemented' }, 501);
            break;
        }
    }

    handleGet(handler, options) {
        co.wrap(function *() {
            let userInfo = null;
            let tunnelId, connectUrl;

            if (options.checkLogin) {
                try {
                    const loginService = new LoginService(this.req, this.res);
                    const result = yield loginService.check();
                    userInfo = result.userInfo;
                } catch (e) {
                    return;
                }
            }

            try {
                let body = yield tunnelApi.requestConnect(this.receiveUrl);
                let data = body.data;

                // 校验签名
                if (!signature.check(data, body.signature)) {
                    throw new Error('签名校验失败');
                }

                data = JSON.parse(data);
                tunnelId = data.tunnelId;
                connectUrl = data.connectUrl;
            } catch (e) {
                this.writeJsonResult({ 'error': e.message });
                return;
            }

            this.writeJsonResult({ 'url': connectUrl });
            handler.onRequest && handler.onRequest(tunnelId, userInfo);
        }).call(this);
    }

    handlePost(handler, options) {
        const packet = this._checkRequestBody(options.getBody());
        if (!packet) {
            return;
        }

        const tunnelId = packet.tunnelId;

        switch (packet.type) {
        case 'connect':
            handler.onConnect && handler.onConnect(tunnelId);
            break;

        case 'message':
            const result = this._decodePacketContent(packet);
            const type = result.messageType;
            const content = result.messageContent;
            handler.onMessage && handler.onMessage(tunnelId, type, content);
            break;

        case 'close':
            handler.onClose && handler.onClose(tunnelId);
            break;
        }
    }

    /**
     * 构建提交给 WebSocket 信道服务器推送消息的地址
     *
     * 构建过程如下：
     *   1. 从信道服务器地址得到其通信协议（http/https），如 https
     *   2. 获取当前服务器主机名，如 109447.qcloud.la
     *   3. 获得当前 HTTP 请求的路径，如 /tunnel
     *   4. 拼接推送地址为 https://109447.qcloud.la/tunnel
     */
    get receiveUrl() {
        if (!this._receiveUrl) {
            const protocol = url.parse(config.getTunnelServerUrl()).protocol;
            const hostname = config.getServerHost();
            const pathname = url.parse(this.req.url).pathname;
            this._receiveUrl = url.format({ protocol, hostname, pathname });
        }
        return this._receiveUrl;
    }

    _checkRequestBody(body) {
        debug(`${this.constructor.name} => [payload]`, body);

        if (typeof body !== 'object') {
            try {
                body = JSON.parse(body);
            } catch (e) {}
        }

        if (typeof body !== 'object') {
            this.writeJsonResult({
                'code': 9001,
                'message': 'Bad request - request data is not json',
            }, 400);
            return false;
        }

        if (!body.data || !body.signature) {
            this.writeJsonResult({
                'code': 9002,
                'message': 'Bad request - invalid request data',
            }, 400);
            return false;
        }

        // 校验签名
        if (!signature.check(body.data, body.signature)) {
            this.writeJsonResult({
                'code': 9003,
                'message': 'Bad request - check signature failed',
            }, 400);
            return false;
        }

        let data;
        try {
            data = JSON.parse(body.data);
        } catch (e) {
            this.writeJsonResult({
                'code': 9004,
                'message': 'Bad request - parse data failed',
            });
            return false;
        }

        this.writeJsonResult({ 'code': 0, 'message': 'ok' });
        return data;
    }

    _decodePacketContent(packet) {
        let packetContent = {};
        if (packet.content) {
            try {
                packetContent = JSON.parse(packet.content);
            } catch (e) {}
        }

        let messageType = packetContent.type || 'UnknownRaw';
        let messageContent = ('content' in packetContent
            ? packetContent.content
            : packet.content
        );

        return { messageType, messageContent };
    }
}

module.exports = TunnelService;