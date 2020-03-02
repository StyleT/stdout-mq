'use strict';


/**
 * Logging RabbitMQ Transport
 */
class RabbitMQTransport {
  /**
   * @param {String} uri broker details
   * @param {Function} stringify function to JSON stringify object
   * @param {Object} amqpLib amqp connect library
   * @param {String} queue or topic on which message will be sent
   * @param {String} exchange exchange to be used for sending message
   */
  constructor({ uri, stringify, amqpLib, exchange, queue }) {
    this.broker = null;

    this.stringify = stringify;
    this.amqpLib = amqpLib;

    this.config = this.amqpLib.withDefaultConfig({
      vhosts: {
        vhost: {
          connection: {
            url:   uri,
            retry: {
              min:      5000,
              max:      20000,
              strategy: 'linear',
            },
          },
          exchanges:    [exchange],
          queues:       [queue],
          publications: {
            publication: {
              exchange,
            },
          },
        },
      },
    });

    this.closing = false;
  }

  /**
   * Send message over MQ
   * @param {Object} message message to be sent
   * @returns {Promise} resolves on success
   * @public
   */
  write(message) {
    const { queues: [queue], publications } = this.config.vhosts.vhost;

    return this.connect()
      .then(() => this.broker.publish(
        publications.publication, Buffer.from(this.stringify(message)), queue))
      .catch((err) => {
        throw err;
      });
  }

  /**
   * Conect to RabbitMQ
   * @returns {Promise} resolves on success
   * @private
   */
  connect() {
    if (this.broker && this.channel) {
      return Promise.resolve();
    }

    return this.amqpLib.BrokerAsPromised.create(this.config).then((broker) => {
      this.broker = broker;
    }).catch((err) => {
      throw err;
    });
  }

  /**
   * Close broker to RabbitMQ
   * @param {Function} cb callback to be called after close
   * @return {undefined}
   * @public
   */
  close(cb) {
    if (this.broker && !this.closing) {
      this.closing = true;
      return this.broker.shutdown().then(() => cb());
    }
    return cb();
  }
}

module.exports = {
  RabbitMQTransport,
};
