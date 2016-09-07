const options      = require('options-parser');
const EventEmitter = require('events');
const riemann      = require('riemannjs');
const _            = require('lodash');

class Runner extends EventEmitter {
    constructor(opts) {
        super();

        this.options = _.assign({}, opts || {}, {
            'host': { default: 'localhost ' },
            'port': { default: 5555, type: options.type.int() },
            'interval': { default: 30, type: options.type.int() },
            'tcp': { flag: true }
        });
        this.tick    = () => {
            this.runCallback(
                this.options,
                (event) => {
                    this.riemann.send(this.riemann.Event(event))
                },
                (err) => {
                    if (err) {
                        console.error(err);
                    }

                    setTimeout(this.tick, this.timeoutInterval);
                }
            );
        }
    }

    run(cb) {
        this.runCallback     = cb;
        this.options         = options.parse(this.options).opt;
        this.timeoutInterval = this.options.interval * 1000;
        this.riemann         = riemann.createClient({
            host: this.options.host,
            port: this.options.port,
            transport: !!this.options.tcp ? 'tcp' : 'udp'
        });

        setTimeout(this.tick, 0);
    }
}

module.exports = Runner;
