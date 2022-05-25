import cli from 'cli-ux';

export async function booleanPrompt(
  message: string,
  defaultValue?: 'yes' | 'no',
  silent?: boolean,
) {
  if (silent) {
    if (!defaultValue) throw new Error('Cannot set silent to true without a default value');
    return defaultValue === 'yes';
  }
  let res: 'yes' | 'y' | 'no' | 'n' | '' = '';
  while (!['yes', 'y', 'no', 'n'].includes(res)) {
    res = (await cli.prompt(`${message} (yes/no)`, { ...(defaultValue && { default: defaultValue }) })).toLowerCase();
  }
  return res === 'yes' || res === 'y';
}

export async function promptWithOptions(
  message: string,
  choices: string[],
  defaultValue?: string,
  capsSensitive?: false,
  silent?: boolean,
) {
  if (silent) {
    if (!defaultValue) throw new Error('Cannot set silent to true without a default value');
    return defaultValue;
  }
  if (defaultValue && !choices.includes(defaultValue)) {
    cli.error(
      `defaultValue: ${defaultValue} is not contained in choices array: ${choices}`,
      { exit: -1 },
    )
  }
  let res: string = '';
  while (!choices.includes(res)) {
    res = await cli.prompt(
      `${message} (options: ${choices.join(', ')})`,
      { ...(defaultValue && { default: defaultValue }) },
    );
  }
  return capsSensitive ? res : res.toLowerCase();
}
