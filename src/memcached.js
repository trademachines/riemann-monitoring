const _     = require('lodash');
const net   = require('net');

const omittedKeys = [ 'pid', 'uptime', 'time', 'version', 'libevent' ];

module.exports         = (runner) => {
    runner.run((opts, r, done) => {
        let data     = '';
        const client = net.connect(opts[ 'memcached-port' ], opts[ 'memcached-host' ]);

        client.on('data', (d) => {
            data += d.toString();

            if (/END/.test(data)) {
                const metrics =
                          _.chain(data)
                              .trim()
                              .split("\r\n")
                              .dropRight(1)
                              .map(x => _.chain(x).split(' ').drop(1).value())
                              .fromPairs()
                              .omit(...omittedKeys)
                              .value();

                Object.keys(metrics).forEach(k => r({ service: `memcached.${k}`, metric: parseFloat(metrics[ k ]) }));

                client.destroy();
                done();
            }

        });
        client.write("stats\r\n");
    });
};
module.exports.options = {
    'memcached-host': { default: 'localhost' },
    'memcached-port': { default: '11211' }
};
