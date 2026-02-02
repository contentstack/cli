import { expect } from 'chai';
import { createSandbox } from 'sinon';
import Base from '../../../src/modules/base';
import * as mapModule from '../../../src/utils/map';
import * as actionCreatorsModule from '../../../src/actions/index';
import { actionMapper } from '../../../src/utils/constants';

describe('Base Module', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let mapInstance: Map<string, any>;
  let base: Base;

  beforeEach(() => {
    sandbox = createSandbox();
    mapInstance = mapModule.getMapInstance();
    const contentType = {
      CREATE_CT: {
        content_type: { title: '', description: '', force: false },
      },
    };
    mapInstance.set('test-id', contentType);
    mapInstance.set(actionMapper, []);

    base = new Base('test-id', 'CREATE_CT');
  });

  afterEach(() => {
    mapInstance.delete('test-id');
    mapInstance.set(actionMapper, []);
    sandbox.restore();
  });

  it('should export Base class', () => {
    expect(Base).to.exist;
  });

  it('should be instantiable without parameters', () => {
    const instance = new Base();
    expect(instance).to.be.instanceOf(Base);
    expect(instance.id).to.be.null;
    expect(instance.action).to.be.null;
    expect(instance.actions).to.be.an('array');
    expect(instance.actions).to.have.length(0);
  });

  it('should be instantiable with id and action', () => {
    const instance = new Base('test-id', 'create');
    expect(instance.id).to.equal('test-id');
    expect(instance.action).to.equal('create');
    expect(instance.actions).to.be.an('array');
  });


  it('should return actions array from getActions', () => {
    const instance = new Base();
    const actions = instance.getActions();
    expect(actions).to.be.an('array');
    expect(actions).to.have.length(0);
  });

  it('should return empty actions array when no actions added', () => {
    const instance = new Base('test-id', 'create');
    const actions = instance.getActions();
    expect(actions).to.be.an('array');
    expect(actions).to.have.length(0);
  });

  describe('title', () => {
    it('should set title value on content type and return this', () => {
      const result = base.title('My Content Type');
      const contentType = mapInstance.get('test-id');
      expect(contentType.CREATE_CT.content_type.title).to.equal('My Content Type');
      expect(result).to.equal(base);
    });
  });

  describe('description', () => {
    it('should set description value on content type and return this', () => {
      const result = base.description('My Description');
      const contentType = mapInstance.get('test-id');
      expect(contentType.CREATE_CT.content_type.description).to.equal('My Description');
      expect(result).to.equal(base);
    });
  });

  describe('force', () => {
    it('should set force value on content type and return this', () => {
      const result = base.force(true);
      const contentType = mapInstance.get('test-id');
      expect(contentType.CREATE_CT.content_type.force).to.be.true;
      expect(result).to.equal(base);
    });
  });

  describe('dispatch', () => {
    it('should push customTasks action when id and opts are falsy', () => {
      const mockAction = { type: 'customTask', payload: { action: 'CUSTOM_TASK' } };
      sandbox.stub(actionCreatorsModule.actionCreators, 'customTasks').returns(mockAction as any);
      const mockCallsite = { getFileName: () => 'file.js', getLineNumber: () => 1 };

      base.dispatch(mockCallsite as any, null, null, 'create');

      const actions = mapInstance.get(actionMapper);
      expect(actions).to.be.an('array').with.lengthOf(1);
      expect(actions[0]).to.equal(mockAction);
    });

    it('should push contentType action when id and opts are provided', () => {
      const mockAction = { type: 'create', payload: { contentTypeId: 'blog', action: 'CREATE_CT' } };
      sandbox.stub(actionCreatorsModule.actionCreators.contentType, 'create').returns(mockAction as any);
      const mockCallsite = { getFileName: () => 'migration.js', getLineNumber: () => 10 };

      base.dispatch(mockCallsite as any, 'blog', { title: 'Blog' }, 'create');

      const actions = mapInstance.get(actionMapper);
      expect(actions).to.be.an('array').with.lengthOf(1);
      expect(actions[0]).to.equal(mockAction);
    });
  });
});
