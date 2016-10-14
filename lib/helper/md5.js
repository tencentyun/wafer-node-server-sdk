const crypto = require('crypto');

module.exports = message => {
    return crypto.createHash('md5').update(message).digest('hex');
};