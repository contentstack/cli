import { expect } from 'chai';
import SchemaValidator from '../../../src/validators/schema-validator';

describe('Schema Validator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  it('should return error when fromField exists', () => {
    const data = {
      type: 'schema',
      payload: {
        fromField: 'invalidField',
      },
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(1);
    expect(result[0]).to.have.property('message', 'invalidField does not exist on schema.');
  });

  it('should return error when toField exists', () => {
    const data = {
      type: 'schema',
      payload: {
        toField: 'invalidToField',
      },
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(1);
    expect(result[0]).to.have.property('message', 'invalidToField does not exist on schema.');
  });

  it('should return error when toReferenceField exists', () => {
    const data = {
      type: 'schema',
      payload: {
        toReferenceField: 'invalidRefField',
      },
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(1);
    expect(result[0]).to.have.property('message', 'invalidRefField does not exist on schema.');
  });

  it('should return error when deriveField exists', () => {
    const data = {
      type: 'schema',
      payload: {
        deriveField: 'invalidDeriveField',
      },
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(1);
    expect(result[0]).to.have.property('message', 'invalidDeriveField does not exist on schema.');
  });

  it('should return empty array when no schema fields exist', () => {
    const data = {
      type: 'schema',
      payload: {},
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(0);
  });

  it('should be applicable for schema type', () => {
    const action = { type: 'schema' };
    expect(validator.isApplicable(action)).to.be.true;
  });

  it('should not be applicable for other types', () => {
    const action = { type: 'field' };
    expect(validator.isApplicable(action)).to.be.false;
  });
});
