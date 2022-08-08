declare type CryptoConfig = {
    algorithm?: string;
    encryptionKey?: string;
    typeIdentifier?: string;
};
export default class NodeCrypto {
    private readonly key;
    private readonly algorithm;
    private readonly typeIdentifier;
    constructor(config?: CryptoConfig);
    encrypt(plainData: any): string;
    decrypt(encryptedData: any): any;
}
export {};
