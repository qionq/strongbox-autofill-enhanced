import * as OTPAuth from 'otpauth';

export interface AutoFillCredentialCustomField {
  key: string;
  value: string;
  concealable: boolean;
}

export type AutoFillCredentialCustomFields = AutoFillCredentialCustomField[] | { [key: string]: AutoFillCredentialCustomField };

export class AutoFillCredential {
  databaseId = '';
  uuid = '';
  title = '';
  username = '';
  password = '';
  url = '';
  totp = '';
  icon = '';
  customFields: AutoFillCredentialCustomFields = [];
  databaseName = 'Foo';
  tags: string[] = [];
  favourite = false;
  notes: string;
  modified: string;

  static getCustomFields(credential: AutoFillCredential): AutoFillCredentialCustomField[] {
    const fields = Array.isArray(credential.customFields) ? credential.customFields : Object.values(credential.customFields ?? {});

    return fields.filter(field => Boolean(field?.key));
  }

  static getCustomField(credential: AutoFillCredential, key: string): AutoFillCredentialCustomField | undefined {
    return AutoFillCredential.getCustomFields(credential).find(field => field.key === key);
  }

  static getCurrentTotpCode(credential: AutoFillCredential, formatted = true): string {
    if (credential.totp.length > 0) {
      try {
        const parsedTotp = OTPAuth.URI.parse(credential.totp);
        const code = parsedTotp.generate();

        if (code.length > 0 && formatted) {
          const middle = Math.floor(code.length / 2);
          if (middle > 0) {
            return code.substring(0, middle) + '-' + code.substring(middle);
          } else {
            return code;
          }
        } else {
          return code;
        }
      } catch (error) {
        // Invalid or unsupported OTP URIs simply have no current code.
      }
    }

    return '';
  }
}
