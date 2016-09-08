"use strict";

const _      = require('lodash');
const Runner = require('./_runner');

describe('runner', () => {
    let runner, riemann, riemannClient;
    let noop   = () => {
    };
    const args = (...args) => {
        process.argv = [
            ...process.argv.slice(0, 2),
            ...args
        ];
    };

    beforeEach(() => {
        riemannClient = {
            send: noop,
            Event: x => x
        };
        riemann       = {
            createClient: () => riemannClient
        };
        runner        = new Runner(riemann);
    });

    describe('options handling', () => {
        it('no attributes gives empty array', () => {
            runner._parseOptions();

            expect(runner.options.attribute).toEqual([]);
        });

        it('attributes are mapped', () => {
            args('--attribute', 'foo=bar', '--attribute', 'one=two');
            runner._parseOptions();

            expect(runner.options.attribute).toEqual([ { key: 'foo', value: 'bar' }, { key: 'one', value: 'two' } ]);
        });

        it('timeout is turned into milliseconds', () => {
            args('--interval', '5');
            runner._parseOptions();

            expect(runner.timeoutInterval).toEqual(5000);
        });
    });

    describe('event handling', () => {
        let handler;

        beforeEach(() => {
            jasmine.clock().install();
            handler = jasmine.createSpy('handler').and.callFake((o, r, cb) => {
                cb();
            });
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it('call handler immediately', () => {
            runner.run(handler);
            jasmine.clock().tick(0);

            expect(handler).toHaveBeenCalled();
        });

        it('call handler after interval', () => {
            args('--interval', 1);

            runner.run(handler);
            jasmine.clock().tick(0);
            jasmine.clock().tick(1000);

            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('add attributes to event', () => {
            args('--attribute', 'foo=bar');
            spyOn(riemannClient, 'send');
            handler.and.callFake((o, r, cb) => {
                r({ some: 'data' });
            });
            runner.run(handler);
            jasmine.clock().tick(0);

            expect(riemannClient.send).toHaveBeenCalledWith({
                some: 'data',
                attributes: [ { key: 'foo', value: 'bar' } ]
            });
        });
    });
});

