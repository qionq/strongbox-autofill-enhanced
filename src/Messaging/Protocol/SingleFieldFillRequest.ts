export interface CustomFieldReference {
  databaseId: string;
  credentialUuid: string;
  fieldKey: string;
}

export interface SingleFieldFillRequest {
  text: string;
  appendValue?: boolean;
  oneTimeCode?: boolean;
  customField?: CustomFieldReference;
}

export type SingleFieldFillHandler = (request: SingleFieldFillRequest) => void | Promise<void>;
