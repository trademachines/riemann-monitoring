const http = require('http');

const get = (uri, cb, iteratee) => {
    http.get(uri, response => {
        let data = '';
        response.on('data', chunk => data += chunk.toString());
        response.on('end', () => {
            try {
                cb(null, typeof iteratee === 'function' ? iteratee(data) : data);
            } catch (e) {
                cb(e);
            }
        });
    }).on('error', cb);
};

module.exports.text = get;
module.exports.json = (uri, cb) => get(uri, cb, JSON.parse);
