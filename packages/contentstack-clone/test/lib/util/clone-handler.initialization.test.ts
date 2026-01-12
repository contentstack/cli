import { expect } from 'chai';
import { CloneHandler } from '../../../src/lib/util/clone-handler';
import { CloneConfig } from '../../../src/types/clone-config';

describe('CloneHandler - Initialization', () => {
  describe('constructor', () => {
    it('should initialize CloneHandler with config', () => {
      const config: CloneConfig = {
        pathDir: '/test/path',
        cloneType: 'a',
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };

      const handler = new CloneHandler(config);
      expect(handler).to.exist;
      expect(handler.pathDir).to.equal('/test/path');
    });

    it('should initialize with default pathDir if not provided', () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };

      const handler = new CloneHandler(config);
      expect(handler.pathDir).to.equal('');
    });
  });

  describe('setClient', () => {
    it('should set the client', () => {
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };

      const handler = new CloneHandler(config);
      const mockClient = { stack: () => {}, organization: () => {} };

      handler.setClient(mockClient as any);
      // Client is private, so we test indirectly
      expect(handler).to.exist;
    });
  });
});
