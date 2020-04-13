'use strict';

const parseUrl = require('url-parse');
const EventEmitter = require('events').EventEmitter;

/**
 * Logging RabbitMQ Transport
 */
class RabbitMQTransport extends EventEmitter {
  /**
   * @param {String} uri connection details
   * @param {Function} stringify function to JSON stringify object
   * @param {Object} amqpLib amqp connect library
   */
  constructor({ uri, stringify, amqpLib }) {
    super();

    this.connection = null;
    this.channel = null;
    this.closing = false;

    this.mqURI = uri;
    this.stringify = stringify;
    this.amqpLib = amqpLib;
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
      if (this.connection !== null && this.channel !== null) {
        return resolve();
      }

      try {
        const parsedUrl = parseUrl(this.mqURI);

        this.connection = this.amqpLib.connect([{
          protocol: parsedUrl.protocol.slice(0, -1), // amqp: => amqp
          hostname: parsedUrl.hostname,
          port:     parsedUrl.port,
          username: parsedUrl.username,
          password: decodeURIComponent(parsedUrl.password),
          vhost:    parsedUrl.pathname.slice(1), // /pathname => pathname
        }]);
        this.connection.on('disconnect', this.onConnectionDisconnect.bind(this));
        this.connection.on('connect', this.onConnectionConnect.bind(this));

        this.channel = this.connection.createChannel();
      } catch (error) {
        return reject(error);
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
    if (this.closing === true) {
      return Promise.resolve();
    }

    this.closing = true;

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
            this.channel = null;
            this.connection = null;
          })
          .then(resolve)
          .catch(reject);
      }

      if (this.connection === null && this.channel === null) {
        return resolve();
      }

      return waitToPublishMessagesInQueue.call(this);
    }).then(() => callback()).catch((error) => {
      throw error;
    });
  }

  /**
   * Handle a connection disconnect event
   * @param {Object} event Event details
   * @param {Error} err Error details
   * @returns {void}
   */
  onConnectionDisconnect({
    err: error,
  }) {
    this.emit('disconnect', {
      error,
    });
  }

  /**
   * Handle a connection connect event
   * @param {Object} event Event details
   * @returns {void}
   */
  onConnectionConnect({
    connection,
    url: urlString,
  }) {
    if (!(this.connection && this.connection.isConnected())) {
      return;
    }

    this.emit('connect', {
      connection,
      url: urlString,
    });
  }
}

module.exports = {
  RabbitMQTransport,
};
