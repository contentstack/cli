import crypto from 'crypto';
import merge from 'lodash/merge';

type CryptoConfig = {
  algorithm?: string;
  encryptionKey?: string;
  typeIdentifier?: string;
};

const defaultValues = {
  typeIdentifier: '◈',
  algorithm: 'aes-192-cbc',
  //   file deepcode ignore HardcodedNonCryptoSecret: <This is a ToDo>
  encryptionKey: 'nF2ejRQcTv',
};

export default class NodeCrypto {
  private readonly key: Buffer;
  private readonly algorithm: string;
  private readonly typeIdentifier: string;

  constructor(config: CryptoConfig = defaultValues) {
    const { algorithm, encryptionKey, typeIdentifier } = merge(defaultValues, config);
    this.algorithm = algorithm;
    this.typeIdentifier = typeIdentifier;
    // deepcode ignore HardcodedSecret: <please specify a reason of ignoring this>
    this.key = crypto.scryptSync(encryptionKey, 'salt', 24);
  }

  encrypt(plainData) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let data = plainData;

    switch (typeof plainData) {
      case 'number':
        data = `${String(plainData)}${this.typeIdentifier}number`;
        break;
      case 'object':
        data = `${JSON.stringify(plainData)}${this.typeIdentifier}object`;
        break;
    }

    const encrypted = cipher.update(data, 'utf8', 'hex');

    return [encrypted + cipher.final('hex'), Buffer.from(iv).toString('hex')].join('|');
  }

  decrypt(encryptedData) {
    const [encrypted, iv] = encryptedData.split('|');
    if (!iv) throw new Error('IV not found');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));
    const result = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    const [data, type] = result.split(this.typeIdentifier);

    switch (type) {
      case 'number':
        return Number(data);
      case 'object':
        return JSON.parse(data);
    }

    return data;
  }
}
