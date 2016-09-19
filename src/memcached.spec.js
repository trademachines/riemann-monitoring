"use strict";

const nock      = require('nock');
const _         = require('lodash');
const Mitm      = require('mitm');
const memcached = require('./memcached');

describe('memcached monitoring', () => {
    let report, options, mitm;
    const noop = () => {
    };

    const run = (done) => {
        return (cb) => {
            cb(options, report, done)
        };
    };

    const answer = (str) => {
        mitm.on('connection', (sock) => sock.write(str));
    };

    beforeEach(() => {
        options = {
            'memcached-host': 'localhost',
            'memcached-port': 12345
        };
        report  = jasmine.createSpy('report');
        mitm    = Mitm();
    });
    afterEach(() => {
        mitm.disable();
    });

    it('report metrics', (done) => {
        answer("STATS foo 3.14\r\nSTATS bar 26.11\r\nEND");

        memcached({
            run: run(() => {
                expect(report).toHaveBeenCalledWith({ service: 'memcached.foo', metric: 3.14 });
                expect(report).toHaveBeenCalledWith({ service: 'memcached.bar', metric: 26.11 });

                done();
            })
        });
    });
});

