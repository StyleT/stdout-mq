'use strict';

/**
 * Logging RabbitMQ Transport
 */
class RabbitMQTransport {
  /**
   * @param {String} uri connection details
   * @param {Function} stringify function to JSON stringify object
   * @param {Object} amqpLib amqp connect library
   */
  constructor({ uri, stringify, amqpLib }) {
    this.connection = null;
    this.channel = null;

    this.mqURI = uri;
    this.stringify = stringify;
    this.amqpLib = amqpLib;

    this.closing = false;
  }

  /**
   * Send message over MQ
   * @param {Object} message message to be sent
   * @param {String} queue queue or topic on which message will be sent
   * @param {String} [exchange=''] exchange to be used for sending message
   * @returns {Promise} resolves on success
   * @public
   */
  write({ message, queue, exchange = '' }) {
    return this.connect()
      .then(() => this.channel.publish(
        exchange,
        queue,
        Buffer.from(this.stringify(message))))
      .catch((err) => {
        throw err;
      });
  }

  /**
   * Connect to RabbitMQ
   * @returns {Promise} resolves on success
   * @private
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connection && this.channel) {
        return resolve();
      }

      try {
        this.connection = this.amqpLib.connect([this.mqURI]);
        this.channel = this.connection.createChannel();
      } catch (err) {
        return reject(err);
      }

      return resolve();
    });
  }

  /**
   * Close connection to RabbitMQ
   * @param {Function} cb callback to be called after close
   * @return {undefined}
   * @public
   */
  close(cb) {
    if (this.connection && this.channel && !this.closing) {
      if (this.channel.queueLength() === 0) {
        return this.channel.close().then(() => this.connection.close()).then(() => {
          this.closing = true;
          this.channel = null;
          this.connection = null;

          return cb();
        }).catch((err) => {
          throw err;
        });
      }

      setTimeout(() => this.close(cb), 100);
    }

    return cb();
  }
}

module.exports = {
  RabbitMQTransport,
};
