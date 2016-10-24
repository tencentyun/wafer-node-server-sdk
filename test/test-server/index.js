'use strict';

require('./globals');

const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const app = express();

app.use([
    // parse `application/json` media type
    bodyParser.json(),

    // add method `res.$send` to log request/response info
    require('./middlewares/logger'),

    // handle routes
    require('./routes'),

    // handle unknown routes
    function (req, res) {
        res.$send('Not Implemented', 501);
    },

    // handle internal error
    function (err, req, res, next) {
        const code = 500;
        const message = 'Internal Server Error';
        const error = `${err.message} - ${err.stack}`;
        res.$send({ code, message, error }, code);
    },
]);

const server = app.listen(config.port, () => {
    console.log('Test server is listening on port: %s', server.address().port);
});