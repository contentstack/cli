import { expect } from 'chai';
import { spawnSync } from 'child_process';

describe('ContentStack-Config Plugin Tests', () => {
  it("Should execute 'config:set:region --AZURE-NA'", () => {
    const result = spawnSync('csdx', ['config:set:region', 'AZURE-NA'], { encoding: 'utf-8' });
    const output = result.stdout + result.stderr;

    expect(output).to.include('Region has been set to AZURE-NA');
    expect(output).to.include('CDA host: https://azure-na-cdn.contentstack.com');
    expect(output).to.include('CMA host: https://azure-na-api.contentstack.com');
  });

  it("Should execute 'config:get:region' and return the current region", () => {
    const result = spawnSync('csdx', ['config:get:region'], { encoding: 'utf-8' });
    const output = result.stdout + result.stderr;

    expect(output).to.include('Currently using');
    expect(output).to.include('CDA host:');
    expect(output).to.include('CMA host:');
  });

  it("Should execute 'config:set:region AWS-NA' and set AWS-NA region", () => {
    const result = spawnSync('csdx', ['config:set:region', 'AWS-NA'], { encoding: 'utf-8' });
    const output = result.stdout + result.stderr;

    expect(output).to.include('Region has been set to AWS-NA');
    expect(output).to.include('CDA host: https://cdn.contentstack.io');
    expect(output).to.include('CMA host: https://api.contentstack.io');
  });
});
