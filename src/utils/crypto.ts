import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';
import { Command } from '@oclif/command';
import cli from 'cli-ux';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16;
const PASSPHRASE_VERIFICATION = 'Conduit';

export class CryptoTools {
  private static _instance?: CryptoTools;
  private constructor(private readonly passphrase: string) {}
  static async getInstance(command: Command, mode: 'read' | 'write') {
    if (!CryptoTools._instance) {
      let passphrase: string;
      if (mode === 'write') {
        passphrase = await getNewPassphrase(command);
      } else {
        passphrase = await getExistingPassphrase(command);
      }
      CryptoTools._instance = new CryptoTools(passphrase);
    }
    return CryptoTools._instance
  }

  encrypt(text: string) {
    return CryptoTools._encrypt(text, this.passphrase);
  }

  decrypt(text: string) {
    return CryptoTools._decrypt(text, this.passphrase);
  }

  static _encrypt(text: string, passphrase: string) {
    const key = pbkdf2Sync(passphrase, os.hostname(), 1, 32, 'sha512');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  static _decrypt(text: string, passphrase: string) {
    const key = pbkdf2Sync(passphrase, os.hostname(), 1, 32, 'sha512');
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

async function getNewPassphrase(command: Command) {
  let passphrase = 'apertureScience';
  let confirmation = 'blackMesa';
  while (true) {
    passphrase = await cli.prompt('Insert an encryption passphrase for your data', { type: 'hide' });
    confirmation = await cli.prompt('Confirm your passphrase', { type: 'hide' });
    if (passphrase === confirmation) break;
    console.log('Passphrases did not match!');
  }
  // Update Passphrase Verification File
  const cachePath = path.join(command.config.cacheDir, 'passphrase_verification');
  const encryptedValidator = CryptoTools._encrypt(PASSPHRASE_VERIFICATION, passphrase);
  fs.writeFileSync(cachePath, encryptedValidator);
  return passphrase;
}

async function getExistingPassphrase(command: Command) {
  const cachePath = path.join(command.config.cacheDir, 'passphrase_verification');
  const encryptedPassphrase = fs.readFileSync(cachePath).toString();
  let passphrase: string;
  while (true) {
    passphrase = await cli.prompt('Insert data decryption passphrase', { type: 'hide' });
    // Verify passphrase
    let readValue = '';
    try {
      readValue = CryptoTools._decrypt(encryptedPassphrase, passphrase);
    } catch {}
    if (readValue !== '' && readValue === PASSPHRASE_VERIFICATION) {
      break;
    }
    console.log('Invalid passphrase provided');
  }
  return passphrase;
}
