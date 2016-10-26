'use strict';

module.exports = (req, res) => {
    const data = JSON.parse(req.body.data);
    const echo = data[0].tunnelIds[0];

    switch (echo) {
    case 'expect-500':
        return res.$send('Fake Server Error', 500);

    case 'expect-invalid-json':
        return res.$send('{invalidJson}');

    case 'expect-failed-result':
        res.$send({ code: -1, message: 'something wrong happened', data: {} });
        return;

    default:
        res.$send({ code: 0, message: 'OK', data: {} });
    }
};