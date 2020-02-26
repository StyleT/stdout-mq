'use strict';

const testUtilities = require('@itavy/test-utilities');
const helpersLib = require('../../lib/Helpers');

const expect = testUtilities.getExpect();

describe('ValidateMqSettings', () => {
  it('Should not validate', (done) => {
    const msgError = 'You must provide queue!';
    expect(() => helpersLib.validateMqSettings({})).to.throw(msgError);

    return done();
  });

  it('Should validate for queue only', (done) => {
    const tResp = helpersLib.validateMqSettings({ queue: 'testQueue' });
    expect(tResp).to.be.equal(true);

    return done();
  });
});
