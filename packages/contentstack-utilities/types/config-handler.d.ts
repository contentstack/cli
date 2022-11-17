import Conf from 'conf';
declare class Config {
    private config;
    constructor();
    init(): Conf<Record<string, unknown>>;
    importOldConfig(): void;
    setOldConfigStoreData(data: any, _path?: string): void;
    removeOldConfigStoreFile(): void;
    private getOldConfig;
    private fallbackInit;
    private getObfuscationKey;
    private getConfigDataAndUnlinkConfigFile;
    private getEncryptedConfig;
    private getDecryptedConfig;
    get(key: any): string | any;
    set(key: any, value: any): Promise<Conf<Record<string, unknown>>>;
    delete(key: any): Conf<Record<string, unknown>>;
    clear(): void;
}
declare const _default: Config;
export default _default;
