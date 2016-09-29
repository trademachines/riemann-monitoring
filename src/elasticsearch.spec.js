"use strict";

const nock = require('nock');
const _    = require('lodash');
const es   = require('./elasticsearch');

describe('elasticsearch monitoring', () => {
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
            'es-host': 'localhost',
            'es-port': 9200,
        };
        report  = jasmine.createSpy('report');
    });

    describe('cluster health', () => {
        it('query cluster health', (done) => {
            const health = nock(/.*/).get('/_cluster/health').reply(200, {});

            es({
                run: run(() => {
                    expect(health.isDone()).toBe(true);
                    done();
                })
            });
        });

        it('report cluster health', (done) => {
            nock(/.*/).get('/_cluster/health').reply(200, { one: 1, two: 2 });

            es({
                run: run(() => {
                    expect(report).toHaveBeenCalledWith({
                        service: 'elasticsearch.cluster.one',
                        metric: 1
                    });
                    expect(report).toHaveBeenCalledWith({
                        service: 'elasticsearch.cluster.two',
                        metric: 2
                    });
                    done();
                })
            });
        });
    });

    describe('index stats', () => {
        let one, two;
        const oneData = {
            query_time_in_millis: 4,
            query_total: 4,
            fetch_time_in_millis: 2,
            fetch_total: 2
        };
        const twoData = {
            query_time_in_millis: 8,
            query_total: 4,
            fetch_time_in_millis: 4,
            fetch_total: 2
        };
        const stats   = (index, data) => {
            const total = { search: data || {} };
            const primaries = {
                docs: { count: 26, deleted: 11 },
                store: { size_in_bytes: 26, throttle_time_in_millis: 11 }
            };
            return nock(/.*/).get(`/${index}/_stats`).reply(200, { _all: { total: total, primaries: primaries } });
        };

        beforeEach(() => {
            options[ 'es-search-index' ] = [ 'one', 'two' ];

            one = stats('one', oneData);
            two = stats('two', twoData);

            nock(/.*/).persist().get('/_cluster/health').reply(200, {});
        });

        afterEach(() => {
            es.reset();
            nock.cleanAll();
        });

        it('query per given index', (done) => {
            es({
                run: run(() => {
                    expect(one.isDone()).toBe(true);
                    expect(two.isDone()).toBe(true);
                    done();
                })
            });
        });

        it('write per given index', (done) => {
            es({
                run: run(() => {
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.search.query.one', metric: 1 });
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.search.fetch.one', metric: 1 });
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.search.query.two', metric: 2 });
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.search.fetch.two', metric: 2 });
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.search.fetch.two', metric: 2 });
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.docs.one.count', metric: 26 });
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.docs.one.deleted', metric: 11 });
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.docs.two.count', metric: 26 });
                    expect(report).toHaveBeenCalledWith({ service: 'elasticsearch.docs.two.deleted', metric: 11 });
                    expect(report).toHaveBeenCalledWith({
                        service: 'elasticsearch.store.one.size_in_bytes',
                        metric: 26
                    });
                    expect(report).toHaveBeenCalledWith({
                        service: 'elasticsearch.store.one.throttle_time_in_millis',
                        metric: 11
                    });
                    expect(report).toHaveBeenCalledWith({
                        service: 'elasticsearch.store.two.size_in_bytes',
                        metric: 26
                    });
                    expect(report).toHaveBeenCalledWith({
                        service: 'elasticsearch.store.two.throttle_time_in_millis',
                        metric: 11
                    });

                    done();
                })
            });
        });

        it('write diff per index on second call', (done) => {
            es({
                run: run(() => {
                    one = stats('one', {
                        query_time_in_millis: 12,
                        query_total: 8,
                        fetch_time_in_millis: 6,
                        fetch_total: 4
                    });
                    two = stats('two', {
                        query_time_in_millis: 12,
                        query_total: 8,
                        fetch_time_in_millis: 6,
                        fetch_total: 4
                    });

                    es({
                        run: run(() => {
                            expect(report).toHaveBeenCalledWith({
                                service: 'elasticsearch.search.diff.query.one',
                                metric: 2
                            });
                            expect(report).toHaveBeenCalledWith({
                                service: 'elasticsearch.search.diff.fetch.one',
                                metric: 2
                            });
                            expect(report).toHaveBeenCalledWith({
                                service: 'elasticsearch.search.diff.query.two',
                                metric: 1
                            });
                            expect(report).toHaveBeenCalledWith({
                                service: 'elasticsearch.search.diff.fetch.two',
                                metric: 1
                            });

                            done();
                        })
                    });
                })
            });
        });
    });
});

