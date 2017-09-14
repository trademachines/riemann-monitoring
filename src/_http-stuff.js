const request = require('request');


const wrap = (options, cb) => {
  request(options, (err, response, body) => cb(err, body));
};

module.exports.text = (uri, cb) => wrap(uri, cb);
module.exports.json = (uri, cb) => wrap({url: uri, json: true}, cb);
