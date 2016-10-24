'use strict';

module.exports = (req, res, next) => {
    const begin = Date.now();

    // wrap `res.send` method to log request/response info
    res.$send = (result, statusCode) => {
        const end = Date.now();
        const status = statusCode || 200;

        if (typeof result === 'string' && status !== 200) {
            result = { 'code': status, 'message': result };
        }

        debug('----------------------------------------');
        debug(`${req.method} ${req.path} => [${status || 200}]`, {
            '[请求]': req.body,
            '[响应]': result,
            '[耗时]': `${end - begin}ms`,
        });
        debug('----------------------------------------\n');

        res.status(status || 200).send(result);
    };

    next();
};