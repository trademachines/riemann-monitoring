const _     = require('lodash');
const async = require('neo-async');
const http  = require('./_http-stuff');

const fixValues      = [
    'listen queue', 'listen queue len',
    'idle processes', 'active processes', 'total processes',
    'max active processes', 'max children reached'
];
const cleanFixValues = _.zipObject(fixValues, _.map(fixValues, _.snakeCase));
let last             = null;

module.exports         = (runner) => {
    runner.run((opts, r, done) => {
        http.json(`${opts[ 'php-fpm-url' ]}?json`, (err, json) => {
            if (err) return done(err);

            const pool = json.pool;

            _.each(_.pick(json, ...fixValues), (v, k) => {
                r({ service: `php-fpm.${pool}.${cleanFixValues[ k ]}`, metric: v });
            });

            if (last) {
                const timeDiff            = json[ 'start since' ] - last[ 'start since' ];
                const acceptedDiff        = json[ 'accepted conn' ] - last[ 'accepted conn' ];
                const accepted = acceptedDiff / timeDiff;

                r({ service: `php-fpm.${pool}.accepted_conn_per_sec`, metric: accepted });
                r({ service: `php-fpm.${pool}.tick.accepted_conn`, metric: acceptedDiff });
            }

            last = json;
            done();
        });
    });
};
module.exports.reset   = () => {
    last = null;
};
module.exports.options = {
    'php-fpm-url': { default: 'http://localhost/status' },
};
