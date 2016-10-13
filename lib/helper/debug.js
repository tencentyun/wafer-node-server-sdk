'use strict';

const debug = (() => {
    return ((+process.env.DEBUG_SDK === 1)
        ? console.log.bind(console)
        : () => void(0));
})();

module.exports = function () {
    debug('========================================');
    debug.apply(debug, Array.from(arguments).map(item => {
        return (typeof item === 'object'
            ? JSON.stringify(item, null, 2)
            : item);
    }));
    debug('========================================\n');
};