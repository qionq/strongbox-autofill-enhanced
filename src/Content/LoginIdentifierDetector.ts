export interface LoginIdentifierSignals {
  type: string;
  autocompleteTokens: string[];
  metadata: string;
  contextMetadata: string;
  disabled: boolean;
  readOnly: boolean;
  isSearch: boolean;
  isOneTimeCode: boolean;
}

const identityHints = [
  'user',
  'user name',
  'username',
  'email',
  'e mail',
  'customer',
  'login',
  'log in',
  'signin',
  'sign in',
  'account',
  'acct',
  'client number',
  'clientnumber',
  'identifier',
  'member id',
  'benutzer',
  'alias',
  'epost',
  'ユーザー',
  'メール',
  'ログイン',
  'アカウント',
  '会員番号',
];

const explicitLoginHints = [
  'login',
  'log in',
  'signin',
  'sign in',
  'authenticate',
  'authentication',
  'ログイン',
  'サインイン',
  '本人確認',
];

const phoneHints = [
  'phone',
  'phone number',
  'mobile',
  'mobile number',
  'telephone',
  'msisdn',
  'cell number',
  '電話',
  '電話番号',
  '携帯',
  '携帯番号',
];

const nonLoginPhoneContextHints = [
  'billing',
  'checkout',
  'delivery',
  'register',
  'shipping',
  'sign up',
  'signup',
  '配送',
  '請求',
  '新規登録',
];

function includesHint(value: string, hints: string[]): boolean {
  const compactValue = value.replace(/\s+/g, '');

  return hints.some(hint => value.includes(hint) || compactValue.includes(hint.replace(/\s+/g, '')));
}

/**
 * Classifies fields that identify a login account, including phone-number
 * sign-in forms, without treating every telephone field as a credential field.
 */
export function isLoginIdentifier(signals: LoginIdentifierSignals): boolean {
  if (
    signals.disabled ||
    signals.readOnly ||
    signals.isSearch ||
    signals.isOneTimeCode ||
    !['email', 'text', 'username', 'tel'].includes(signals.type)
  ) {
    return false;
  }

  if (signals.type === 'email' || signals.autocompleteTokens.some(token => token === 'username' || token === 'email')) {
    return true;
  }

  if (includesHint(signals.metadata, identityHints)) {
    return true;
  }

  const hasPhoneSemantics =
    signals.type === 'tel' ||
    signals.autocompleteTokens.some(token => token === 'tel' || token.startsWith('tel-')) ||
    includesHint(signals.metadata, phoneHints);

  if (!hasPhoneSemantics) {
    return false;
  }

  if (includesHint(signals.metadata, explicitLoginHints)) {
    return true;
  }

  const hasNonLoginPurpose =
    signals.autocompleteTokens.some(token => token === 'billing' || token === 'shipping') ||
    includesHint(signals.contextMetadata, nonLoginPhoneContextHints);

  return !hasNonLoginPurpose && includesHint(signals.contextMetadata, explicitLoginHints);
}
