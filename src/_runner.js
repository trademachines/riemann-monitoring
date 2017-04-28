const options = require('options-parser');
const _       = require('lodash');

class Runner {
    constructor(riemann, opts) {
        this.riemann = riemann;
        this.options = _.assign({}, opts || {}, {
            'host': { default: 'localhost ' },
            'port': { default: 5555, type: options.type.int() },
            'interval': { default: 30, type: options.type.int() },
            'tcp': { flag: true },
            'attribute': { multi: true }
        });
        this.tick    = () => {
            try {
              this.runCallback(
                this.options,
                (event) => {
                  this.riemannClient.send(this.riemannClient.Event(
                    _.assign({}, { attributes: this.options.attribute }, event)
                  ));
                },
                (err) => {
                  if (err) {
                    console.error(err);
                  }

                  setTimeout(this.tick, this.timeoutInterval);
                }
              );
            } catch (e) {
              console.error(e);
              setTimeout(this.tick, this.timeoutInterval);
            }
        }
    }

    _parseOptions() {
        this.options           = options.parse(this.options).opt;
        this.options.attribute = _.chain(this.options.attribute)
            .map(a => a.split('=', 2))
            .map(x => _.zipObject([ 'key', 'value' ], x))
            .value();

        this.timeoutInterval = this.options.interval * 1000;
        this.riemannClient   = this.riemann.createClient({
            host: this.options.host,
            port: this.options.port,
            transport: !!this.options.tcp ? 'tcp' : 'udp'
        });
    }

    run(cb) {
        this.runCallback = cb;
        this._parseOptions();
        setTimeout(this.tick, 0);
    }
}

module.exports = Runner;
