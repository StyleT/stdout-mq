'use strict';

const { isJSON } = require('./Helpers');
const EventEmitter = require('events').EventEmitter;

/**
 * MQTransport logs
 */
class MQTransport extends EventEmitter {
  /**
   * @param {Object} transport mq transport to be used
   * @param {String} [exchange=''] exchange to be used for sending messages
   * @param {String} [queue=null] queue for distributing messages
   * @param {String[]} [fields=[]] message fields to be send over transport
   * @param {Function} [transformMessage=message => message] transformMessage message transformer
   */
  constructor({
    transport,
    exchange = '',
    queue = null,
    fields = [],
    wrapWith,
  }) {
    super();

    this.transport = transport;
    this.transport.on('disconnect', this.onTransportDisconnect.bind(this));
    this.transport.on('connect', this.onTransportConnect.bind(this));

    this.fields = fields;
    this.wrapWith = wrapWith;
    this.exchange = exchange;

    this.getMessageQueue = () => Promise.resolve({ queue });
  }

  /**
   * @param {Object} chunk message to be logged
   * @param {String} enc encoding
   * @param {Function} cb cb to be called after message is sent
   * @returns {undefined}
   * @public
   */
  write(chunk, enc, cb) {
    this.getMessageQueue(chunk)
      .then(({ queue }) => this.transport.write({
        message:  this.transformMessage(chunk),
        exchange: this.exchange,
        queue,
      }))
      .then(() => cb())
      .catch(err => cb(err));
  }

  /**
   * @param {Buffer} chunk message from stdin
   * @returns {Object} transformed message
   */
  transformMessage(chunk) {
    let schunk = chunk.toString('utf-8');
    const jsonMsg = isJSON(schunk);

    if (jsonMsg && this.fields && this.fields.length !== 0) {
      let buf = JSON.parse(schunk);
      buf = Object.assign(...this.fields.map(e => ({ [e]: buf[e] })));
      schunk = JSON.stringify(buf);
    }

    if (this.wrapWith) {
      schunk = JSON.stringify(schunk).replace(/(^"|"$)/g, '');
      schunk = this.wrapWith.split('%DATA%').join(schunk);

      return JSON.parse(schunk);
    }

    return jsonMsg ? JSON.parse(schunk) : { msg: schunk };
  }

  /**
   * Forwards close to transport
   * @param {Function} cb callback to be called after close
   * @return {undefined}
   * @public
   */
  close(cb) {
    if (cb) {
      return this.transport.close(cb);
    }
    return this.transport.close(() => null);
  }

  /**
   * Handle a transport disconnect event
   * @param {Object} event data
   * @param {Error} event.error details
   * @returns {void}
   */
  onTransportDisconnect({
    error,
  }) {
    this.emit('disconnect', {
      error,
    });
  }

  /**
   * Handle a transport connect event
   * @returns {void}
   */
  onTransportConnect() {
    this.emit('connect');
  }
}

module.exports = {
  MQTransport,
};
