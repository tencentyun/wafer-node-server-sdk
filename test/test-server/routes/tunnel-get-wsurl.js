'use strict';

module.exports = (req, res) => {
    res.$send({
        code: 0,
        message: 'OK',
        data: JSON.stringify({
            tunnelId: 'tunnel1',
            connectUrl: 'wss://ws.qcloud.com/ws/tunnel1',
        }),
        signature: 'fake_signature',
    });
};