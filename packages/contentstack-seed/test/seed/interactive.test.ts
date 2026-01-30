// Mock inquirer before importing anything
const mockInquirer = {
  prompt: jest.fn(),
};

jest.mock('inquirer', () => mockInquirer);

import * as interactive from '../../src/seed/interactive';
import { Organization, Stack } from '../../src/seed/contentstack/client';

describe('Interactive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('inquireRepo', () => {
    it('should return single repo when only one is provided', async () => {
      const repos = [
        {
          name: 'stack-test',
          html_url: 'https://github.com/user/stack-test',
        },
      ];

      const result = await interactive.inquireRepo(repos);

      expect(result.choice).toBe('stack-test');
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    it('should prompt user when multiple repos are available', async () => {
      const repos = [
        {
          name: 'stack-repo1',
          html_url: 'https://github.com/user/stack-repo1',
        },
        {
          name: 'stack-repo2',
          html_url: 'https://github.com/user/stack-repo2',
        },
      ];

      mockInquirer.prompt = jest.fn().mockResolvedValue({
        choice: 'stack-repo1',
      });

      const result = await interactive.inquireRepo(repos);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'choice',
          message: 'Select a Stack to Import',
        }),
      ]);
      expect(result.choice).toBe('stack-repo1');
    });

    it('should throw error when no repos are provided', async () => {
      await expect(interactive.inquireRepo([])).rejects.toThrow(
        'Precondition failed: No Repositories found.',
      );
    });

    it('should throw error when repos is null', async () => {
      await expect(interactive.inquireRepo(null as any)).rejects.toThrow(
        'Precondition failed: No Repositories found.',
      );
    });

  });

  describe('inquireOrganization', () => {
    it('should return single organization when only one is provided', async () => {
      const organizations: Organization[] = [
        {
          uid: 'org-1',
          name: 'Organization 1',
          enabled: true,
        },
      ];

      const result = await interactive.inquireOrganization(organizations);

      expect(result).toEqual(organizations[0]);
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    it('should prompt user when multiple organizations are available', async () => {
      const organizations: Organization[] = [
        {
          uid: 'org-1',
          name: 'Organization 1',
          enabled: true,
        },
        {
          uid: 'org-2',
          name: 'Organization 2',
          enabled: true,
        },
      ];

      mockInquirer.prompt = jest.fn().mockResolvedValue({
        uid: 'org-2',
      });

      const result = await interactive.inquireOrganization(organizations);

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'uid',
          message: 'Select an Organization',
        }),
      ]);
      expect(result).toEqual(organizations[1]);
    });

    it('should throw error when no organizations are provided', async () => {
      await expect(interactive.inquireOrganization([])).rejects.toThrow(
        'Precondition failed: No Organizations found.',
      );
    });

    it('should throw error when organizations is null', async () => {
      await expect(interactive.inquireOrganization(null as any)).rejects.toThrow(
        'Precondition failed: No Organizations found.',
      );
    });
  });

  describe('inquireProceed', () => {
    it('should return true when user confirms', async () => {
      mockInquirer.prompt = jest.fn().mockResolvedValue({
        choice: true,
      });

      const result = await interactive.inquireProceed();

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'choice',
          message: 'This Stack contains content. Do you wish to continue?',
        }),
      ]);
      expect(result).toBe(true);
    });

    it('should return false when user declines', async () => {
      mockInquirer.prompt = jest.fn().mockResolvedValue({
        choice: false,
      });

      const result = await interactive.inquireProceed();

      expect(result).toBe(false);
    });
  });

  describe('inquireStack', () => {
    it('should create new stack when stackName is provided', async () => {
      const stacks: Stack[] = [];
      const stackName = 'My New Stack';

      const result = await interactive.inquireStack(stacks, stackName);

      expect(result.isNew).toBe(true);
      expect(result.name).toBe('My New Stack');
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    it('should prompt for new or existing when stacks exist and no stackName', async () => {
      const stacks: Stack[] = [
        {
          uid: 'stack-1',
          name: 'Existing Stack',
          master_locale: 'en-us',
          api_key: 'api-key-1',
          org_uid: 'org-1',
        },
      ];

      (mockInquirer.prompt as jest.Mock)
        .mockResolvedValueOnce({
          choice: true, // New stack
        })
        .mockResolvedValueOnce({
          name: 'My New Stack',
        });

      const result = await interactive.inquireStack(stacks);

      expect(result.isNew).toBe(true);
      expect(result.name).toBe('My New Stack');
    });

    it('should select existing stack when user chooses existing', async () => {
      const stacks: Stack[] = [
        {
          uid: 'stack-1',
          name: 'Existing Stack',
          master_locale: 'en-us',
          api_key: 'api-key-1',
          org_uid: 'org-1',
        },
        {
          uid: 'stack-2',
          name: 'Another Stack',
          master_locale: 'en-us',
          api_key: 'api-key-2',
          org_uid: 'org-1',
        },
      ];

      (mockInquirer.prompt as jest.Mock)
        .mockResolvedValueOnce({
          choice: false, // Existing stack
        })
        .mockResolvedValueOnce({
          uid: 'stack-2',
        });

      const result = await interactive.inquireStack(stacks);

      expect(result.isNew).toBe(false);
      expect(result.name).toBe('Another Stack');
      expect(result.uid).toBe('stack-2');
      expect(result.api_key).toBe('api-key-2');
    });

    it('should prompt for stack name when creating new stack without stackName', async () => {
      const stacks: Stack[] = [];

      (mockInquirer.prompt as jest.Mock).mockResolvedValue({
        name: 'User Entered Stack',
      });

      const result = await interactive.inquireStack(stacks);

      expect(result.isNew).toBe(true);
      expect(result.name).toBe('User Entered Stack');
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'input',
          name: 'name',
          message: 'Enter a stack name',
        }),
      ]);
    });

    it('should validate stack name input', async () => {
      const stacks: Stack[] = [];

      const validateFn = jest.fn();
      (mockInquirer.prompt as jest.Mock).mockImplementation((questions: any) => {
        const question = questions[0];
        if (question.validate) {
          expect(question.validate('')).toBe('Required');
          expect(question.validate('   ')).toBe('Required');
          expect(question.validate('Valid Name')).toBe(true);
        }
        return Promise.resolve({ name: 'Valid Name' });
      });

      await interactive.inquireStack(stacks);

      expect(mockInquirer.prompt).toHaveBeenCalled();
    });

    it('should trim stack name input', async () => {
      const stacks: Stack[] = [];
      const stackName = '  Trimmed Stack Name  ';

      const result = await interactive.inquireStack(stacks, stackName);

      expect(result.name).toBe('Trimmed Stack Name');
    });

    it('should sort stack choices alphabetically', async () => {
      const stacks: Stack[] = [
        {
          uid: 'stack-3',
          name: 'Zebra Stack',
          master_locale: 'en-us',
          api_key: 'api-key-3',
          org_uid: 'org-1',
        },
        {
          uid: 'stack-1',
          name: 'Alpha Stack',
          master_locale: 'en-us',
          api_key: 'api-key-1',
          org_uid: 'org-1',
        },
        {
          uid: 'stack-2',
          name: 'Beta Stack',
          master_locale: 'en-us',
          api_key: 'api-key-2',
          org_uid: 'org-1',
        },
      ];

      (mockInquirer.prompt as jest.Mock)
        .mockResolvedValueOnce({
          choice: false,
        })
        .mockResolvedValueOnce({
          uid: 'stack-1',
        });

      await interactive.inquireStack(stacks);

      const promptCall = (mockInquirer.prompt as jest.Mock).mock.calls[1][0][0];
      const choices = promptCall.choices;
      expect(choices[0].name).toBe('Alpha Stack');
      expect(choices[1].name).toBe('Beta Stack');
      expect(choices[2].name).toBe('Zebra Stack');
    });

    it('should handle empty stacks array with stackName', async () => {
      const stacks: Stack[] = [];
      const stackName = 'New Stack';

      const result = await interactive.inquireStack(stacks, stackName);

      expect(result.isNew).toBe(true);
      expect(result.name).toBe('New Stack');
    });
  });
});
