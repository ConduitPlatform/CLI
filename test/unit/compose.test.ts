import { EventEmitter } from 'events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

const spawnMock = vi.fn();

vi.mock('child_process', () => ({
  spawn: spawnMock,
}));

describe('ComposeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds compose up args with profiles', async () => {
    vi.resetModules();
    const child = new MockChild();
    spawnMock.mockReturnValueOnce(child);
    const { ComposeManager } = await import('../../src/docker/compose');

    const manager = new ComposeManager();
    const promise = manager.up({
      cwd: '/tmp/conduit',
      env: { A: '1' },
      profiles: ['mongodb', 'chat'],
      log: false,
    });

    child.stdout.emit('data', Buffer.from('ok'));
    child.emit('close', 0, null);
    const result = await promise;

    expect(spawnMock).toHaveBeenCalledWith(
      'docker',
      ['compose', '--profile', 'mongodb', '--profile', 'chat', 'up', '-d'],
      expect.objectContaining({
        cwd: '/tmp/conduit',
      }),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ok');
  });

  it('includes --volumes when removing', async () => {
    vi.resetModules();
    const child = new MockChild();
    spawnMock.mockReturnValueOnce(child);
    const { ComposeManager } = await import('../../src/docker/compose');
    const manager = new ComposeManager();

    const promise = manager.rm({
      cwd: '/tmp/conduit',
      env: {},
      volumes: true,
      log: false,
    });

    child.emit('close', 0, null);
    await promise;

    expect(spawnMock).toHaveBeenCalledWith(
      'docker',
      ['compose', 'rm', '-f', '--volumes'],
      expect.any(Object),
    );
  });

  it('captures stderr output', async () => {
    vi.resetModules();
    const child = new MockChild();
    spawnMock.mockReturnValueOnce(child);
    const { ComposeManager } = await import('../../src/docker/compose');
    const manager = new ComposeManager();

    const promise = manager.stop({
      cwd: '/tmp/conduit',
      env: {},
      profiles: ['email'],
      log: false,
    });

    child.stderr.emit('data', Buffer.from('bad'));
    child.emit('close', 1, null);
    const result = await promise;

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('bad');
  });
});
