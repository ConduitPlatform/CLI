import { describe, expect, it, vi } from 'vitest';
import { createMockCommand } from '../helpers/command';
import { ProjectDoctor } from '../../src/commands/project/doctor';

const mocks = vi.hoisted(() => ({
  runDoctorChecks: vi.fn(),
}));

vi.mock('../../src/utils/doctor', () => ({
  runDoctorChecks: mocks.runDoctorChecks,
}));

describe('project doctor command', () => {
  it('prints all checks when doctor passes', async () => {
    mocks.runDoctorChecks.mockResolvedValueOnce([
      { name: 'Docker daemon', ok: true, details: 'running' },
      { name: 'Port 8080 (UI)', ok: true, details: 'free' },
    ]);
    const logMock = vi.fn();
    const command = createMockCommand(
      ProjectDoctor,
      { flags: { dir: '.conduit' } },
      { log: logMock },
    );

    await command.run();

    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('[OK] Docker daemon'));
    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('[OK] Port 8080 (UI)'));
  });

  it('fails with exit code 2 when any check fails', async () => {
    mocks.runDoctorChecks.mockResolvedValueOnce([
      {
        name: '.conduit manifest',
        ok: false,
        details: 'missing',
        fix: 'run conduit project init',
      },
    ]);
    const command = createMockCommand(ProjectDoctor, {
      flags: { dir: '.conduit' },
    });

    await expect(command.run()).rejects.toThrow('Doctor found 1 failing check(s).');
  });
});
