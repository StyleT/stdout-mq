'use strict';

const expect = require('chai').expect;
const helpersLib = require('../../lib/Helpers');

describe('IsJSON', () => {
  it('Should return true when a provided string has JSON format', () => {
    expect(helpersLib.isJSON('{"array": ["string", {"number": 10}]}')).to.be.equal(true);
  });

  it('Should return false when a provided string does not have JSON format', () => {
    expect(helpersLib.isJSON('                                             ')).to.be.equal(false);
    expect(helpersLib.isJSON('object: {"array": ["string", {"number": 10}]}')).to.be.equal(false);
  });
});
