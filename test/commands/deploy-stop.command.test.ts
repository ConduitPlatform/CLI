import { describe, expect, it, vi } from 'vitest';
import { createMockCommand } from '../helpers/command';
import { DeployStop } from '../../src/commands/deploy/stop';

const mocks = vi.hoisted(() => ({
  dockerComposeStop: vi.fn(),
  dockerGetInstance: vi.fn(),
  getTargetDeploymentPaths: vi.fn(),
  readJSONSync: vi.fn(),
}));

vi.mock('../../src/docker', () => ({
  Docker: {
    getInstance: mocks.dockerGetInstance,
  },
}));

vi.mock('../../src/deploy/utils', () => ({
  getTargetDeploymentPaths: mocks.getTargetDeploymentPaths,
}));

vi.mock('fs-extra', () => ({
  readJSONSync: mocks.readJSONSync,
}));

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

describe('deploy stop command', () => {
  it('calls docker compose stop with deployment profiles', async () => {
    mocks.dockerComposeStop.mockResolvedValueOnce({
      exitCode: 0,
      stderr: '',
      stdout: '',
    });
    mocks.dockerGetInstance.mockReturnValue({
      compose: { stop: mocks.dockerComposeStop },
    });
    mocks.getTargetDeploymentPaths.mockReturnValue({
      manifestPath: '/tmp/manifest',
      envPath: '/tmp/manifest/env',
      deploymentConfigPath: '/tmp/deploy-config.json',
    });
    mocks.readJSONSync.mockReturnValue({
      modules: ['mongodb', 'chat'],
      environment: { IMAGE_TAG: 'main' },
    });

    const command = createMockCommand(DeployStop, {});
    await command.run();

    expect(mocks.dockerComposeStop).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: '/tmp/manifest',
        profiles: ['mongodb', 'chat'],
      }),
    );
  });
});
