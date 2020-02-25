'use strict';

const sinon = require('sinon');
const { RabbitMQTransport } = require('../../lib/RabbitMQTransport');
const fixtures = require('./Fixtures');

const expect = require('chai').expect;

describe('Close', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = sinon.createSandbox();
    testConnector = Reflect.construct(RabbitMQTransport, [fixtures.RabbitMqDeps]);
    done();
  });

  afterEach((done) => {
    sandbox.restore();
    testConnector = null;
    done();
  });

  it('Should call connection close', (done) => {
    const closeSpy = sandbox.spy(fixtures.amqpLibMock, 'connect');

    testConnector.connect()
      .then(() => testConnector.close(() => {
        expect(closeSpy.callCount).to.be.equal(1);
        return done();
      }))
      .catch(err => done(err));
  });


  it('Should call cb provided when connection is not set', (done) => {
    const closeSpy = sandbox.spy(fixtures.amqpLibMock, 'connect');

    testConnector.close(() => {
      expect(closeSpy.callCount).to.be.equal(0);
      return done();
    });
  });
});
