interface ComposableStudioProject {
  name: string;
  description?: string;
  canvasUrl?: string;
  connectedStackApiKey?: string;
  contentTypeUid: string;
  organizationUid?: string;
  settings: {
    configuration: {
      environment: string;
      locale: string;
    };
  };
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: boolean;
  createdAt?: string;
  updatedAt?: string;
  uid: string;
  // For audit reporting
  missingContentType?: boolean;
  missingEnvironment?: boolean;
  missingLocale?: boolean;
  fixStatus?: string;
}

export { ComposableStudioProject };
