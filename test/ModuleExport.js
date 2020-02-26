'use strict';

const expect = require('@itavy/test-utilities').getExpect();
const pinoMQModule = require('../lib/');
const { RabbitMQTransport } = require('../lib/RabbitMQTransport');

describe('Module Export', () => {
  it('Should have all required fields', (done) => {
    expect(pinoMQModule).to.be.an('object');

    const expectedKeys = [
      { name: 'getTransport', type: 'function' },
    ];

    expect(Object.keys(pinoMQModule).length).to.be.equal(expectedKeys.length);

    expectedKeys.map(el => expect(pinoMQModule[el.name]).to.be.a(el.type));
    done();
  });

  it('Should fail for missing queue configs', (done) => {
    expect(() => pinoMQModule.getTransport({}))
      .to.throw('You must provide queue!');
    return done();
  });

  it('Should fail for unknown transport', (done) => {
    expect(() => pinoMQModule.getTransport({ queue: 'test-queue', type: 'anotherTransport' }))
      .to.throw('Unknown transport type requested: anotherTransport.');
    return done();
  });

  it('Should instantiate with RabbitMQ transport and return original message', (done) => {
    const message = { hello: 'There is data' };
    const t = pinoMQModule.getTransport({ queue: 'test-queue', type: 'RABBITMQ' });
    expect(t.transport).to.be.instanceOf(RabbitMQTransport);
    expect(t.transformMessage(JSON.stringify(message))).to.be.eqls(message);
    return done();
  });

  describe('When "wrapWith" is provided', () => {
    it('Should return a message as an Object while "wrapWith" has JSON format', () => {
      const transport = pinoMQModule.getTransport({ queue: 'test-queue', type: 'RABBITMQ', wrapWith: '{"prop":"value", "data":"%DATA%"}' });

      expect(transport.transport).to.be.instanceOf(RabbitMQTransport);
      expect(transport.transformMessage('Hello! There is data')).to.be.eqls({ prop: 'value', data: 'Hello! There is data' });
      expect(transport.transformMessage(JSON.stringify({ hello: 'There is data' }))).to.be.eqls({ prop: 'value', data: '{\"hello\":\"There is data\"}' }); // eslint-disable-line
    });
  });
});
