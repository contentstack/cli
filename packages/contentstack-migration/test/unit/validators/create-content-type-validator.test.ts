import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import CreateContentTypeValidator from '../../../src/validators/create-content-type-validator';
import * as mapModule from '../../../src/utils/map';

describe('Create Content Type Validator', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let validator: CreateContentTypeValidator;
  let getStub: SinonStub;
  let mockMapInstance: Map<string, any>;
  let mapInstance: Map<string, any>;

  beforeEach(() => {
    sandbox = createSandbox();
    validator = new CreateContentTypeValidator();
    validator.errors = []; // Reset errors array
    mockMapInstance = new Map();
    mapInstance = mapModule.getMapInstance();

    sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    getStub = sandbox.stub(mapModule, 'get').callsFake((id: string, mapInstanceArg: Map<string, any>, data?: any) => {
      const existing = mapInstanceArg.get(id);
      if (existing !== undefined) {
        return existing;
      }
      const defaultValue = data !== undefined ? data : {};
      mapInstanceArg.set(id, defaultValue);
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

  describe('validate()', () => {
    beforeEach(function () {
      sandbox.restore();
      mapInstance = mapModule.getMapInstance();
      validator = new CreateContentTypeValidator();
      validator.errors = [];
    });

    afterEach(function () {
      mapInstance.delete('blog');
      mapInstance.delete('ct-missing-uid');
      mapInstance.delete('ct-missing-title');
      mapInstance.delete('ct-missing-desc');
      mapInstance.delete('ct-invalid-prop');
    });

    it('should return no errors when content_type has all mandatory keys and only valid properties', () => {
      mapInstance.set('blog', {
        CREATE_CT: {
          content_type: {
            uid: 'blog',
            title: 'Blog',
            description: 'A blog content type',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'blog', action: 'CREATE_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.be.an('array').with.lengthOf(0);
    });

    it('should push error when uid is missing', () => {
      mapInstance.set('ct-missing-uid', {
        CREATE_CT: {
          content_type: {
            title: 'Blog',
            description: 'A blog',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'ct-missing-uid', action: 'CREATE_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.have.lengthOf(1);
      expect(errors[0].message).to.equal('uid is missing.');
    });

    it('should push error when title is missing', () => {
      mapInstance.set('ct-missing-title', {
        CREATE_CT: {
          content_type: {
            uid: 'ct-missing-title',
            description: 'A blog',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'ct-missing-title', action: 'CREATE_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.have.lengthOf(1);
      expect(errors[0].message).to.equal('title is missing.');
    });

    it('should push error when description is missing', () => {
      mapInstance.set('ct-missing-desc', {
        CREATE_CT: {
          content_type: {
            uid: 'ct-missing-desc',
            title: 'Blog',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'ct-missing-desc', action: 'CREATE_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.have.lengthOf(1);
      expect(errors[0].message).to.equal('description is missing.');
    });

    it('should push error when content_type has an invalid property', () => {
      mapInstance.set('ct-invalid-prop', {
        CREATE_CT: {
          content_type: {
            uid: 'ct-invalid-prop',
            title: 'Blog',
            description: 'A blog',
            invalidProperty: 'not-allowed',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'ct-invalid-prop', action: 'CREATE_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.have.lengthOf(1);
      expect(errors[0].message).to.equal('invalidProperty is not valid property.');
    });
  });
});
