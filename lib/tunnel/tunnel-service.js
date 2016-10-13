'use strict';

const url = require('url');
const co = require('co');
const ServiceBase = require('../service-base');
const LoginService = require('../auth/login-service');
const debug = require('../helper/debug');
const config = require('../../config');
const signature = require('./signature');
const tunnelApi = require('./tunnel-api');

class TunnelService extends ServiceBase {
    static broadcast(tunnelIds, messageType, messageContent) {
        debug('TunnelService [broadcast] =>', { tunnelIds, messageType, messageContent });
        return tunnelApi.emitMessage(tunnelIds, messageType, messageContent);
    }

    static emit(tunnelId, messageType, messageContent) {
        debug('TunnelService [emit] =>', { tunnelId, messageType, messageContent });
        return tunnelApi.emitMessage([tunnelId], messageType, messageContent);
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
                    let loginService = new LoginService(this.req, this.res);
                    let result = yield loginService.check();
                    userInfo = result.userInfo;
                } catch (e) {
                    return;
                }
            }

            try {
                let body = yield tunnelApi.requestConnect(config.SecretKey, this._buildReceiveUrl());
                let data = body.data;

                // 校验签名
                if (!signature.check(data, body.signature)) {
                    throw new Error('签名校验失败');
                }

                tunnelId = data.tunnelId;
                connectUrl = data.connectUrl;
            } catch (e) {
                this.writeJsonResult({ 'error': e.message });
                return;
            }

            this.writeJsonResult({ url: connectUrl });
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
            let result = this._decodePacketContent(packet);
            let type = result.messageType;
            let content = result.messageContent;
            handler.onMessage && handler.onMessage(tunnelId, type, content);
            break;

        case 'close':
            handler.onClose && handler.onClose(tunnelId);
            break;
        }
    }

    _buildReceiveUrl() {
        let protocol = url.parse(config.TunnelServerHost).protocol;
        let hostname = config.ServerHost;
        let pathname = url.parse(this.req.url).pathname;
        return url.format({ protocol, hostname, pathname });
    }

    _checkRequestBody(body) {
        debug('TunnelService::handle [post payload] =>', body);
        body || (body = {});

        if (typeof body !== 'object') {
            try {
                body = JSON.parse(body);
            } catch (e) {}
        }

        if (typeof body !== 'object') {
            this.writeJsonResult({
                'code': 9001,
                'message': 'Bad request - request data is not json',
            });
            return false;
        }

        if (!body.data || !body.signature) {
            this.writeJsonResult({
                'code': 9002,
                'message': 'Bad request - invalid request data',
            });
            return false;
        }

        // 校验签名
        /*if (!signature.check(body.data, body.signature)) {
            this.writeJsonResult({
                'code': 9003,
                'message': 'Bad request - check signature failed',
            });
            return false;
        }*/

        this.writeJsonResult({ 'code': 0, 'message': 'ok' });
        return body.data;
    }

    _decodePacketContent(packet) {
        let packetContent = {};

        if (packet.content) {
            try {
                packetContent = JSON.parse(packet.content);
            } catch (e) {}
        }

        return {
            'messageType': packetContent.type || 'UnknownRaw',
            'messageContent': packetContent.content || '',
        };
    }
}

module.exports = TunnelService;