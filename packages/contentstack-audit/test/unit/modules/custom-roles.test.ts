import { resolve } from 'path';
import { expect } from 'chai';
import cloneDeep from 'lodash/cloneDeep';
import fancy from 'fancy-test';
import Sinon from 'sinon';
import config from '../../../src/config';
import { CustomRoles } from '../../../src/modules';
import { CtConstructorParam, ModuleConstructorParam } from '../../../src/types';

describe('Custom roles module', () => {
  let constructorParam: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>;

  beforeEach(() => {
    constructorParam = {
      moduleName: 'custom-roles',
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'contents'), flags: {} }),
      ctSchema: cloneDeep(require('../mock/contents/content_types/schema.json')),
    };
  });

  describe('run method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should have missingFieldsInCustomRoles length equals to 2', async () => {
        const customRoleInstance = new CustomRoles({
          ...constructorParam,
          config: { ...constructorParam.config, branch: 'test' },
        });
        await customRoleInstance.run();
        expect(customRoleInstance.missingFieldsInCustomRoles).length(2);
        expect(JSON.stringify(customRoleInstance.missingFieldsInCustomRoles)).includes('"branches":["main"]');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(CustomRoles.prototype, 'fixCustomRoleSchema', async () => {})
      .it('should call fixCustomRoleSchema', async () => {
        const customRoleInstance = new CustomRoles({
          ...constructorParam,
          config: { ...constructorParam.config, branch: 'test' },
          fix: true,
        });
        const logSpy = Sinon.spy(customRoleInstance, 'fixCustomRoleSchema');
        await customRoleInstance.run();
        expect(logSpy.callCount).to.be.equals(1);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(CustomRoles.prototype, 'writeFixContent', async () => {})
      .it('should call writeFixContent', async () => {
        const customRoleInstance = new CustomRoles({
          ...constructorParam,
          config: { ...constructorParam.config, branch: 'test' },
          fix: true,
        });
        const logSpy = Sinon.spy(customRoleInstance, 'writeFixContent');
        await customRoleInstance.run();
        expect(logSpy.callCount).to.be.equals(1);
      });
  });

  after(() => {
    Sinon.restore(); // Clears Sinon spies/stubs/mocks
  });
});
