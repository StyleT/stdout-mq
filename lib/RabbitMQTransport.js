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
   * @param {Function} callback to be called after close
   * @return {Promise<any>} Result
   * @public
   */
  close(callback) {
    return new Promise((resolve, reject) => {
      /**
       * Wait to publish messages in queue
       * @returns {void}
       */
      function waitToPublishMessagesInQueue() {
        if (this.channel.queueLength() !== 0) {
          /**
           * Need to do this because messages are going to be saved to queue first
           * When someone tries to close a channel these messages are going to be removed
           * Need to wait they'll be sent and close a connection then
           */
          setTimeout(waitToPublishMessagesInQueue.bind(this), 100);
          return;
        }

        this.channel.close()
          .then(() => this.connection.close())
          .then(() => {
            this.closing = true;
            this.channel = null;
            this.connection = null;
          })
          .then(resolve)
          .catch(reject);
      }

      if (!(this.connection && this.channel && !this.closing)) {
        return resolve();
      }

      return waitToPublishMessagesInQueue.call(this);
    }).then(() => callback()).catch((error) => {
      throw error;
    });
  }
}

module.exports = {
  RabbitMQTransport,
};
