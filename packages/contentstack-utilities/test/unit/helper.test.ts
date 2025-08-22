import { cliux, validatePath, getBranchFromAlias } from '../../lib';
import { expect } from 'chai';
import { fancy } from 'fancy-test';

describe('Testing the Validate function', () => {
  describe('When there is no input', () => {
    it('should return true', () => {
      expect(validatePath('')).eql(true);
    });
  });
  describe('When input contains special character', () => {
    fancy
      .stub(cliux, 'print', () => {})
      .it('should return true', () => {
        expect(validatePath('/invalidPath*&%$#')).eql(false);
      });
  });
  describe('When input does not contains special character', () => {
    fancy
      .stub(cliux, 'print', () => {})
      .it('should return true', () => {
        expect(validatePath('/validPath')).eql(true);
      });
  });
});

describe('Testing the getBranchFromAlias function', () => {
  describe('When branch alias exists and resolves successfully', () => {
    it('should return the branch UID', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ uid: 'main-branch' })
        })
      };
      
      const result = await getBranchFromAlias(mockStack, 'main');
      expect(result).to.equal('main-branch');
    });
  });

  describe('When input validation fails', () => {
    it('should throw error for null stack', async () => {
      try {
        await getBranchFromAlias(null, 'main');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid input: stack and branch alias are required');
      }
    });

    it('should throw error for undefined stack', async () => {
      try {
        await getBranchFromAlias(undefined, 'main');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid input: stack and branch alias are required');
      }
    });

    it('should throw error for null branchAlias', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ uid: 'main-branch' })
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, null);
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid input: stack and branch alias are required');
      }
    });

    it('should throw error for undefined branchAlias', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ uid: 'main-branch' })
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, undefined);
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid input: stack and branch alias are required');
      }
    });

    it('should throw error for non-string branchAlias', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ uid: 'main-branch' })
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, 123);
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid input: stack and branch alias are required');
      }
    });

    it('should throw error for empty string branchAlias', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ uid: 'main-branch' })
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, '');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid input: stack and branch alias are required');
      }
    });
  });

  describe('When branch alias does not exist', () => {
    it('should throw an error', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => {
            throw new Error('Branch alias not found');
          }
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, 'non-existent');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Branch alias not found');
      }
    });
  });

  describe('When response is missing UID', () => {
    it('should throw error for response without uid', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ name: 'main-branch' }) // missing uid
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, 'main');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid Branch Alias. No Branch found for the branch alias: main');
      }
    });

    it('should throw error for response with null uid', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ uid: null })
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, 'main');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid Branch Alias. No Branch found for the branch alias: main');
      }
    });

    it('should throw error for response with undefined uid', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ uid: undefined })
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, 'main');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid Branch Alias. No Branch found for the branch alias: main');
      }
    });

    it('should throw error for response with empty string uid', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({ uid: '' })
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, 'main');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid Branch Alias. No Branch found for the branch alias: main');
      }
    });

    it('should throw error for empty response object', async () => {
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => ({})
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, 'main');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Invalid Branch Alias. No Branch found for the branch alias: main');
      }
    });
  });

  describe('When network error occurs', () => {
    it('should throw the network error', async () => {
      const networkError = new Error('Network timeout');
      const mockStack = {
        branchAlias: (alias: string) => ({
          fetch: async () => {
            throw networkError;
          }
        })
      };
      
      try {
        await getBranchFromAlias(mockStack, 'main');
        expect.fail('Expected function to throw an error');
      } catch (error) {
        expect(error).to.equal(networkError);
      }
    });
  });
});
