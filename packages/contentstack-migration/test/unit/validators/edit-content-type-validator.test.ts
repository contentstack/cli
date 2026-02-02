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
      const existing = mapInstance.get(id);
      if (existing !== undefined) {
        return existing;
      }
      const defaultValue = data !== undefined ? data : {};
      mapInstance.set(id, defaultValue);
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

  describe('validate()', () => {
    let mapInstance: Map<string, any>;

    beforeEach(function () {
      sandbox.restore();
      mapInstance = mapModule.getMapInstance();
      validator = new EditContentTypeValidator();
      validator.errors = [];
    });

    afterEach(function () {
      mapInstance.delete('blog');
      mapInstance.delete('ct-missing-uid');
      mapInstance.delete('ct-missing-title');
      mapInstance.delete('ct-invalid-prop');
      mapInstance.delete('ct-multiple-errors');
    });

    it('should return no errors when content_type has uid, title and only valid properties', () => {
      mapInstance.set('blog', {
        EDIT_CT: {
          content_type: {
            uid: 'blog',
            title: 'Blog',
            description: 'A blog',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'blog', action: 'EDIT_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.be.an('array').with.lengthOf(0);
    });

    it('should push error when uid is missing', () => {
      mapInstance.set('ct-missing-uid', {
        EDIT_CT: {
          content_type: {
            title: 'Blog',
            description: 'A blog',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'ct-missing-uid', action: 'EDIT_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.have.lengthOf(1);
      expect(errors[0].message).to.equal('uid is missing.');
    });

    it('should push error when title is missing', () => {
      mapInstance.set('ct-missing-title', {
        EDIT_CT: {
          content_type: {
            uid: 'ct-missing-title',
            description: 'A blog',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'ct-missing-title', action: 'EDIT_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.have.lengthOf(1);
      expect(errors[0].message).to.equal('title is missing.');
    });

    it('should push error when content_type has an invalid property', () => {
      mapInstance.set('ct-invalid-prop', {
        EDIT_CT: {
          content_type: {
            uid: 'ct-invalid-prop',
            title: 'Blog',
            invalidKey: 'not-allowed',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'ct-invalid-prop', action: 'EDIT_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.have.lengthOf(1);
      expect(errors[0].message).to.equal('invalidKey is not valid property.');
    });

    it('should push multiple errors when uid and title are both missing', () => {
      mapInstance.set('ct-multiple-errors', {
        EDIT_CT: {
          content_type: {
            description: 'Only description',
            schema: [],
          },
        },
      });
      const data = { payload: { contentTypeId: 'ct-multiple-errors', action: 'EDIT_CT' } };
      const errors = validator.validate(data);

      expect(errors).to.have.lengthOf(2);
      const messages = errors.map((e: any) => e.message);
      expect(messages).to.include('uid is missing.');
      expect(messages).to.include('title is missing.');
    });
  });
});
