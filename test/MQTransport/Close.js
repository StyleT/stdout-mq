'use strict';

const sinon = require('sinon');
const { MQTransport } = require('../../lib/MQTransport');
const fixtures = require('./Fixtures');

const expect = require('chai').expect;

describe('Close', () => {
  let sandbox;
  let testTransport;

  beforeEach((done) => {
    sandbox = sinon.createSandbox();
    testTransport = Reflect.construct(MQTransport, [fixtures.mqtDeps.queue]);
    done();
  });

  afterEach((done) => {
    sandbox.restore();
    testTransport = null;
    done();
  });

  it('Should call cb provided', (done) => {
    const transportCloseSpy = sandbox.spy(fixtures.mockTransport, 'close');
    const cbSpy = sandbox.spy();

    testTransport.close(cbSpy);

    expect(transportCloseSpy.callCount).to.be.equal(1);
    expect(cbSpy.callCount).to.be.equal(1);

    return done();
  });

  it('if no callback provided it should provide a dummy one', (done) => {
    const transportCloseSpy = sandbox.spy(fixtures.mockTransport, 'close');

    testTransport.close();

    expect(transportCloseSpy.callCount).to.be.equal(1);
    expect(transportCloseSpy.getCall(0).args[0]).to.be.a('function');

    return done();
  });
});
