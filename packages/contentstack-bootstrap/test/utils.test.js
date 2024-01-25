const { expect } = require('@oclif/test');
const { setupEnvironments } = require('../lib/bootstrap/utils');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');

function getDirectory() {
  return new Promise((resolve, reject) => {
    tmp.dir(function (err, _path) {
      if (err) reject(err);
      resolve(_path);
    });
  });
}

function getDirFiles(_path) {
  return new Promise((resolve, reject) => {
    fs.readdir(_path, function (err, files) {
      if (err) reject(err);
      resolve(files);
    });
  });
}

function getFileContent(_path) {
  return new Promise((resolve, reject) => {
    fs.readFile(_path, 'utf-8', function (err, data) {
      if (err) reject(err);
      resolve(data);
    });
  });
}

describe('Utils', () => {
  describe('#setupEnvironments', () => {
    it('Create env file for a stack with live preview enabled', async () => {
      const environments = { items: [{ name: 'production' }, { name: 'development' }] };
      const token = 'mock-delivery-token';
      const api_key = 'mock-api-key';
      const appConfig = {
        appConfigKey: 'reactjs',
      };
      const livePreviewEnabled= true;
      const clonedDirectory = await getDirectory();
      const region = {
        name: 'NA',
        cda: 'https://cdn.contentstack.com',
        cma: 'https://api.contentstack.com',
        uiHost: 'https://app.contentstack.com'
      };
      const managementAPIClient = {
        stack: () => {
          return {
            environment: () => {
              return {
                query: () => {
                  return {
                    find: () => Promise.resolve(environments),
                  };
                },
              };
            },
            deliveryToken: () => {
              return {
                create: () => Promise.resolve({ token, preview_token: "mock_preview_token" }),
              };
            },
          };
        },
      };
      await setupEnvironments(managementAPIClient, api_key, appConfig,clonedDirectory, region,livePreviewEnabled);
      const files = await getDirFiles(clonedDirectory);
      expect(files).to.have.length(2);
      let devEnvFile = await getFileContent(path.join(clonedDirectory, '.env.development.local'));
      devEnvFile = devEnvFile.replace(/\n/g, ',');
      expect(devEnvFile).equal(
        'REACT_APP_CONTENTSTACK_API_KEY=mock-api-key,REACT_APP_CONTENTSTACK_DELIVERY_TOKEN=mock-delivery-token,REACT_APP_CONTENTSTACK_PREVIEW_TOKEN=mock_preview_token,REACT_APP_CONTENTSTACK_PREVIEW_HOST=rest-preview.contentstack.com,REACT_APP_CONTENTSTACK_APP_HOST=app.contentstack.com,,REACT_APP_CONTENTSTACK_ENVIRONMENT=development,,SKIP_PREFLIGHT_CHECK=true,REACT_APP_CONTENTSTACK_LIVE_PREVIEW=true',
      );
      let prodEnvFile = await getFileContent(path.join(clonedDirectory, '.env.production.local'));
      prodEnvFile = prodEnvFile.replace(/\n/g, ',');
      expect(prodEnvFile).equal(
        'REACT_APP_CONTENTSTACK_API_KEY=mock-api-key,REACT_APP_CONTENTSTACK_DELIVERY_TOKEN=mock-delivery-token,REACT_APP_CONTENTSTACK_PREVIEW_TOKEN=mock_preview_token,REACT_APP_CONTENTSTACK_PREVIEW_HOST=rest-preview.contentstack.com,REACT_APP_CONTENTSTACK_APP_HOST=app.contentstack.com,,REACT_APP_CONTENTSTACK_ENVIRONMENT=production,,SKIP_PREFLIGHT_CHECK=true,REACT_APP_CONTENTSTACK_LIVE_PREVIEW=true',
      );
    });
    it('Create env file for a stack with live preview disabled', async () => {
      const environments = { items: [{ name: 'production' }, { name: 'development' }] };
      const token = 'mock-delivery-token';
      const api_key = 'mock-api-key';
      const appConfig = {
        appConfigKey: 'reactjs',
      };
      const livePreviewEnabled= false;
      const clonedDirectory = await getDirectory();
      const region = {
        name: 'NA',
        cda: 'https://cdn.contentstack.com',
        cma: 'https://app.contentstack.com',
        uiHost: 'https://app.contentstack.com'
      };
      const managementAPIClient = {
        stack: () => {
          return {
            environment: () => {
              return {
                query: () => {
                  return {
                    find: () => Promise.resolve(environments),
                  };
                },
              };
            },
            deliveryToken: () => {
              return {
                create: () => Promise.resolve({ token }),
              };
            },
          };
        },
      };
      await setupEnvironments(managementAPIClient, api_key, appConfig,clonedDirectory, region,livePreviewEnabled);
      const files = await getDirFiles(clonedDirectory);
      expect(files).to.have.length(2);
      let devEnvFile = await getFileContent(path.join(clonedDirectory, '.env.development.local'));
      devEnvFile = devEnvFile.replace(/\n/g, ',');
      expect(devEnvFile).equal(
      'REACT_APP_CONTENTSTACK_API_KEY=mock-api-key,REACT_APP_CONTENTSTACK_DELIVERY_TOKEN=mock-delivery-token,,REACT_APP_CONTENTSTACK_ENVIRONMENT=development,,SKIP_PREFLIGHT_CHECK=true,REACT_APP_CONTENTSTACK_LIVE_PREVIEW=false'
      );
      let prodEnvFile = await getFileContent(path.join(clonedDirectory, '.env.production.local'));
      prodEnvFile = prodEnvFile.replace(/\n/g, ',');
      expect(prodEnvFile).equal(
      'REACT_APP_CONTENTSTACK_API_KEY=mock-api-key,REACT_APP_CONTENTSTACK_DELIVERY_TOKEN=mock-delivery-token,,REACT_APP_CONTENTSTACK_ENVIRONMENT=production,,SKIP_PREFLIGHT_CHECK=true,REACT_APP_CONTENTSTACK_LIVE_PREVIEW=false'
      );
    });
    it('Create env with invalid environments, should throw an error', async () => {
      const environments = {};
      const token = 'mock-delivery-token';
      const api_key = 'mock-api-key';
      const appConfig = {
        appConfigKey: 'reactjs',
      };
      const clonedDirectory = await getDirectory();
      const region = {
        name: 'NA',
        cda: 'https://app.contentstack.com',
        cma: 'https://api.contentstack.com',
      };
      const managementAPIClient = {
        stack: () => ({
          environment: () => {
            return {
              query: () => {
                return {
                  find: () => Promise.resolve(environments),
                };
              },
            };
          },
          deliveryToken: () => {
            return {
              create: () => Promise.resolve({ token }),
            };
          },
        }),
      };

      try {
        await setupEnvironments(managementAPIClient, api_key, appConfig, clonedDirectory, region);
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
    it('Create env with invalid app config, should throw an error', async () => {
      const environments = {};
      const token = 'mock-delivery-token';
      const api_key = 'mock-api-key';
      const appConfig = {
        appConfigKey: 'sdsds',
      };
      const clonedDirectory = await getDirectory();
      const region = {
        name: 'NA',
        cda: 'https://app.contentstack.com',
        cma: 'https://app.contentstack.com',
      };
      const managementAPIClient = {
        stack: () => ({
          environment: () => ({
            query: () => ({
              find: () => Promise.resolve(environments),
            }),
          }),
          deliveryToken: () => ({
            create: () => Promise.resolve({ token }),
          }),
        }),
      };

      try {
        await setupEnvironments(managementAPIClient, api_key, appConfig, clonedDirectory, region);
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
    it('Create env with one invalid environment, should not create env file for invalid one', async () => {
      const environments = { items: [{ name: 'production' }, { invalid: 'invalid' }] };
      const token = 'mock-delivery-token';
      const api_key = 'mock-api-key';
      const appConfig = {
        appConfigKey: 'reactjs',
      };
      const clonedDirectory = await getDirectory();
      const region = {
        name: 'NA',
        cda: 'https://app.contentstack.com',
        cma: 'https://app.contentstack.com',
      };
      const managementAPIClient = {
        stack: () => ({
          environment: () => ({
            query: () => ({
              find: () => Promise.resolve(environments),
            }),
          }),
          deliveryToken: () => ({
            create: () => Promise.resolve({ token }),
          }),
        }),
      };

      await setupEnvironments(managementAPIClient, api_key, appConfig, clonedDirectory, region);
      const files = await getDirFiles(clonedDirectory);
      expect(files).to.have.length(1);
    });
  });
});
