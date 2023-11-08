import sinon from 'sinon';
import { test } from '@oclif/test';
import { FancyTypes } from 'fancy-test';
import upperFirst from 'lodash/upperFirst';

import { FancyBaseType } from './types';

type TestWitSpyType = FancyTypes.Base<
  FancyTypes.Context,
  FancyBaseType & {
    spy: {
      output: {
        [key: string]: { [key: string]: sinon.SinonSpy };
      };
      args: [object: any, path: string, prefix?: string];
    };
  }
>;

export function spy<T extends Record<string, unknown>>(object: T, path: string, prefix?: string) {
  if (object === undefined || path === undefined) throw new Error('should not be undefined');

  return {
    run(ctx: { spy: { [key: string]: sinon.SinonSpy } }) {
      if (!ctx.spy) {
        ctx.spy = {};
      }

      ctx.spy[prefix ? `${prefix}${upperFirst(path)}` : path] = sinon.spy(object, path);
    },
    finally() {
      sinon.restore();
    },
  };
}

test.register('spy', spy);

export const fancy = test.register('spy', spy) as unknown as TestWitSpyType;

export default fancy;
