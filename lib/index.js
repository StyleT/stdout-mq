'use strict';

const rascal = require('rascal');
const { tryStringify, validateMqSettings } = require('./Helpers');

const RabbitMQTransport = require('./RabbitMQTransport').RabbitMQTransport;
const MQTransport = require('./MQTransport').MQTransport;

/**
 * Get transport type
 * @param {String} type transport type
 * @param {*} params specific transport parameters
 * @returns {Object} transport to be used
 */
const getTransportByType = (type, params) => {
  if (type === 'RABBITMQ') {
    return Reflect.construct(RabbitMQTransport, [
      Object.assign({}, params, {
        stringify: tryStringify,
        amqpLib:   rascal,
      }),
    ]);
  }
  throw Error(`Unknown transport type requested: ${type}.`);
};


/**
 * get transport
 * @param {String} type transport type
 * @param {Object} transportParams transport parameters
 * @param {String[]} [fields=[]] message fields to be send over transport
 * @returns {MQTransport} instantiated transport
 */
const getTransport = ({
  type,
  transportParams,
  fields = [],
  wrapWith,
}) => {
  validateMqSettings({ queue: transportParams.queue });
  return Reflect.construct(MQTransport, [
    {
      transport: getTransportByType(type, transportParams),
      fields,
      wrapWith,
    },
  ]);
};

module.exports = {
  getTransport,
};
