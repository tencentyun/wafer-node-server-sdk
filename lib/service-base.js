'use strict';

const http = require('http');
const debug = require('./helper/debug');

class ServiceBase {
    constructor(req, res) {
        if (!(req instanceof http.IncomingMessage)) {
            throw new Error(`${this.constructor.name}::req must be instanceof \`http.IncomingMessage\``);
        }

        if (!(res instanceof http.ServerResponse)) {
            throw new Error(`${this.constructor.name}::res must be instanceof \`http.ServerResponse\``);
        }

        Object.assign(this, { req, res });
    }

    static create(req, res) {
        return new this(req, res);
    }

    writeJsonResult(obj, statusCode) {
        statusCode || (statusCode = 200);

        this.res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        this.res.end(JSON.stringify(obj));

        debug(`${this.constructor.name} [writeJsonResult] => [${statusCode}]`, obj);
    }

    getHeader(headerKey) {
        let key = String(headerKey).toLowerCase();
        return this.req.headers[key] || '';
    }
}

module.exports = ServiceBase;