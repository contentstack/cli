import { expect } from 'chai';
import { cliux } from '@contentstack/cli-utilities';
import RateLimitSetCommand from '../../../src/commands/config/set/rate-limit';

describe('Rate Limit Set Command', () => {
    let originalCliuxError: typeof cliux.error;
    let errorMessage: any;

    beforeEach(() => {
        originalCliuxError = cliux.error;
        cliux.error = (message: string) => {
            errorMessage = message;
        };
    });

    afterEach(() => {
        cliux.error = originalCliuxError;
        errorMessage = undefined;
    });

    it('Set rate limit: should handle valid input', async () => {
        const args = [
            '--org',
            'test-org-id',
            '--utilize',
            '70,80',
            '--limit-name',
            'getLimit,postLimit'
        ];
        await RateLimitSetCommand.run(args);
        expect(errorMessage).to.equal('Invalid limit names provided: getLimit, postLimit');
    });

    it('Set rate limit: should handle invalid utilization percentages', async () => {
        const args = [
            '--org',
            'test-org-id',
            '--utilize',
            '150',
            '--limit-name',
            'getLimit'
        ];
        await RateLimitSetCommand.run(args);
        expect(errorMessage).to.equal('Utilize percentages must be numbers between 0 and 100.');
    });

    it('Set rate limit: should handle mismatch between utilize percentages and limit names', async () => {
        const args = [
            '--org',
            'test-org-id',
            '--utilize',
            '70',
            '--limit-name',
            'getLimit,postLimit'
        ];
        await RateLimitSetCommand.run(args);
        expect(errorMessage).to.equal('The number of utilization percentages must match the number of limit names provided.');
    });

    it('Set rate limit: should handle invalid limit names', async () => {
        const args = [
            '--org',
            'test-org-id',
            '--utilize',
            '70,80',
            '--limit-name',
            'invalidLimit'
        ];
        await RateLimitSetCommand.run(args);
        expect(errorMessage).to.equal('The number of utilization percentages must match the number of limit names provided.');
    });
});