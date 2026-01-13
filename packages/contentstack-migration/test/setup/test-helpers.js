'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

// Setup sinon-chai plugin
chai.use(sinonChai);

// Make chai available globally
global.expect = chai.expect;
global.sinon = sinon;

// Helper to reset map instance
const { map: _map, constants } = require('../../src/utils');
const { getMapInstance, resetMapInstance } = _map;

exports.resetMap = () => {
  const mapInstance = getMapInstance();
  resetMapInstance(mapInstance);
};

exports.getMapInstance = getMapInstance;

// Helper to create mock callsite
exports.createMockCallsite = (filename = 'test.js', lineNumber = 1) => {
  return {
    getFileName: () => filename,
    getLineNumber: () => lineNumber,
  };
};

// Helper to create mock stack SDK instance
exports.createMockStackSDK = () => {
  return {
    contentType: sinon.stub().returns({
      fetch: sinon.stub().resolves({ content_type: { uid: 'test-ct', title: 'Test CT' } }),
      create: sinon.stub().resolves({ content_type: { uid: 'test-ct', title: 'Test CT' } }),
      update: sinon.stub().resolves({ content_type: { uid: 'test-ct', title: 'Test CT' } }),
      delete: sinon.stub().resolves({ content_type: { uid: 'test-ct' } }),
    }),
  };
};
