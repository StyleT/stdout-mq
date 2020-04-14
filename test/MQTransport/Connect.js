'use strict';

const testUtilities = require('@itavy/test-utilities');
const { MQTransport } = require('../../lib/MQTransport');
const fixtures = require('./Fixtures');

const expect = testUtilities.getExpect();

describe('Connect', () => {
  let sandbox;
  let testTransport;

  beforeEach((done) => {
    sandbox = testUtilities.getSinonSandbox();
    testTransport = Reflect.construct(MQTransport, [fixtures.mqtDeps.queue]);
    done();
  });

  afterEach((done) => {
    sandbox.restore();
    testTransport = null;
    done();
  });

  it('Should set connection `connect` and `disconnect` event handlers and emit events when connection is broken or restored', () => {
    const diconnectEventData = {
      error: new Error(),
    };
    const connectionEventHandlers = {};

    sandbox.stub(fixtures.mockTransport, 'on').callsFake((eventName, eventHandler) => {
      connectionEventHandlers[eventName] = eventHandler;
    });

    const onTestTransportDisconnectSpy = sandbox.spy();
    const onTestTransportConnectSpy = sandbox.spy();

    testTransport.on('disconnect', onTestTransportDisconnectSpy);
    testTransport.on('connect', onTestTransportConnectSpy);

    return testTransport.connect().then(() => {
      connectionEventHandlers.connect('some', 'args');
      connectionEventHandlers.disconnect(diconnectEventData);
    }).then(() => {
      expect(onTestTransportConnectSpy.getCall(0).args).to.be.eql([]);
      expect(onTestTransportDisconnectSpy.getCall(0).args).to.be.eql([{
        error: diconnectEventData.error,
      }]);
    }).finally(() => {
      testTransport.off('connect', onTestTransportConnectSpy);
      testTransport.off('disconnect', onTestTransportDisconnectSpy);
    });
  });
});

