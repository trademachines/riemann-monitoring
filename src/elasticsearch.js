const http = require('http');
const _     = require('lodash');
const async = require('neo-async');
let last  = {};

module.exports = (runner) => {
    const get = (uri, cb) => {
        http.get(uri, response => {
            let data = '';
            response.on('data', chunk => data += chunk.toString());
            response.on('end', () => {
                try {
                    cb(null, JSON.parse(data));
                } catch (e) {
                    cb(e);
                }
            });
        }).on('error', cb);
    };

    runner.run((opts, r, done) => {
        const host    = `${opts[ 'es-host' ]}:${opts[ 'es-port' ]}`;
        const baseUrl = `http://${host}/`;

        async.parallel([
            (cb) => {
                get(`${baseUrl}_cluster/health`, (err, json) => {
                    if (err) return cb(err);

                    _.each(_.omit(json, 'timed_out', 'status', 'cluster_name'), (v, k) => {
                        r({ host: host, service: `elasticsearch.cluster.${k}`, metric: v });
                    });

                    cb();
                });
            },
            (cb) => async.each(opts[ 'es-search-index' ], (index, cb) => {
                get(`${baseUrl}${index}/_stats`, (err, json) => {
                    if (err) return cb(err);

                    const info = _.get(json, '_all.total.search', {
                        query_time_in_millis: 0,
                        query_total: 1,
                        fetch_time_in_millis: 0,
                        fetch_total: 1
                    });
                    info.query = info.query_time_in_millis / (info.query_total || 1);
                    info.fetch = info.fetch_time_in_millis / (info.fetch_total || 1);

                    if (last[ index ]) {
                        const queryTotalDiff = info.query_total - last[ index ].query_total;
                        const fetchTotalDiff = info.fetch_total - last[ index ].fetch_total;
                        const queryTimeDiff  = info.query_time_in_millis - last[ index ].query_time_in_millis;
                        const fetchTimeDiff  = info.fetch_time_in_millis - last[ index ].fetch_time_in_millis;

                        const queryDiff = queryTimeDiff / (queryTotalDiff || 1);
                        const fetchDiff = fetchTimeDiff / (fetchTotalDiff || 1);

                        r({ host: host, service: `elasticsearch.search.diff.query.${index}`, metric: queryDiff });
                        r({ host: host, service: `elasticsearch.search.diff.fetch.${index}`, metric: fetchDiff });
                        r({
                            host: host,
                            service: `elasticsearch.search.diff.query_total.${index}`,
                            metric: queryTotalDiff
                        });
                        r({
                            host: host,
                            service: `elasticsearch.search.diff.fetch_total.${index}`,
                            metric: fetchTotalDiff
                        });
                        r({
                            host: host,
                            service: `elasticsearch.search.diff.query_time.${index}`,
                            metric: queryTimeDiff
                        });
                        r({
                            host: host,
                            service: `elasticsearch.search.diff.fetch_time.${index}`,
                            metric: fetchTimeDiff
                        });
                    }

                    last[ index ] = info;

                    r({ host: host, service: `elasticsearch.search.query.${index}`, metric: info.query });
                    r({ host: host, service: `elasticsearch.search.fetch.${index}`, metric: info.fetch });

                    cb();
                });
            }, cb)
        ], done);
    });
};
module.exports.reset = () => {
    last = {};
};
module.exports.options = {
    'es-host': { default: 'localhost' },
    'es-port': { default: '9200' },
    'es-search-index': { default: [ '_all' ], multi: true }
};
