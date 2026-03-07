type CommandClass<T> = {
  prototype: T;
};

type MockCommandShape = {
  parse: (cls: unknown) => Promise<unknown>;
  log: (message?: string) => void;
  error: (message: string, options?: { exit?: number }) => never;
  config: { cacheDir: string };
};

export function createMockCommand<T extends object>(
  commandClass: CommandClass<T>,
  parseResult: unknown,
  overrides?: Partial<MockCommandShape>,
): T & MockCommandShape {
  const command = Object.create(commandClass.prototype) as T & MockCommandShape;
  command.parse = async () => parseResult;
  command.log = () => undefined;
  command.error = (message: string): never => {
    throw new Error(message);
  };
  command.config = { cacheDir: '/tmp/cli-cache' };

  if (overrides?.parse) command.parse = overrides.parse;
  if (overrides?.log) command.log = overrides.log;
  if (overrides?.error) command.error = overrides.error;
  if (overrides?.config) command.config = overrides.config;

  return command;
}
