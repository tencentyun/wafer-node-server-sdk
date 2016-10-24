'use strict';

global.RouterBase = require('./common/routerbase');

global.debug = (() => {
    const log = console.log.bind(console);

    return function () {
        log.apply(null, Array.from(arguments).map(item => {
            return (typeof item === 'object'
                ? JSON.stringify(item, null, 2)
                : item);
        }));
    };
})();