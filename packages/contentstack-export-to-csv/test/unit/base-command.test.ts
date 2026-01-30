import { expect } from 'chai';
import { BaseCommand } from '../../src/base-command';

describe('BaseCommand', () => {
  describe('class definition', () => {
    it('should be an abstract class that extends Command', () => {
      expect(BaseCommand).to.be.a('function');
      expect(BaseCommand.prototype).to.have.property('init');
      expect(BaseCommand.prototype).to.have.property('catch');
      expect(BaseCommand.prototype).to.have.property('finally');
    });

    it('should have createCommandContext method', () => {
      expect(BaseCommand.prototype).to.have.property('createCommandContext');
    });
  });
});
