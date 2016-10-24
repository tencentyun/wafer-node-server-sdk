'use strict';

module.exports = (req, res) => {
    let data, tcId, tcKey, signature;

    try {
        ({ data, tcId, tcKey, signature } = req.body);
        data = JSON.parse(data);
    } catch (e) {
        return res.$send('Bad Request - 无法解析的 JSON 包', 400);
    }

    res.$send({
        code: 0,
        message: 'OK',
        data: JSON.stringify({
            tunnelId: 'tunnel1',
            connectUrl: 'wss://ws.qcloud.com/ws/tunnel1',
        }),
    });
};