import { expect } from 'chai';
import * as validatorsIndex from '../../../src/validators/index';

describe('Validators Index', () => {
  it('should export all validators', () => {
    expect(validatorsIndex.CreateContentTypeValidator).to.exist;
    expect(validatorsIndex.EditContentTypeValidator).to.exist;
    expect(validatorsIndex.SchemaValidator).to.exist;
    expect(validatorsIndex.FieldValidator).to.exist;
    expect(validatorsIndex._TypeError).to.exist;
    expect(validatorsIndex.ApiError).to.exist;
    expect(validatorsIndex.MigrationError).to.exist;
  });
});
