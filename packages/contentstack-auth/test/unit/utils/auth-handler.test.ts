import { expect } from 'chai';
import * as sinon from 'sinon';
import { authHandler, interactive } from '../../../src/utils';
import { cliux } from '@contentstack/cli-utilities';

describe('Auth Handler', () => {
  const mockUser = { email: 'test@example.com', authtoken: 'test-token' };
  const mockCredentials = { email: 'test@example.com', password: 'test-password' };
  const mockTFAToken = '123456';

  let clientStub: any;

  beforeEach(() => {
    clientStub = {
      login: sinon.stub(),
      axiosInstance: {
        post: sinon.stub()
      }
    };
    // @ts-ignore - accessing private property for testing
    authHandler.client = clientStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('handleOTPFlow', () => {
    it('should return provided TFA token if available', async () => {
      const result = await (authHandler as any).handleOTPFlow(mockTFAToken, mockCredentials);
      expect(result).to.equal(mockTFAToken);
    });

    it('should handle SMS OTP flow', async () => {
      const smsCode = '654321';
      clientStub.axiosInstance.post.resolves();
      
      const askOTPChannelStub = sinon.stub(interactive, 'askOTPChannel').resolves('sms');
      const askOTPStub = sinon.stub(interactive, 'askOTP').resolves(smsCode);
      sinon.stub(cliux, 'print').returns();

      const result = await (authHandler as any).handleOTPFlow(undefined, mockCredentials);

      expect(result).to.equal(smsCode);
      expect(askOTPChannelStub.calledOnce).to.be.true;
      expect(clientStub.axiosInstance.post.calledOnce).to.be.true;
      expect(askOTPStub.calledOnce).to.be.true;
    });

    it('should handle 2FA app flow', async () => {
      const appCode = '987654';
      
      const askOTPChannelStub = sinon.stub(interactive, 'askOTPChannel').resolves('2fa_app');
      const askOTPStub = sinon.stub(interactive, 'askOTP').resolves(appCode);

      const result = await (authHandler as any).handleOTPFlow(undefined, mockCredentials);

      expect(result).to.equal(appCode);
      expect(askOTPChannelStub.calledOnce).to.be.true;
      expect(clientStub.axiosInstance.post.notCalled).to.be.true;
      expect(askOTPStub.calledOnce).to.be.true;
    });
  });

  describe('requestSMSOTP', () => {
    it('should send SMS OTP request successfully', async () => {
      clientStub.axiosInstance.post.resolves();
      sinon.stub(cliux, 'print').returns();

      await (authHandler as any).requestSMSOTP(mockCredentials);

      expect(clientStub.axiosInstance.post.calledOnce).to.be.true;
      expect(clientStub.axiosInstance.post.firstCall.args[0]).to.equal('/user/request_token_sms');
      expect(clientStub.axiosInstance.post.firstCall.args[1]).to.deep.equal({ user: mockCredentials });
    });

    it('should handle SMS request failure', async () => {
      const error = { type: 'APPLICATION_ERROR' };
      clientStub.axiosInstance.post.rejects(error);

      try {
        await (authHandler as any).requestSMSOTP(mockCredentials);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.an('error');
        expect(clientStub.axiosInstance.post.calledOnce).to.be.true;
      }
    });
  });

  describe('login with 2FA', () => {
    it('should use provided TFA token directly if available', async () => {
      // First call triggers 2FA, second call succeeds
      clientStub.login
        .onFirstCall().resolves({ error_code: 294 })
        .onSecondCall().resolves({ user: mockUser });

      const result = await authHandler.login(
        mockCredentials.email,
        mockCredentials.password,
        mockTFAToken
      );

      expect(result).to.deep.equal(mockUser);
      expect(clientStub.login.firstCall.args[0]).to.deep.equal({
        email: mockCredentials.email,
        password: mockCredentials.password,
        tfa_token: mockTFAToken
      });
      expect(clientStub.login.secondCall.args[0]).to.deep.equal({
        email: mockCredentials.email,
        password: mockCredentials.password,
        tfa_token: mockTFAToken
      });
    });

    it('should handle SMS 2FA flow when no token provided', async () => {
      const smsCode = '654321';
      clientStub.login
        .onFirstCall().resolves({ error_code: 294 })
        .onSecondCall().resolves({ user: mockUser });
      clientStub.axiosInstance.post.resolves();

      const askOTPChannelStub = sinon.stub(interactive, 'askOTPChannel').resolves('sms');
      const askOTPStub = sinon.stub(interactive, 'askOTP').resolves(smsCode);
      sinon.stub(cliux, 'print').returns();

      const result = await authHandler.login(mockCredentials.email, mockCredentials.password);

      expect(result).to.deep.equal(mockUser);
      expect(askOTPChannelStub.calledOnce).to.be.true;
      expect(clientStub.axiosInstance.post.calledOnce).to.be.true;
      expect(askOTPStub.calledOnce).to.be.true;
      expect(clientStub.login.secondCall.args[0]).to.deep.equal({
        email: mockCredentials.email,
        password: mockCredentials.password,
        tfa_token: smsCode
      });
    });

    it('should handle 2FA app flow when no token provided', async () => {
      const appCode = '987654';
      clientStub.login
        .onFirstCall().resolves({ error_code: 294 })
        .onSecondCall().resolves({ user: mockUser });

      const askOTPChannelStub = sinon.stub(interactive, 'askOTPChannel').resolves('2fa_app');
      const askOTPStub = sinon.stub(interactive, 'askOTP').resolves(appCode);

      const result = await authHandler.login(mockCredentials.email, mockCredentials.password);

      expect(result).to.deep.equal(mockUser);
      expect(askOTPChannelStub.calledOnce).to.be.true;
      expect(clientStub.axiosInstance.post.notCalled).to.be.true;
      expect(askOTPStub.calledOnce).to.be.true;
      expect(clientStub.login.secondCall.args[0]).to.deep.equal({
        email: mockCredentials.email,
        password: mockCredentials.password,
        tfa_token: appCode
      });
    });

    it('should handle SMS request failure', async () => {
      clientStub.login.onFirstCall().resolves({ error_code: 294 });
      clientStub.axiosInstance.post.rejects({ type: 'APPLICATION_ERROR' });

      const askOTPChannelStub = sinon.stub(interactive, 'askOTPChannel').resolves('sms');

      try {
        await authHandler.login(mockCredentials.email, mockCredentials.password);
        expect.fail('Should have thrown an error');
      } catch (error) {

        expect(error).to.be.an('error');
        expect(askOTPChannelStub.calledOnce).to.be.true;
        expect(clientStub.axiosInstance.post.calledOnce).to.be.true;
      }
    });
  });
});