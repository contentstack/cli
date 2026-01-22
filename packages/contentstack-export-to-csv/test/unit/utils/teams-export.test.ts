import { expect } from 'chai';

describe('teams-export', () => {
  describe('module exports', () => {
    it('should export all team export functions', async () => {
      // Import from barrel export with explicit index.js
      const utils = await import('../../../dist/utils/index.js');

      expect(utils.exportTeams).to.be.a('function');
      expect(utils.getTeamsDetail).to.be.a('function');
      expect(utils.exportRoleMappings).to.be.a('function');
      expect(utils.mapRoleWithTeams).to.be.a('function');
    });
  });

  // Note: Team export functions interact with the Contentstack SDK and filesystem
  // These are better tested via integration tests with proper SDK mocking
});
