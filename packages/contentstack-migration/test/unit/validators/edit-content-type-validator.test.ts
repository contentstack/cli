import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import EditContentTypeValidator from '../../../src/validators/edit-content-type-validator';
import * as mapModule from '../../../src/utils/map';

describe('Edit Content Type Validator', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let validator: EditContentTypeValidator;
  let getStub: SinonStub;
  let mockMapInstance: Map<string, any>;

  beforeEach(() => {
    sandbox = createSandbox();
    validator = new EditContentTypeValidator();
    validator.errors = []; // Reset errors array
    mockMapInstance = new Map();
    
    sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    getStub = sandbox.stub(mapModule, 'get').callsFake((id: string, mapInstance: Map<string, any>, data?: any) => {
      // Read from mockMapInstance (closure) first to ensure we get test data
      let existing = mockMapInstance.get(id);
      if (existing !== undefined) {
        return existing;
      }
      // Also check mapInstance parameter (should be same as mockMapInstance, but check both)
      existing = mapInstance.get(id);
      if (existing !== undefined) {
        return existing;
      }
      // If not found, set default and return it (matching real get behavior)
      const defaultValue = data !== undefined ? data : {};
      mapInstance.set(id, defaultValue);
      mockMapInstance.set(id, defaultValue);
      return defaultValue;
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should export EditContentTypeValidator class', () => {
    expect(EditContentTypeValidator).to.exist;
  });

  it('should be instantiable', () => {
    expect(validator).to.be.instanceOf(EditContentTypeValidator);
    expect(validator.errors).to.be.an('array');
    expect(validator.errors.length).to.equal(0);
  });



  it('should return true for isApplicable when type is edit', () => {
    const action = { type: 'edit' };
    expect(validator.isApplicable(action)).to.be.true;
  });

  it('should return false for isApplicable when type is not edit', () => {
    const action = { type: 'create' };
    expect(validator.isApplicable(action)).to.be.false;
  });

  it('should return false for isApplicable when type is delete', () => {
    const action = { type: 'delete' };
    expect(validator.isApplicable(action)).to.be.false;
  });

  it('should return property names', () => {
    const properties = validator.getPropertyNames();
    expect(properties).to.be.an('array');
    expect(properties.length).to.be.greaterThan(0);
  });

});
