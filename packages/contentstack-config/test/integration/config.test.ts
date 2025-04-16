import { expect } from 'chai';
import * as sinon from 'sinon';
import { spawnSync } from 'child_process';
import { cliux } from '@contentstack/cli-utilities';

describe('ContentStack-Config Plugin Tests', () => {
  it("Should execute 'config:set:region --AZURE-NA'", () => {
    const result = spawnSync('csdx', ['config:set:region', 'AZURE-NA'], { encoding: 'utf-8' });
    const output = result.stdout + result.stderr;

    expect(output).to.include('Region has been set to AZURE-NA');
    expect(output).to.include('CDA HOST: https://azure-na-cdn.contentstack.com');
    expect(output).to.include('CMA HOST: https://azure-na-api.contentstack.com');
  });

  it("Should execute 'config:get:region' and return the current region", () => {
    const result = spawnSync('csdx', ['config:get:region'], { encoding: 'utf-8' });
    const output = result.stdout + result.stderr;

    expect(output).to.include('Currently using');
    expect(output).to.include('CDA HOST:');
    expect(output).to.include('CMA HOST:');
  });

  it("Should execute 'config:set:region NA' and set NA region", () => {
    const result = spawnSync('csdx', ['config:set:region', 'NA'], { encoding: 'utf-8' });
    const output = result.stdout + result.stderr;

    expect(output).to.include('Region has been set to NA');
    expect(output).to.include('CDA HOST: https://cdn.contentstack.io');
    expect(output).to.include('CMA HOST: https://api.contentstack.io');
  });
});
