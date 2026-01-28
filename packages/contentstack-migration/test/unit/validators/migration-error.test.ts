import { expect } from 'chai';
import MigrationError from '../../../src/validators/migration-error';

describe('Migration Error Validator', () => {
  let validator: MigrationError;

  beforeEach(() => {
    validator = new MigrationError();
  });

  it('should return error when migrationError exists in payload', () => {
    const data = {
      type: 'migrationError',
      payload: {
        migrationError: {
          migrationError: {
            message: 'Migration failed',
          },
        },
      },
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(1);
    expect(result[0]).to.have.property('message', 'Migration failed');
    expect(result[0]).to.have.property('type', 'migrationError');
  });

  it('should return undefined when migrationError does not exist', () => {
    const data = {
      type: 'migrationError',
      payload: {},
    };

    const result = validator.validate(data);

    expect(result).to.be.undefined;
  });

  it('should be applicable for migrationError type', () => {
    const action = { type: 'migrationError' };
    expect(validator.isApplicable(action)).to.be.true;
  });

  it('should not be applicable for other types', () => {
    const action = { type: 'field' };
    expect(validator.isApplicable(action)).to.be.false;
  });
});
