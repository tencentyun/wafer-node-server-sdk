'use strict';

/* istanbul ignore next */
const debug = (() => {
    if (process.env.DEBUG_SDK !== 'yes') {
        return () => void(0);
    }

    const log = console.log.bind(console);

    return function () {
        log('========================================');
        log.apply(null, Array.from(arguments).map(message => {
            return (typeof message === 'object'
                ? JSON.stringify(message, null, 2)
                : message);
        }));
        log('========================================\n');
    };
})();

module.exports = debug;