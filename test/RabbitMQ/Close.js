'use strict';

const testUtilities = require('@itavy/test-utilities');
const { RabbitMQTransport } = require('../../lib/RabbitMQTransport');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('Close', () => {
  let sandbox;
  let testConnector;

  beforeEach((done) => {
    sandbox = testUtilities.getSinonSandbox();
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

  it('Should close a channel and a connection after all queued messages are sent', (done) => {
    const closeConnectionSpy = sandbox.spy(fixtures.amqpConnectionMock, 'close');
    const closeChannelSpy = sandbox.spy(fixtures.amqpChannelMock, 'close');
    const queueLengthStub = sandbox.stub(fixtures.amqpChannelMock, 'queueLength')
      .withArgs()
      .onFirstCall()
      .returns(5)
      .onSecondCall()
      .returns(2)
      .returns(0);

    testConnector.connect()
      .then(() => testConnector.close(() => {
        expect(queueLengthStub.callCount).to.be.equal(3);
        expect(closeConnectionSpy.callCount).to.be.equal(1);
        expect(closeChannelSpy.callCount).to.be.equal(1);

        expect(testConnector.closing).to.be.equal(true);
        expect(testConnector.channel).to.be.equal(null);
        expect(testConnector.connection).to.be.equal(null);
      }))
      .then(done)
      .catch(done);
  });

  it('Should close a connection and a channel immediatly if all queued messages are sent before', (done) => {
    const closeConnectionSpy = sandbox.spy(fixtures.amqpConnectionMock, 'close');
    const closeChannelSpy = sandbox.spy(fixtures.amqpChannelMock, 'close');
    const queueLengthStub = sandbox.spy(fixtures.amqpChannelMock, 'queueLength');

    testConnector.connect()
      .then(() => testConnector.close(() => {
        expect(queueLengthStub.callCount).to.be.equal(1);
        expect(closeConnectionSpy.callCount).to.be.equal(1);
        expect(closeChannelSpy.callCount).to.be.equal(1);

        expect(testConnector.closing).to.be.equal(true);
        expect(testConnector.channel).to.be.equal(null);
        expect(testConnector.connection).to.be.equal(null);
      }))
      .then(done)
      .catch(done);
  });

  it('Should close a connection and a channel once even if closing called multiple times', (done) => {
    const callbackSpy = sandbox.spy();
    const closeConnectionSpy = sandbox.spy(fixtures.amqpConnectionMock, 'close');
    const closeChannelSpy = sandbox.spy(fixtures.amqpChannelMock, 'close');
    const queueLengthStub = sandbox.spy(fixtures.amqpChannelMock, 'queueLength');

    testConnector.connect()
      .then(() => Promise.all([
        testConnector.close(callbackSpy),
        testConnector.close(callbackSpy),
        testConnector.close(callbackSpy),
      ]))
      .then(() => {
        expect(callbackSpy.callCount).to.be.equal(1);
        expect(queueLengthStub.callCount).to.be.equal(1);
        expect(closeConnectionSpy.callCount).to.be.equal(1);
        expect(closeChannelSpy.callCount).to.be.equal(1);

        expect(testConnector.closing).to.be.equal(true);
        expect(testConnector.channel).to.be.equal(null);
        expect(testConnector.connection).to.be.equal(null);
      })
      .then(done)
      .catch(done);
  });
});
