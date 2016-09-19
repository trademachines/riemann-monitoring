const _    = require('lodash');
const exec = require('child_process').exec;

const metricsKeys = [
    'MAIN.client_req', 'MAIN.sess_conn', 'MAIN.sess_dropped', 'MAIN.sess_queued',
    'MAIN.cache_hit', 'MAIN.cache_hitpass', 'MAIN.cache_miss',
    'MAIN.n_expired', 'MAIN.n_lru_nuked', 'MAIN.threads', 'MAIN.threads_created',
    'MAIN.threads_failed', 'MAIN.threads_limited', 'MAIN.thread_queue_len'
];
const command     = `varnishstat -1 -j -f ${metricsKeys.join(' -f ')}`;
let last          = null;

module.exports         = (runner) => {
    runner.run((opts, r, done) => {
        exec(command, (err, stdout, stderr) => {
            if (err) return done(err);
            let data;

            try {
                data = _.omit(JSON.parse(stdout), 'timestamp');
            } catch (e) {
                return done(err);
            }

            Object.keys(data).forEach(k => r({ service: `varnish.${k.toLowerCase()}`, metric: data[ k ].value }));

            if (last) {
                Object.keys(data).forEach(k => r({
                    service: `varnish.tick.${k.toLowerCase()}`,
                    metric: data[ k ].value - last[ k ].value
                }));
            }

            last = data;

            done();
        });
    });
};
module.exports.reset   = () => {
    last = null;
};
module.exports.options = {};
module.exports.command = command;
