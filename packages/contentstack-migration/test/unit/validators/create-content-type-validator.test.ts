import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import CreateContentTypeValidator from '../../../src/validators/create-content-type-validator';
import * as mapModule from '../../../src/utils/map';

describe('Create Content Type Validator', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let validator: CreateContentTypeValidator;
  let getStub: SinonStub;
  let mockMapInstance: Map<string, any>;

  beforeEach(() => {
    sandbox = createSandbox();
    validator = new CreateContentTypeValidator();
    validator.errors = []; // Reset errors array
    mockMapInstance = new Map();
    
    sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    getStub = sandbox.stub(mapModule, 'get').callsFake((id: string, mapInstance: Map<string, any>, data?: any) => {
      const existing = mapInstance.get(id);
      if (existing !== undefined) {
        return existing;
      }
      // If not found, set default and return it (matching real get behavior)
      const defaultValue = data !== undefined ? data : {};
      mapInstance.set(id, defaultValue);
      return defaultValue;
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should export CreateContentTypeValidator class', () => {
    expect(CreateContentTypeValidator).to.exist;
  });

  it('should be instantiable', () => {
    expect(validator).to.be.instanceOf(CreateContentTypeValidator);
    expect(validator.errors).to.be.an('array');
    expect(validator.errors.length).to.equal(0);
  });


  it('should return true for isApplicable when type is create', () => {
    const action = { type: 'create' };
    expect(validator.isApplicable(action)).to.be.true;
  });

  it('should return false for isApplicable when type is not create', () => {
    const action = { type: 'edit' };
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
