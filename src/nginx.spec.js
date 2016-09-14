"use strict";

const nock  = require('nock');
const _     = require('lodash');
const nginx = require('./nginx');

describe('nginx monitoring', () => {
    let report, options;
    const noop = () => {
    };

    const run = (done) => {
        return (cb) => {
            cb(options, report, done)
        };
    };

    beforeEach(() => {
        options = {
            'nginx-url': 'http://localhost/nginx_status'
        };
        report  = jasmine.createSpy('report');
    });

    it('query status', (done) => {
        const health = nock('http://localhost').get('/nginx_status').reply(200, '');

        nginx({
            run: run(() => {
                expect(health.isDone()).toBe(true);
                done();
            })
        });
    });

    it('dont report if not able to match', (done) => {
        const health = nock('http://localhost').get('/nginx_status').reply(200, 'msg');

        nginx({
            run: run((err) => {
                expect(err).toEqual(new Error('Can not match message returned from nginx: msg'));
                expect(report).not.toHaveBeenCalled();
                done();
            })
        });
    });

    it('report metrics', (done) => {
        const status = `Active connections: 4 
server accepts handled requests
 4 4 8 
Reading: 0 Writing: 1 Waiting: 3`;

        const health = nock('http://localhost').get('/nginx_status').reply(200, status);

        nginx({
            run: run(() => {
                // const metricKeys  = [ 'active', 'accepted', 'handled', 'requests', 'reading', 'writing', 'waiting', 'req_per_connection' ];
                expect(report).toHaveBeenCalledWith({ service: 'nginx.active', metric: 4 });
                expect(report).toHaveBeenCalledWith({ service: 'nginx.accepted', metric: 4 });
                expect(report).toHaveBeenCalledWith({ service: 'nginx.handled', metric: 4 });
                expect(report).toHaveBeenCalledWith({ service: 'nginx.requests', metric: 8 });
                expect(report).toHaveBeenCalledWith({ service: 'nginx.reading', metric: 0 });
                expect(report).toHaveBeenCalledWith({ service: 'nginx.writing', metric: 1 });
                expect(report).toHaveBeenCalledWith({ service: 'nginx.waiting', metric: 3 });
                expect(report).toHaveBeenCalledWith({ service: 'nginx.req_per_connection', metric: 2 });

                done();
            })
        });
    });
});

