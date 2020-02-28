'use strict';

const shouldTryReconnectingAfter = (triedReconnect) => Math.pow(triedReconnect, 2) * 1000; // eslint-disable-line

/**
 * Logging RabbitMQ Transport
 */
class RabbitMQTransport {
  /**
   * @param {String} uri connection details
   * @param {Function} stringify function to JSON stringify object
   * @param {Number} maxTriesToReconnect how mamy times transport can try to reconnect
   * @param {Object} amqpLib amqp connect library
   */
  constructor({
    uri,
    stringify,
    amqpLib,
    maxTriesToReconnect,
    reconnectAfter = shouldTryReconnectingAfter,
  }) {
    this.connection = null;
    this.channel = null;

    this.mqURI = uri;
    this.stringify = stringify;
    this.amqpLib = amqpLib;
    this.maxTriesToReconnect = maxTriesToReconnect;
    this.reconnectAfter = reconnectAfter;

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
   * Reconnect to RabbitMQ
   * @param {any} data which are needed to send
   * @param {error} error rejected while trying write
   * @returns {Promise} Promise
   */
  reconnect(data, error) {
    if (this.triedReconnect >= this.maxTriesToReconnect) {
      return Promise.reject(error);
    }

    this.connection = null;
    this.channel = null;
    this.triedReconnect += 1;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.write(data).then(() => {
          this.triedReconnect = 0;
          return resolve();
        }).catch(reject);
      }, this.reconnectAfter(this.triedReconnect));
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
}

module.exports = {
  RabbitMQTransport,
};
