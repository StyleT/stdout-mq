'use strict';

const tap = require('@itavy/test-utilities').getTap();
const fixtures = require('./Fixtures');
const exec = require('child_process').exec;
const path = require('path');

tap.test('Pino wrapWith option test', (t) => {
  let checkConn;
  let msgCounter = 0;

  t.plan(fixtures.pinoTestMessages.length * 3);
  t.tearDown(() => fixtures.closeTestConn({
    conn:      checkConn,
    transport: null,
  }));

  // eslint-disable-next-line require-jsdoc
  const receiveMessage = ({ message }) => {
    t.equal(message.ServiceName, 'test');
    t.equal(message.environment, 'test');
    t.equal(JSON.parse(message.msg).msg, fixtures.pinoTestMessages[msgCounter].msg);

    msgCounter += 1;
  };

  fixtures.setupTestConn({
    definitions: [
      {
        queue: fixtures.testsQueues.singleQueue.queue,
        cb:    receiveMessage,
      },
    ],
  })
    .then(({ conn }) => {
      checkConn = conn;
      exec(
        `node ${path.join(__dirname, 'Fixtures', 'pinoDelayed.js')} | ` +
        `node ${path.join(__dirname, '..', '..', '..', 'stdout-mq.js')} ` +
        `-c ${path.join(__dirname, 'Fixtures', 'pino-mq.json')} ` +
        '--wrapWith \'{"ServiceName": "test", "environment": "test", "msg": "%DATA%"}\'');
    });
});
