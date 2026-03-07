import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

export async function createTempWorkspace(prefix = 'cli-test-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function removeTempWorkspace(dir: string): Promise<void> {
  await fs.remove(dir);
}
