const _     = require('lodash');
const http  = require('./_http-stuff');

/**
 Active connections: 1
 server accepts handled requests
 1 1 1
 Reading: 0 Writing: 0 Waiting: 3
 */
const metricKeys  = [ 'active', 'accepted', 'handled', 'requests', 'reading', 'writing', 'waiting', 'req_per_connection' ];
const statusRegex = /Active connections: (\d+) \n.+\n (\d+) (\d+) (\d+) \nReading: (\d+) Writing: (\d+) Waiting: (\d+)/mi;

module.exports         = (runner) => {
    runner.run((opts, r, done) => {
        http.text(opts[ 'nginx-url' ], (err, txt) => {
            if (err) return done(err);

            const match = txt.match(statusRegex);
            if (!match) {
                return done(new Error(`Can not match message returned from nginx: ${txt}`));
            }

            const info = _.zipObject(metricKeys, [ ...match.slice(1, 8), match[ 4 ] / (match[ 3 ] || 1) ]);

            _.each(info, (v, k) => {
                r({ service: `nginx.${k}`, metric: parseInt(v) });
            });

            done();
        });
    });
};
module.exports.options = {
    'nginx-url': { default: 'http://localhost/nginx_status' },
};
