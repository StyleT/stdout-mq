'use strict';

const expect = require('@itavy/test-utilities').getExpect();

const amqpChannelMock = {
  publish:     () => Promise.resolve(),
  close:       () => Promise.resolve(),
  queueLength: () => 0,
};

const amqpConnectionMock = {
  createChannel: () => amqpChannelMock,
  close:         () => Promise.resolve(),
};

const amqpLibMock = {
  connect: () => amqpConnectionMock,
};

const stringifiedMockMessage = 'stringifiedMockMessage';
const bStringifiedMockMessage = Buffer.from(stringifiedMockMessage);

const RabbitMqDeps = {
  uri:       '',
  stringify: () => stringifiedMockMessage,
  amqpLib:   amqpLibMock,
};

const testingError = Error('testing error');

const messageTest = {
  queue:    'testQueue',
  message:  'test message',
  exchange: 'test exchange',
};

/**
 * tests if provided error has expected name and has cause a specific error
 * @param {Error} error error to be tested
 * @returns {undefined} returns nothing on success
 */
const testExpectedError = ({ error }) => {
  expect(error).to.be.equal(testingError);
};

module.exports = {
  testExpectedError,
  testingError,
  RabbitMqDeps,
  amqpLibMock,
  amqpConnectionMock,
  amqpChannelMock,
  bStringifiedMockMessage,
  messageTest,
};
