"use strict";

const nockExec = require('nock-exec');
const _        = require('lodash');
const varnish  = require('./varnish');

describe('varnish monitoring', () => {
    let report, options;
    const noop = () => {
    };

    const run = (done) => {
        return (cb) => {
            cb({}, report, done)
        };
    };
    beforeEach(() => {
        report = jasmine.createSpy('report');
    });
    afterEach(() => {
        varnish.reset();
    });

    it('write metrics', (done) => {
        nockExec(varnish.command).reply(0, JSON.stringify({ k1: { value: 1 }, k2: { value: 2 } }));

        varnish({
            run: run(() => {
                expect(report).toHaveBeenCalledTimes(2);
                expect(report).toHaveBeenCalledWith({
                    service: 'varnish.k1',
                    metric: 1
                });
                expect(report).toHaveBeenCalledWith({
                    service: 'varnish.k2',
                    metric: 2
                });
                done();
            })
        });
    });

    it('write additional metrics on second call', (done) => {
        nockExec(varnish.command).reply(0, JSON.stringify({ k1: { value: 1 }, k2: { value: 2 } }));

        varnish({
            run: run(() => {
                nockExec(varnish.command).reply(0, JSON.stringify({ k1: { value: 3 }, k2: { value: 6 } }));

                varnish({
                    run: run(() => {
                        expect(report).toHaveBeenCalledWith({
                            service: 'varnish.tick.k1',
                            metric: 2
                        });
                        expect(report).toHaveBeenCalledWith({
                            service: 'varnish.tick.k2',
                            metric: 4
                        });
                        done();
                    })
                });
            })
        });
    });
});

