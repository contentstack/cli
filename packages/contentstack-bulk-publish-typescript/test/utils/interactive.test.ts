import { expect } from 'chai';
import * as sinon from 'sinon';
import config from '../../src/config'
import { interactive, cliux } from '../../src/utils'
import {selectors} from '@contentstack/cli-utilities'

describe('Interactive', () => {
  let inquireStub;
  beforeEach(function () {
    inquireStub = sinon.stub(cliux, 'inquire');
  });
  afterEach(function () {
    inquireStub.restore();
  });

  it('ask otp channel', async function () {
    const channel = 'authy';
    inquireStub.callsFake(function () {
      return Promise.resolve(channel);
    });
    const result = await interactive.askOTPChannel();
    expect(result).to.be.equal(channel);
  });

  it('ask otp', async function () {
    const otp = '22222';
    inquireStub.callsFake(function () {
      return Promise.resolve(otp);
    });
    const result = await interactive.askOTP();
    expect(result).to.be.equal(otp);
  });

  it('ask password', async function () {
    const password = 'testpassword';
    inquireStub.callsFake(function () {
      return Promise.resolve(password);
    });
    const result = await interactive.askPassword();
    expect(result).to.be.equal(password);
  });

  it('ask confirmation', async function () {
  	const answer = true
  	inquireStub.callsFake(function () {
  		return Promise.resolve(answer)
  	})
  	const result = await interactive.confirm({messageCode: 'DUMMY_MESSAGE_CODE'});
  	expect(result).to.be.equal(answer)
  })

  it('ask command', async function () {
  	const chosenCommand = Object.keys(config.commands)[0]
  	inquireStub.callsFake(function () {
  		return Promise.resolve(chosenCommand)
  	})
  	const result = await interactive.chooseCommand();
  	expect(result).to.be.equal(chosenCommand)
  })

  it('ask token alias', async function() {
  	// change this to a dummy value of type Token
  	const chosenTokenAlias = 'chosenTokenAlias'
  	const chosenTokenAliasStub = sinon.stub(selectors, 'chooseTokenAlias')
  	chosenTokenAliasStub.callsFake(function () {
  		return Promise.resolve(chosenTokenAlias)
  	})
  	const result = await interactive.askTokenAlias()
  	expect(result).to.be.equal(chosenTokenAlias)
  	chosenTokenAliasStub.restore()
  })

  it('ask delivery token', async function() {
  	// change this to a dummy value of type Token
  	const deliveryToken = 'deliveryToken'
  	const deliveryTokenStub = sinon.stub(selectors, 'chooseDeliveryTokenAlias')
  	deliveryTokenStub.callsFake(function () {
  		return Promise.resolve(deliveryToken)
  	})
  	const result = await interactive.askDeliveryToken()
  	expect(result).to.be.equal(deliveryToken)
  	deliveryTokenStub.restore()
  })

  it('ask content types', async function() {
  	const contentTypes = [{uid: 'contentType1'}, {uid: 'contentType2'}]
  	const contentTypesStub = sinon.stub(selectors, 'chooseContentTypes')
  	contentTypesStub.callsFake(function () {
  		return Promise.resolve(contentTypes)
  	})
  	const result = await interactive.askContentTypes({stack: {}})
  	expect(result).to.have.all.members(contentTypes.map(ct => ct.uid))
  	contentTypesStub.restore()
  })

  it('ask content type', async function() {
    const contentType = 'contentType'
    const contentTypeStub = sinon.stub(selectors, 'chooseContentType')
    contentTypeStub.callsFake(function () {
      return Promise.resolve(contentType)
    })
    const result = await interactive.askContentType({stack: {}})
    expect(result).to.be.equal(contentType)
    contentTypeStub.restore()
  })

  it('ask token alias', async function() {

  })
  
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})
  // it('ask token alias', async function() {})

});
