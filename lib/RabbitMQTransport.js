'use strict';

const DEFAULT_MAX_TRY_TO_RECONNECT = 3;

/**
 * Logging RabbitMQ Transport
 */
class RabbitMQTransport {
  /**
   * @param {String} uri connection details
   * @param {Function} stringify function to JSON stringify object
   * @param {Number} maxTryToReconnect how mamy times transport can try to reconnect
   * @param {Object} amqpLib amqp connect library
   */
  constructor({ uri, stringify, amqpLib, maxTryToReconnect = DEFAULT_MAX_TRY_TO_RECONNECT }) {
    this.connection = null;
    this.channel = null;

    this.mqURI = uri;
    this.stringify = stringify;
    this.amqpLib = amqpLib;
    this.maxTryToReconnect = maxTryToReconnect;

    this.closing = false;
    this.triedReconnect = 0;
  }

  /**
   * Send message over MQ
   * @param {Object} data.message message to be sent
   * @param {String} queue.queue or topic on which message will be sent
   * @param {String} data[exchange=''] exchange to be used for sending message
   * @returns {Promise} resolves on success
   * @public
   */
  write(data) {
    return this.connect()
      .then(() => new Promise((resolve, reject) => {
        const { message, queue, exchange = '' } = data;
        const publishResult =
          this.channel.publish(exchange, queue, Buffer.from(this.stringify(message)));
        if (publishResult) {
          return resolve();
        }
        return reject(Error('Error sending message on MQ'));
      }))
      .catch(error => this.reconnect(data, error));
  }

  /**
   * Connect to RabbitMQ
   * @returns {Promise} resolves on success
   * @private
   */
  connect() {
    if (this.connection && this.channel) {
      return Promise.resolve();
    }
    return this.amqpLib.connect(this.mqURI)
      .then((connection) => {
        this.connection = connection;
        return this.connection.createConfirmChannel();
      })
      .then((pchannel) => {
        this.channel = pchannel;
        return Promise.resolve();
      });
  }

  /**
   * Close connection to RabbitMQ
   * @param {Function} cb callback to be called after close
   * @return {undefined}
   * @public
   */
  close(cb) {
    if (this.channel && !this.closing) {
      this.closing = true;
      return this.channel.waitForConfirms()
        .then(() => this.connection.close(() => cb()));
    }
    return cb();
  }

  /**
   * Reconnect to RabbitMQ
   * @param {any} data which are needed to send
   * @param {error} error rejected while trying write
   * @returns {Promise} Promise
   */
  reconnect(data, error) {
    if (this.triedReconnect >= this.maxTryToReconnect) {
      return Promise.reject(error);
    }

    this.triedReconnect += 1;
    const reconnectAfter = Math.pow(this.triedReconnect, 2) * 1000; // eslint-disable-line

    this.connection = null;
    this.channel = null;

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('AMQP: Transport is trying to reconnect to RabbitMQ'); // eslint-disable-line
        this.write(data).then(() => {
          this.triedReconnect = 0;
          return resolve();
        });
      }, reconnectAfter);
    });
  }
}

module.exports = {
  RabbitMQTransport,
};
