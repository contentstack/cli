export interface Token {
  token: string;
  apiKey: string;
}

export interface Organization {
  uid: string,
  name: string,
}

export interface selectedOrganization {
  orgUid: string,
  orgName: string,
}

export interface Stack {
  name: string,
  api_key: string,
}

export interface ContentType {
  uid: string,
  title: string,
}

export interface Environment {
  name: string,
  uid: string,
}

export interface Entry {
  uid: string,
  title: string,
}

export interface Locale {
  name: string;
  code: string;
}