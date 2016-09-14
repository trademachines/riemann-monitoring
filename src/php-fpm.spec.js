"use strict";

const nock = require('nock');
const _    = require('lodash');
const fpm  = require('./php-fpm');

describe('php-fpm monitoring', () => {
    let report, options;
    const noop = () => {
    };

    const run            = (done) => {
        return (cb) => {
            cb(options, report, done)
        };
    };
    const statusResponse = {
        pool: 'www', 'process manager': 'dynamic',
        'start time': 100,
        'start since': 50,
        'accepted conn': 10,
        'listen queue': 0,
        'max listen queue': 0,
        'listen queue len': 128,
        'idle processes': 1,
        'active processes': 1,
        'total processes': 2,
        'max active processes': 1,
        'max children reached': 0,
        'slow requests': 0
    };
    beforeEach(() => {
        options = {
            'php-fpm-url': 'http://localhost/status',
        };
        report  = jasmine.createSpy('report');
    });
    afterEach(() => {
        fpm.reset();
    });

    it('query status', (done) => {
        const status = nock('http://localhost').get('/status?json').reply(200, {});

        fpm({
            run: run(() => {
                expect(status.isDone()).toBe(true);
                done();
            })
        });
    });

    it('write metrics', (done) => {
        nock('http://localhost').get('/status?json').reply(200, statusResponse);

        fpm({
            run: run(() => {
                expect(report).toHaveBeenCalledWith({
                    service: 'php-fpm.www.listen_queue',
                    metric: 0
                });
                expect(report).toHaveBeenCalledWith({
                    service: 'php-fpm.www.listen_queue_len',
                    metric: 128
                });
                expect(report).toHaveBeenCalledWith({
                    service: 'php-fpm.www.idle_processes',
                    metric: 1
                });
                expect(report).toHaveBeenCalledWith({
                    service: 'php-fpm.www.active_processes',
                    metric: 1
                });
                expect(report).toHaveBeenCalledWith({
                    service: 'php-fpm.www.total_processes',
                    metric: 2
                });
                expect(report).toHaveBeenCalledWith({
                    service: 'php-fpm.www.max_active_processes',
                    metric: 1
                });
                expect(report).toHaveBeenCalledWith({
                    service: 'php-fpm.www.max_children_reached',
                    metric: 0
                });

                done();
            })
        });
    });

    it('write additional metrics on second call', (done) => {
        nock('http://localhost').get('/status?json').reply(200, statusResponse);
        fpm({
            run: run(() => {
                nock('http://localhost').get('/status?json').reply(200, _.assign({}, statusResponse, {
                    'start since': statusResponse[ 'start since' ] + 10,
                    'accepted conn': statusResponse[ 'accepted conn' ] + 20
                }));

                fpm({
                    run: run(() => {
                        expect(report).toHaveBeenCalledWith({
                            service: 'php-fpm.www.accepted_conn_per_sec',
                            metric: 2
                        });
                        expect(report).toHaveBeenCalledWith({
                            service: 'php-fpm.www.tick.accepted_conn',
                            metric: 20
                        });

                        done();
                    })
                });
            })
        });
    });
});

