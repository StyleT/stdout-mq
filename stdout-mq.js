#!/usr/bin/env node
/* eslint-disable no-console */

'use strict';

const path = require('path');
// const { PassThrough } = require('stream');
const fs = require('fs');
const split = require('split2');
const pump = require('pump');
const nopt = require('nopt');
const through = require('through2');
const pkgInfo = require('./package.json');
const { isJSON } = require('./lib/Helpers');
const spawn = require('child_process').spawn;
const merge2 = require('merge2');

const defaultOptions = {
  type:     'RABBITMQ',
  uri:      null,
  exchange: '',
  queue:    null,
  fields:   null,
  config:   null,
};

const longOptions = {
  type:           ['RABBITMQ'],
  uri:            String,
  exchange:       String,
  queue:          String,
  fields:         String,
  config:         String,
  help:           Boolean,
  version:        Boolean,
  generateConfig: Boolean,
  wrapWith:       String,
  spawnProcess:   String,
};

const shortOptions = {
  t:  '--type',
  u:  '--uri',
  e:  '--exchange',
  q:  '--queue',
  f:  '--fields',
  c:  '--config',
  h:  '--help',
  v:  '--version',
  g:  '--generateConfig',
  ww: '--wrapWith',
  sp: '--spawnProcess',
};

const argv = nopt(longOptions, shortOptions, process.argv);
const configOptions = Object.assign({}, defaultOptions, argv);

if (configOptions.version) {
  console.log(pkgInfo.version);
  process.exit(0);
}

if (configOptions.help) {
  console.log(fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8'));
  process.exit(0);
}

if (configOptions.generateConfig) {
  const cfgSample = JSON.stringify({
    type:     'RABBITMQ',
    uri:      'amqp://guest:guest@localhost/',
    exchange: '',
    queue:    'pino-mq',
    fields:   [],
  }, null, ' ');
  fs.writeFileSync('pino-mq.json', cfgSample);
  console.log('Configuration is written in file "pino-mq.json"');
  console.log('You can use now:');
  console.log('\n\nnode script.js | pino-mq -c pino-mq.json\n\n');
  process.exit(0);
}

if (configOptions.fields && (configOptions.fields.length !== 0)) {
  configOptions.fields = configOptions.fields.split(',');
}

if (configOptions.config !== null) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const cfgFile = require(path.resolve(configOptions.config));
    Object.keys(configOptions).map((key) => {
      if (configOptions[key]) {
        return null;
      }
      if (cfgFile[key]) {
        configOptions[key] = cfgFile[key];
      }
      return null;
    });
  } catch (e) {
    console.log(`Error loading config file: ${e.message}`);
    process.exit(1);
  }
}

if (configOptions.uri === null) {
  if (!(
    process.env.MQ_PROTOCOL &&
    process.env.MQ_LOGIN &&
    process.env.MQ_PASSWORD &&
    process.env.MQ_HOST
  )) {
    console.log('You must specify connection uri or environment connection variables');
    process.exit(1);
  }
}

if (configOptions.wrapWith) {
  if (!configOptions.wrapWith.match('%DATA%')) {
    console.log('You must specify %DATA% at "--wrapWith" where it should pass stdout data');
    process.exit(1);
  }

  if (!isJSON(configOptions.wrapWith)) {
    console.log('"--wrapWith" should have JSON format');
    process.exit(1);
  }
}

// eslint-disable-next-line import/no-dynamic-require
const getMqTransport = require(path.join(__dirname, 'index')).getTransport;

/**
 * Get transport URI
 * @param {String} uri It is URI from cli args
 * @returns {String} Transport URI
 */
function getTransportURI(uri) {
  if (uri) {
    return uri;
  }

  const {
    MQ_PROTOCOL,
    MQ_LOGIN,
    MQ_PASSWORD,
    MQ_HOST,
  } = process.env;

  return `${MQ_PROTOCOL}://${MQ_LOGIN}:${encodeURIComponent(MQ_PASSWORD)}@${MQ_HOST}`;
}

const t = getMqTransport({
  type:            configOptions.type,
  transportParams: {
    uri: getTransportURI(configOptions.uri),
  },
  exchange: configOptions.exchange,
  queue:    configOptions.queue,
  fields:   configOptions.fields,
  wrapWith: configOptions.wrapWith,
});

const consoleLogger = through.obj(function transform(chunk, enc, cb) {
  this.push(chunk);
  console.log(chunk.toString(enc));
  cb();
});

if (!configOptions.spawnProcess) {
  process.on('SIGINT', t.close.bind(t));
  process.on('SIGTERM', t.close.bind(t));
  process.stdin.on('close', t.close.bind(t));

  pump(
    process.stdin,
    split(),
    consoleLogger,
    through.obj(t.write.bind(t), t.close.bind(t)), (err) => {
      if (err) {
        console.log(err);
        process.exit(34);
      }
    });
} else {
  const cmd = configOptions.spawnProcess.split(' ', 1)[0];
  const args = configOptions.spawnProcess.split(' ').slice(1);

  console.log(`Trying to run child process with cmd "${cmd}" & args "${args}"`);

  const child = spawn(cmd, args, {
    stdio: [
      'inherit', // StdIn.
      'pipe', // StdOut.
      'pipe', // StdErr.
    ],
  });
  console.log(`Running child process with PID "${child.pid}"`);

  child.on('exit', (code, signal) => {
    console.log(`Child process has finished execution. code=${code} signal=${signal}`);

    if (!child.killed) {
      t.close(() => process.exit(code));
    }
  });
  child.on('error', (error) => {
    console.log(`Child process error: ${error}`);
    t.close(() => process.exit(35));
  });

  /**
   * Forwards signals to child process
   * @param {string|number} signal Linux signal ID
   * @return {void}
   */
  const forwardSignal = (signal) => {
    console.log(`Receive ${signal} signal.`);
    if (!child.kill(signal)) {
      console.log('Child process failed to stop.');
      return;
    }
    console.log('Child process was succesfully stopped. Shutting down...');
  };

  process.on('SIGINT', forwardSignal);
  process.on('SIGTERM', forwardSignal);

  pump(
    merge2([child.stdout, child.stderr]),
    split(),
    consoleLogger,
    through.obj(t.write.bind(t), t.close.bind(t)), (err) => {
      if (err) {
        console.log('Unhandled exception happened, terminating the process...');
        console.log(err);
        /**
         * Exit the main process
         * @returns {void}
         */
        const processExit = () => {
          forwardSignal('SIGKILL');
          process.exit(34);
        };
        const processExitTimeout = setTimeout(processExit, 60 * 1000);

        child.once('exit', () => {
          clearTimeout(processExitTimeout);
          processExit();
        });

        forwardSignal('SIGTERM');
      }
    });
}

