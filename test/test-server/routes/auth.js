'use strict';

class Router extends RouterBase {
    handle() {
        let interfaceName, code, encrypt_data, iv, id, skey;

        try {
            // ES6 syntax (not work for node v4)
            /*({
                interface: {
                    interfaceName,
                    para: { code, encrypt_data, id, skey }
                }
            } = this.req.body);*/

            const body = this.req.body;
            interfaceName = body.interface.interfaceName;
            code = body.interface.para.code;
            encrypt_data = body.interface.para.encrypt_data;
            iv = body.interface.para.iv;
            id = body.interface.para.id;
            skey = body.interface.para.skey;
        } catch (err) {
            return this.res.$send('Bad Request - 无法解析的 JSON 包', 400);
        }

        switch (interfaceName) {
        case 'qcloud.cam.id_skey':
            this.handleLoginRequest(code, encrypt_data, iv);
            break;

        case 'qcloud.cam.auth':
            this.handleCheckRequest(id, skey);
            break;

        default:
            this.res.$send(`Bad Request - unknown interfaceName(${interfaceName})`, 400);
            break;
        }
    }

    handleLoginRequest(code, encryptData, iv) {
        if (this.respond4CommonErrors(code) !== false) {
            return;
        }

        if (code === 'valid-code' && encryptData === 'valid-data' && iv === 'valid-iv') {
            return this.res.$send({
                returnCode: 0,
                returnMessage: 'OK',
                returnData: {
                    id: 'success_id',
                    skey: 'success_skey',
                    user_info: {
                        nickName: 'fake_user',
                        gender: 0,
                    },
                },
            });
        }

        this.res.$send({
            returnCode: -1,
            returnMessage: 'invalid code, encrypt_data or iv',
        });
    }

    handleCheckRequest(id, skey) {
        if (this.respond4CommonErrors(id) !== false) {
            return;
        }

        if (id === 'valid-id' && skey === 'valid-skey') {
            return this.res.$send({
                returnCode: 0,
                returnMessage: 'OK',
                returnData: {
                    user_info: {
                        nickName: 'fake_user',
                        gender: 0,
                    },
                },
            });
        }

        if (id === 'expect-60011') {
            return this.res.$send({
                returnCode: 60011,
                returnMessage: 'ERR_60011',
            });
        }

        if (id === 'expect-60012') {
            return this.res.$send({
                returnCode: 60012,
                returnMessage: 'ERR_60012',
            });
        }

        this.res.$send({
            returnCode: -1,
            returnMessage: 'invalid id or skey',
        });
    }

    respond4CommonErrors(indicator) {
        switch (indicator) {
        case 'expect-500':
            return this.res.$send('Fake Server Error', 500);

        case 'expect-invalid-json':
            return this.res.$send('{invalidJson}');

        case 'expect-timeout':
            setTimeout(() => {
                this.res.$send('Timedout');
            }, 100);
            return;

        default:
            return false;
        }
    }
}

module.exports = Router.makeRouteHandler();