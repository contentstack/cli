import { expect } from 'chai';
import { pathValidator } from '../../src/path-validator';

describe('pathValidator', () => {
  it('should normalize and resolve path relative to cwd', () => {
    const result = pathValidator('src/index.ts');
    expect(result).to.be.a('string');
    expect(result).to.include('src');
    expect(result).to.include('index.ts');
  });

  it('should strip leading ../ segments', () => {
    const result = pathValidator('../foo/bar');
    expect(result).to.be.a('string');
    expect(result).not.to.match(/^\.\./);
  });

  it('should handle multiple ../ segments', () => {
    const result = pathValidator('../../../etc/passwd');
    expect(result).to.be.a('string');
    expect(result).not.to.match(/^\.\./);
  });
});
