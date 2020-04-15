'use strict';

const tap = require('@itavy/test-utilities').getTap();
const fixtures = require('./Fixtures');
const spawn = require('child_process').spawn;
const path = require('path');


tap.test('Pino spawnProcess option test', (t) => {
  let checkConn;
  let msgCounter = 0;

  t.plan(fixtures.pinoTestMessages.length);
  t.tearDown(() => fixtures.closeTestConn({
    conn:      checkConn,
    transport: null,
  }));

  // eslint-disable-next-line require-jsdoc
  const receiveMessage = ({ message }) => {
    t.same(message.msg, fixtures.pinoTestMessages[msgCounter].msg);
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
      spawn('node', [
        path.join(__dirname, '..', '..', '..', 'stdout-mq.js'),
        '-c',
        path.join(__dirname, 'Fixtures', 'pino-mq.json'),
        '--spawnProcess',
        `node ${path.join(__dirname, 'Fixtures', 'pinoDelayed.js')}`,
      ]);
      // Debug code
      // child.stdout.on('data', (data) => console.log(data.toString()));
      // child.on('exit', (code, signal) => console.log(code, signal));
      // child.on('error', (e) => console.log(e));
    });
});
