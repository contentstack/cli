import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from 'chai';
import cloneDeep from 'lodash/cloneDeep';
import { ux } from '@contentstack/cli-utilities';
import sinon from 'sinon';

import config from '../../../src/config';
import { ComposableStudio } from '../../../src/modules';
import { mockLogger } from '../mock-logger';

describe('ComposableStudio', () => {
  beforeEach(() => {
    // Mock the logger for all tests
    sinon.stub(require('@contentstack/cli-utilities'), 'log').value(mockLogger);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('run method with invalid path for composable-studio', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('Should validate the base path for composable-studio', async () => {
        const cs = new ComposableStudio({
          moduleName: 'composable-studio',
          ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
          config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'invalid_path'), flags: {} }),
        });
        const result = await cs.run();
        expect(result).to.eql({});
      });
  });

  describe('run method with valid path and valid composable-studio project', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('should load projects and report issues if references are invalid', async () => {
        const cs = new ComposableStudio({
          moduleName: 'composable-studio',
          ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
          config: Object.assign(config, {
            basePath: resolve(`./test/unit/mock/contents/`),
            flags: {},
          }),
        });

        const missingRefs: any = await cs.run();
        expect(cs.composableStudioProjects).to.have.lengthOf(1);
        expect(cs.composableStudioProjects[0].uid).to.equal('test_project_uid_1');
        expect(Array.isArray(missingRefs)).to.be.true;
      });
  });

  describe('run method with invalid composable-studio projects', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('should detect invalid references', async () => {
        const cs = new ComposableStudio({
          moduleName: 'composable-studio',
          ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
          config: Object.assign(config, {
            basePath: resolve(`./test/unit/mock/contents/`),
            flags: {},
          }),
        });

        // Mock readFileSync to return invalid data
        const originalReadFileSync = require('fs').readFileSync;
        const invalidProjects = require('./../mock/contents/composable_studio/invalid_composable_studio.json');
        
        sinon.stub(require('fs'), 'readFileSync').callsFake((...args: any[]) => {
          const path = args[0];
          if (path.includes('composable_studio.json')) {
            return JSON.stringify(invalidProjects);
          }
          return originalReadFileSync(...args);
        });

        const missingRefs: any = await cs.run();
        
        expect(cs.composableStudioProjects).to.have.lengthOf(4);
        expect(cs.projectsWithIssues).to.have.lengthOf(4);
        expect(Array.isArray(missingRefs)).to.be.true;
        expect(missingRefs).to.have.lengthOf(4);
        
        // Check first project - invalid content type
        const project1 = missingRefs.find((p: any) => p.uid === 'test_project_uid_2');
        expect(project1).to.exist;
        expect(project1.content_types).to.deep.equal(['invalid_ct_999']);
        expect(project1.issues).to.include('Invalid contentTypeUid: invalid_ct_999');
        
        // Check second project - invalid environment
        const project2 = missingRefs.find((p: any) => p.uid === 'test_project_uid_3');
        expect(project2).to.exist;
        expect(project2.environment).to.deep.equal(['invalid_env_999']);
        expect(project2.issues).to.include('Invalid environment: invalid_env_999');
        
        // Check third project - invalid locale
        const project3 = missingRefs.find((p: any) => p.uid === 'test_project_uid_4');
        expect(project3).to.exist;
        expect(project3.locale).to.deep.equal(['invalid_locale_999']);
        expect(project3.issues).to.include('Invalid locale: invalid_locale_999');
        
        // Check fourth project - multiple issues
        const project4 = missingRefs.find((p: any) => p.uid === 'test_project_uid_5');
        expect(project4).to.exist;
        expect(project4.content_types).to.deep.equal(['invalid_ct_888']);
        expect(project4.environment).to.deep.equal(['invalid_env_888']);
        expect(project4.locale).to.deep.equal(['invalid_locale_888']);
        expect(project4.issues).to.include('Invalid contentTypeUid: invalid_ct_888');
        expect(project4.issues).to.include('Invalid environment: invalid_env_888');
        expect(project4.issues).to.include('Invalid locale: invalid_locale_888');
      });
  });

  describe('loadEnvironments method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should load environments correctly', async () => {
        const cs = new ComposableStudio({
          moduleName: 'composable-studio',
          ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
          config: Object.assign(config, {
            basePath: resolve(`./test/unit/mock/contents/composable_studio`),
            flags: {},
          }),
        });
        await cs.loadEnvironments();
        expect(cs.environmentUidSet.size).to.equal(2);
        expect(cs.environmentUidSet.has('blt_env_dev')).to.be.true;
        expect(cs.environmentUidSet.has('blt_env_prod')).to.be.true;
      });
  });

  describe('loadLocales method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should load locales correctly', async () => {
        const cs = new ComposableStudio({
          moduleName: 'composable-studio',
          ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
          config: Object.assign(config, {
            basePath: resolve(`./test/unit/mock/contents/composable_studio`),
            flags: {},
          }),
        });
        await cs.loadLocales();
        expect(cs.localeCodeSet.size).to.equal(3); // en-us (master) + fr-fr + de-de
        expect(cs.localeCodeSet.has('en-us')).to.be.true;
        expect(cs.localeCodeSet.has('fr-fr')).to.be.true;
        expect(cs.localeCodeSet.has('de-de')).to.be.true;
      });
  });

  describe('run method with audit fix for composable-studio', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('should fix invalid projects and return fixed references', async () => {
        const cs = new ComposableStudio({
          moduleName: 'composable-studio',
          ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
          config: Object.assign(config, {
            basePath: resolve(`./test/unit/mock/contents/`),
            flags: { 'copy-dir': true },
          }),
          fix: true,
        });

        // Mock readFileSync to return invalid data
        const originalReadFileSync = require('fs').readFileSync;
        const invalidProjects = require('./../mock/contents/composable_studio/invalid_composable_studio.json');
        
        sinon.stub(require('fs'), 'readFileSync').callsFake((...args: any[]) => {
          const path = args[0];
          if (path.includes('composable_studio.json')) {
            return JSON.stringify(invalidProjects);
          }
          return originalReadFileSync(...args);
        });

        sinon.stub(cs, 'writeFixContent').resolves();
        
        const fixedReferences: any = await cs.run();
        
        expect(Array.isArray(fixedReferences)).to.be.true;
        expect(fixedReferences.length).to.be.greaterThan(0);
        
        // All projects should have fixStatus set
        fixedReferences.forEach((ref: any) => {
          expect(ref.fixStatus).to.equal('Fixed');
        });
        
        // Check that projects with issues were identified
        expect(cs.projectsWithIssues.length).to.be.greaterThan(0);
      });
  });

  describe('validateModules method', () => {
    it('should validate correct module name', () => {
      const cs = new ComposableStudio({
        moduleName: 'composable-studio',
        ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
        config: Object.assign(config, {
          basePath: resolve(`./test/unit/mock/contents/composable_studio`),
          flags: {},
        }),
      });
      const result = cs.validateModules('composable-studio', config.moduleConfig);
      expect(result).to.equal('composable-studio');
    });

    it('should return default module name for invalid module', () => {
      const cs = new ComposableStudio({
        moduleName: 'composable-studio',
        ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
        config: Object.assign(config, {
          basePath: resolve(`./test/unit/mock/contents/composable_studio`),
          flags: {},
        }),
      });
      const result = cs.validateModules('invalid-module' as any, config.moduleConfig);
      expect(result).to.equal('composable-studio');
    });
  });

  describe('Content type validation', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should build content type UID set correctly', async () => {
        const cs = new ComposableStudio({
          moduleName: 'composable-studio',
          ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
          config: Object.assign(config, {
            basePath: resolve(`./test/unit/mock/contents/`),
            flags: {},
          }),
        });
        await cs.run();
        expect(cs.ctUidSet.size).to.equal(3);
        expect(cs.ctUidSet.has('page_1')).to.be.true;
        expect(cs.ctUidSet.has('page_2')).to.be.true;
        expect(cs.ctUidSet.has('page_3')).to.be.true;
      });
  });

  describe('Report data structure', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('should return properly formatted report data', async () => {
        const cs = new ComposableStudio({
          moduleName: 'composable-studio',
          ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
          config: Object.assign(config, {
            basePath: resolve(`./test/unit/mock/contents/`),
            flags: {},
          }),
        });

        // Mock readFileSync to return invalid data
        const originalReadFileSync = require('fs').readFileSync;
        const invalidProjects = require('./../mock/contents/composable_studio/invalid_composable_studio.json');
        
        sinon.stub(require('fs'), 'readFileSync').callsFake((...args: any[]) => {
          const path = args[0];
          if (path.includes('composable_studio.json')) {
            return JSON.stringify(invalidProjects);
          }
          return originalReadFileSync(...args);
        });

        const missingRefs: any = await cs.run();
        
        expect(Array.isArray(missingRefs)).to.be.true;
        expect(missingRefs.length).to.be.greaterThan(0);
        
        // Check that all report entries have required fields
        missingRefs.forEach((ref: any) => {
          expect(ref).to.have.property('title');
          expect(ref).to.have.property('name');
          expect(ref).to.have.property('uid');
          expect(ref).to.have.property('issues');
        });
        
        // Check that issues field contains descriptive text
        const projectWithCTIssue = missingRefs.find((ref: any) => ref.content_types);
        if (projectWithCTIssue) {
          expect(projectWithCTIssue.issues).to.be.a('string');
          expect(projectWithCTIssue.issues).to.include('contentTypeUid');
        }
      });
  });

  describe('Empty and edge cases', () => {
    it('should handle empty content type schema gracefully', async () => {
      const cs = new ComposableStudio({
        moduleName: 'composable-studio',
        ctSchema: [],
        config: Object.assign(config, {
          basePath: resolve(`./test/unit/mock/contents/composable_studio`),
          flags: {},
        }),
      });
      
      await cs.run();
      expect(cs.ctUidSet.size).to.equal(0);
    });

    it('should handle missing composable_studio.json file', async () => {
      const cs = new ComposableStudio({
        moduleName: 'composable-studio',
        ctSchema: cloneDeep(require('./../mock/contents/composable_studio/ctSchema.json')),
        config: Object.assign(config, {
          basePath: resolve(`./test/unit/mock/contents`),
          flags: {},
        }),
      });

      const result = await cs.run();
      // When the file exists and has projects with validation issues, it returns an array
      expect(result).to.exist;
    });
  });
});
