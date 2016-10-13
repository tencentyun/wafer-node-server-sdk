'use strict';

const http = require('http');

class ServiceBase {
    constructor(req, res) {
        if (!(req instanceof http.IncomingMessage)) {
            throw new Error(`${this.constructor.name}::req must be instanceof \`http.IncomingMessage\``);
        }

        if (!(res instanceof http.ServerResponse)) {
            throw new Error(`${this.constructor.name}::res must be instanceof \`http.ServerResponse\``);
        }

        this.req = req;
        this.res = res;
    }

    static create(req, res) {
        return new this(req, res);
    }

    writeJsonResult(obj, statusCode) {
        this.res.writeHead(statusCode || 200, { 'Content-Type': 'application/json; charset=utf-8' });
        this.res.end(JSON.stringify(obj));
    }

    getHeader(headerKey) {
        let key = String(headerKey).toLowerCase();
        return this.req.headers[key] || '';
    }
}

module.exports = ServiceBase;