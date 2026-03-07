import { describe, expect, it, vi } from 'vitest';
import { createMockCommand } from '../helpers/command';
import { ProjectInit } from '../../src/commands/project/init';

const mocks = vi.hoisted(() => ({
  writeManifest: vi.fn(),
  promptWithOptions: vi.fn(),
  booleanPrompt: vi.fn(),
}));

vi.mock('../../src/conduit-manifest', async original => {
  const actual = await original<typeof import('../../src/conduit-manifest')>();
  return {
    ...actual,
    writeManifest: mocks.writeManifest,
  };
});

vi.mock('../../src/utils/cli', () => ({
  promptWithOptions: mocks.promptWithOptions,
  booleanPrompt: mocks.booleanPrompt,
}));

describe('project init command', () => {
  it('writes selected database and modules to manifest', async () => {
    mocks.promptWithOptions.mockResolvedValueOnce('postgres');
    mocks.booleanPrompt
      .mockResolvedValueOnce(true) // add modules
      .mockResolvedValueOnce(true) // chat
      .mockResolvedValueOnce(false) // email
      .mockResolvedValueOnce(false) // forms
      .mockResolvedValueOnce(false) // push-notifications
      .mockResolvedValueOnce(false) // sms
      .mockResolvedValueOnce(true); // storage

    const logMock = vi.fn();
    const command = createMockCommand(
      ProjectInit,
      { flags: { dir: '.conduit' } },
      { log: logMock },
    );

    await command.run();

    expect(mocks.writeManifest).toHaveBeenCalledWith(
      {
        version: 'latest',
        database: 'postgres',
        modules: ['chat', 'storage'],
      },
      expect.stringContaining('.conduit'),
    );
    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('/conduit.yml'));
  });
});
