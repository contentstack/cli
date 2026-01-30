import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import * as https from 'https';
import * as mapModule from '../../../src/utils/map';
import * as constantsModule from '../../../src/utils/constants';
import httpsRequest from '../../../src/utils/request';

describe('Request Utils', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let requestStub: SinonStub;
  let getMapInstanceStub: SinonStub;
  let getDataWithActionStub: SinonStub;
  let mockMapInstance: Map<string, any>;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    sandbox = createSandbox();
    mockMapInstance = new Map();
    mockRequest = {
      on: sandbox.stub(),
      write: sandbox.stub(),
      end: sandbox.stub(),
    };
    mockResponse = {
      on: sandbox.stub(),
    };

    // https.request might be non-configurable in newer Node versions
    // Use require to get the actual module
    const httpsModule = require('https');
    try {
      requestStub = sandbox.stub(httpsModule, 'request').callsFake((options: any, callback?: any) => {
        // Call the callback immediately with mockResponse if provided
        if (callback && typeof callback === 'function') {
          setImmediate(() => callback(mockResponse));
        }
        return mockRequest as any;
      });
    } catch (e) {
      // If request can't be stubbed directly, create a stub that mimics the behavior
      requestStub = sandbox.stub().callsFake((options: any, callback?: any) => {
        if (callback && typeof callback === 'function') {
          setImmediate(() => callback(mockResponse));
        }
        return mockRequest as any;
      });
    }
    getMapInstanceStub = sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    getDataWithActionStub = sandbox.stub(mapModule, 'getDataWithAction').returns({
      content_type: { uid: 'test-id', title: 'Test' },
    });

    sandbox.stub(constantsModule, 'actions').value({
      DELETE_CT: 'DELETE_CT',
    });
    sandbox.stub(constantsModule, 'nonWritableMethods').value(['GET', 'DELETE']);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should export https function', () => {
    expect(httpsRequest).to.exist;
    expect(httpsRequest).to.be.a('function');
  });

  describe('https request function', () => {
    it('should make GET request successfully', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'GET',
        id: 'test-id',
        action: 'GET_CT',
      };

      // Set up mocks BEFORE creating the request
      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      mockRequest.on.callsFake((event: string, callback: any) => {
        if (event === 'response') {
          setImmediate(() => callback(mockResponse));
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({});

      dataFn.then((result: any) => {
        expect(result).to.deep.equal({ success: true });
        expect(requestStub.called).to.be.true;
        expect(mockRequest.write.called).to.be.false;
        done();
      }).catch(done);
    });

    it('should make POST request with data', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'POST',
        id: 'test-id',
        action: 'CREATE_CT',
      };

      // Set up mocks BEFORE creating the request
      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"content_type":{"uid":"test-id"}}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      mockRequest.on.callsFake((event: string, callback: any) => {
        if (event === 'response') {
          setImmediate(() => callback(mockResponse));
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({ content_type: { title: 'Test' } });

      dataFn.then((result: any) => {
        expect(result).to.have.property('content_type');
        expect(mockRequest.write.called).to.be.true;
        expect(mockRequest.end.called).to.be.true;
        done();
      }).catch(done);
    });

    it('should handle DELETE request with force parameter', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types/test-id',
        headers: {},
        method: 'DELETE',
        id: 'test-id',
        action: 'DELETE_CT',
      };

      getDataWithActionStub.returns({
        content_type: { uid: 'test-id', force: true },
      });

      // Set up mocks BEFORE creating the request
      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"content_type":{"uid":"test-id"}}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      mockRequest.on.callsFake((event: string, callback: any) => {
        if (event === 'response') {
          setImmediate(() => callback(mockResponse));
        }
      });

      // Pass null/undefined to use getDataWithAction
      const requestFn = httpsRequest(options);
      const dataFn = requestFn(null);

      dataFn.then(() => {
        const callArgs = requestStub.getCalls()[0].args[0];
        expect(callArgs.path).to.include('force=true');
        done();
      }).catch(done);
    });

    it('should handle request errors', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'GET',
        id: 'test-id',
        action: 'GET_CT',
      };

      const error = new Error('Network error');
      // Set up mocks BEFORE creating the request
      mockRequest.on.callsFake((event: string, callback: any) => {
        if (event === 'error') {
          setImmediate(() => callback(error));
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({});

      dataFn.then(() => {
        done(new Error('Should have rejected'));
      }).catch((err: any) => {
        expect(err).to.equal(error);
        done();
      });
    });

    it('should handle JSON parse errors', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'GET',
        id: 'test-id',
        action: 'GET_CT',
      };

      // Set up mocks BEFORE creating the request
      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('invalid json')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      mockRequest.on.callsFake((event: string, callback: any) => {
        if (event === 'response') {
          setImmediate(() => callback(mockResponse));
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({});

      dataFn.then(() => {
        done(new Error('Should have rejected'));
      }).catch((err: any) => {
        expect(err).to.equal('Error while parsing response!');
        done();
      });
    });

    it('should set Content-Length header for writable methods', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'POST',
        id: 'test-id',
        action: 'CREATE_CT',
      };

      // Set up mocks BEFORE creating the request
      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      mockRequest.on.callsFake((event: string, callback: any) => {
        if (event === 'response') {
          setImmediate(() => callback(mockResponse));
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({ content_type: { title: 'Test' } });

      dataFn.then(() => {
        const callArgs = requestStub.getCalls()[0].args[0];
        expect(callArgs.headers['Content-Length']).to.exist;
        done();
      }).catch(done);
    });

    it('should remove Content-Type and Content-Length for GET requests', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '100' },
        method: 'GET',
        id: 'test-id',
        action: 'GET_CT',
      };

      // Set up mocks BEFORE creating the request
      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      mockRequest.on.callsFake((event: string, callback: any) => {
        if (event === 'response') {
          setImmediate(() => callback(mockResponse));
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({});

      dataFn.then(() => {
        const callArgs = requestStub.getCalls()[0].args[0];
        expect(callArgs.headers['Content-Type']).to.be.undefined;
        expect(callArgs.headers['Content-Length']).to.be.undefined;
        done();
      }).catch(done);
    });

    it('should use provided data instead of map data when available', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'POST',
        id: 'test-id',
        action: 'CREATE_CT',
      };

      // Set up mocks BEFORE creating the request
      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      mockRequest.on.callsFake((event: string, callback: any) => {
        if (event === 'response') {
          setImmediate(() => callback(mockResponse));
        }
      });

      const providedData = { content_type: { title: 'Provided Title' } };
      const requestFn = httpsRequest(options);
      const dataFn = requestFn(providedData);

      dataFn.then(() => {
        expect(mockRequest.write.called).to.be.true;
        const writtenData = JSON.parse(mockRequest.write.getCalls()[0].args[0]);
        expect(writtenData.content_type.title).to.equal('Provided Title');
        done();
      }).catch(done);
    });

    // Additional test cases for better coverage
    it('should return a function that accepts data', () => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'POST',
        id: 'test-id',
        action: 'CREATE_CT',
      };

      const requestFn = httpsRequest(options);
      expect(requestFn).to.be.a('function');
    });

    it('should return undefined for GET method in getData', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'GET',
        id: 'test-id',
        action: 'GET_CT',
      };

      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({});

      dataFn.then(() => {
        // GET method should not write data
        expect(mockRequest.write.called).to.be.false;
        done();
      }).catch(done);
    });

    it('should use provided _data when available instead of map data', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'POST',
        id: 'test-id',
        action: 'CREATE_CT',
      };

      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      const providedData = { content_type: { title: 'Custom Title', uid: 'custom-id' } };
      const requestFn = httpsRequest(options);
      const dataFn = requestFn(providedData);

      dataFn.then(() => {
        expect(mockRequest.write.called).to.be.true;
        const writtenData = JSON.parse(mockRequest.write.getCalls()[0].args[0]);
        expect(writtenData.content_type.title).to.equal('Custom Title');
        expect(writtenData.content_type.uid).to.equal('custom-id');
        done();
      }).catch(done);
    });

    it('should fall back to getDataWithAction when _data is null', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'POST',
        id: 'test-id',
        action: 'CREATE_CT',
      };

      getDataWithActionStub.returns({
        content_type: { uid: 'map-id', title: 'Map Title' },
      });

      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn(null);

      dataFn.then(() => {
        expect(getDataWithActionStub.called).to.be.true;
        expect(getDataWithActionStub.calledWith('test-id', mockMapInstance, 'CREATE_CT')).to.be.true;
        expect(mockRequest.write.called).to.be.true;
        done();
      }).catch(done);
    });

    it('should handle DELETE_CT action and add force query parameter', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types/test-id',
        headers: {},
        method: 'DELETE',
        id: 'test-id',
        action: 'DELETE_CT',
      };

      getDataWithActionStub.returns({
        content_type: { uid: 'test-id', force: true },
      });

      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      // Pass null to use getDataWithAction instead of provided data
      const requestFn = httpsRequest(options);
      const dataFn = requestFn(null);

      dataFn.then(() => {
        const callArgs = requestStub.getCalls()[0].args[0];
        expect(callArgs.path).to.include('force=true');
        done();
      }).catch(done);
    });

    it('should set Content-Length header for POST requests', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'POST',
        id: 'test-id',
        action: 'CREATE_CT',
      };

      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({ content_type: { title: 'Test' } });

      dataFn.then(() => {
        const callArgs = requestStub.getCalls()[0].args[0];
        expect(callArgs.headers['Content-Length']).to.exist;
        expect(callArgs.headers['Content-Length']).to.be.a('number');
        done();
      }).catch(done);
    });

    it('should remove Content-Type and Content-Length for DELETE requests', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types/test-id',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '100' },
        method: 'DELETE',
        id: 'test-id',
        action: 'DELETE_OTHER',
      };

      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({});

      dataFn.then(() => {
        const callArgs = requestStub.getCalls()[0].args[0];
        expect(callArgs.headers['Content-Type']).to.be.undefined;
        expect(callArgs.headers['Content-Length']).to.be.undefined;
        done();
      }).catch(done);
    });

    it('should handle multiple data chunks in response', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: {},
        method: 'GET',
        id: 'test-id',
        action: 'GET_CT',
      };

      const dataCallbacks: any[] = [];
      const endCallbacks: any[] = [];
      
      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          dataCallbacks.push(callback);
        } else if (event === 'end') {
          endCallbacks.push(callback);
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({});

      // After the request is set up, simulate data chunks
      setImmediate(() => {
        // Simulate first chunk
        if (dataCallbacks.length > 0) {
          dataCallbacks[0](Buffer.from('{"success":'));
        }
        // Simulate second chunk
        setImmediate(() => {
          if (dataCallbacks.length > 0) {
            dataCallbacks[0](Buffer.from('true}'));
          }
          // Then end
          setImmediate(() => {
            if (endCallbacks.length > 0) {
              endCallbacks[0]();
            }
          });
        });
      });

      dataFn.then((result: any) => {
        // The response should concatenate chunks: '{"success":' + 'true}' = '{"success":true}'
        expect(result).to.deep.equal({ success: true });
        done();
      }).catch(done);
    });

    it('should not write data for DELETE requests', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types/test-id',
        headers: {},
        method: 'DELETE',
        id: 'test-id',
        action: 'DELETE_OTHER',
      };

      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({});

      dataFn.then(() => {
        expect(mockRequest.write.called).to.be.false;
        expect(mockRequest.end.called).to.be.true;
        done();
      }).catch(done);
    });

    it('should preserve other headers when setting Content-Length', (done) => {
      const options = {
        hostname: 'api.contentstack.io',
        path: '/v3/content_types',
        headers: { 'Authorization': 'Bearer token123', 'X-Custom-Header': 'custom-value' },
        method: 'POST',
        id: 'test-id',
        action: 'CREATE_CT',
      };

      mockResponse.on.callsFake((event: string, callback: any) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from('{"success":true}')));
        } else if (event === 'end') {
          setImmediate(() => callback());
        }
      });

      const requestFn = httpsRequest(options);
      const dataFn = requestFn({ content_type: { title: 'Test' } });

      dataFn.then(() => {
        const callArgs = requestStub.getCalls()[0].args[0];
        expect(callArgs.headers['Authorization']).to.equal('Bearer token123');
        expect(callArgs.headers['X-Custom-Header']).to.equal('custom-value');
        expect(callArgs.headers['Content-Length']).to.exist;
        done();
      }).catch(done);
    });

  });
});
