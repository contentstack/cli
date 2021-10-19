export default class ExtensionsImport {
  private context: any;
  private stackAPIClient: any;
  private importConfig: any;

  constructor(context, stackAPIClient, importConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.importConfig = importConfig;
  }

  async start() {
    try {
    } catch (error) {}
  }
}
