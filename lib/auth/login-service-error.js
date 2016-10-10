'use strict';

class LoginServiceError extends Error {
    constructor(type, message) {
        super(message);

        this.type = type;
        this.message = message;
    }
}

module.exports = LoginServiceError;