const _     = require('lodash');
const async = require('neo-async');
const http  = require('./_http-stuff');

let last = {};

module.exports         = (runner) => {
  runner.run((opts, r, done) => {
    const host    = `${opts['es-host']}:${opts['es-port']}`;
    const baseUrl = `http://${host}/`;

    async.parallel([
      (cb) => {
        async.waterfall([
          (cb) => http.json(`${baseUrl}_cluster/health`, cb),
          (health, cb) => {

            _.each(_.omit(health, 'timed_out', 'status', 'cluster_name'), (v, k) => {
              r({service: `elasticsearch.cluster.${k}`, metric: v});
            });

            cb();
          }
        ], cb);
      },
      (cb) => async.each(opts['es-search-index'], (index, cb) => {
        http.json(`${baseUrl}${index}/_stats`, (err, json) => {
          if (err) {
            return cb(err);
          }

          _.each(['docs', 'store'], (t) => {
            _.each(_.get(json, `_all.primaries.${t}`, {}), (v, k) => {
              r({service: `elasticsearch.${t}.${index}.${k}`, metric: v});
            });
          });

          const searchInfo = _.get(json, '_all.total.search', {
            query_time_in_millis: 0,
            query_total: 1,
            fetch_time_in_millis: 0,
            fetch_total: 1
          });
          const mergeInfo  = _.get(json, '_all.total.merges', {
            total: 1,
            total_docs: 1,
            total_size_in_bytes: 0,
            total_time_in_millis: 0,
          });
          searchInfo.query = searchInfo.query_time_in_millis / (searchInfo.query_total || 1);
          searchInfo.fetch = searchInfo.fetch_time_in_millis / (searchInfo.fetch_total || 1);

          if (last[index]) {
            const queryTotalDiff = searchInfo.query_total - last[index].search.query_total;
            const fetchTotalDiff = searchInfo.fetch_total - last[index].search.fetch_total;
            const queryTimeDiff  = searchInfo.query_time_in_millis -
                                   last[index].search.query_time_in_millis;
            const fetchTimeDiff  = searchInfo.fetch_time_in_millis -
                                   last[index].search.fetch_time_in_millis;

            const queryDiff = queryTimeDiff / (queryTotalDiff || 1);
            const fetchDiff = fetchTimeDiff / (fetchTotalDiff || 1);

            r({service: `elasticsearch.search.diff.query.${index}`, metric: queryDiff});
            r({service: `elasticsearch.search.diff.fetch.${index}`, metric: fetchDiff});
            r({
              service: `elasticsearch.search.diff.query_total.${index}`,
              metric: queryTotalDiff
            });
            r({
              service: `elasticsearch.search.diff.fetch_total.${index}`,
              metric: fetchTotalDiff
            });
            r({
              service: `elasticsearch.search.diff.query_time.${index}`,
              metric: queryTimeDiff
            });
            r({
              service: `elasticsearch.search.diff.fetch_time.${index}`,
              metric: fetchTimeDiff
            });

            const mergeTotalDiff = mergeInfo.total - last[index].merges.total;
            const mergeDocsDiff  = mergeInfo.total_docs - last[index].merges.total_docs;
            const mergeSizeDiff  = mergeInfo.total_size_in_bytes -
                                   last[index].merges.total_size_in_bytes;
            const mergeTimeDiff  = mergeInfo.total_time_in_millis -
                                   last[index].merges.total_time_in_millis;

            r({
              service: `elasticsearch.merges.diff.total.${index}`,
              metric: mergeTotalDiff
            });
            r({
              service: `elasticsearch.merges.diff.docs.${index}`,
              metric: mergeDocsDiff
            });
            r({
              service: `elasticsearch.merges.diff.size_in_bytes.${index}`,
              metric: mergeSizeDiff
            });
            r({
              service: `elasticsearch.merges.diff.time_in_millis.${index}`,
              metric: mergeTimeDiff
            });
          }

          last[index] = {search: searchInfo, merges: mergeInfo};

          r({service: `elasticsearch.search.query.${index}`, metric: searchInfo.query});
          r({service: `elasticsearch.search.fetch.${index}`, metric: searchInfo.fetch});

          cb();
        });
      }, cb),
      (cb) => {
        async.waterfall([
          (cb) => http.json(`${baseUrl}`, cb),
          (server, cb) => http.json(`${baseUrl}_nodes/${server.name}/stats`, cb),
          (node, cb) => {
            let memory = _.chain(node)
              .get('nodes')
              .values().head()
              .get('jvm.mem')
              .defaults({heap_used_percent: 0})
              .value();

            r({service: `elasticsearch.jvm.memory.heap_used`, metric: memory.heap_used_percent});

            cb();
          }
        ], cb)
      }
    ], done);
  });
};
module.exports.reset   = () => {
  last = {};
};
module.exports.options = {
  'es-host': {default: 'localhost'},
  'es-port': {default: '9200'},
  'es-search-index': {default: ['_all'], multi: true}
};
