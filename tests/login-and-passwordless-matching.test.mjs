import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function loadTypeScriptModule(relativeUrl) {
  const filename = fileURLToPath(new URL(relativeUrl, import.meta.url));
  const source = readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };

  Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}

const { isLoginIdentifier } = loadTypeScriptModule('../src/Content/LoginIdentifierDetector.ts');
const {
  getCredentialSearchQueryForUrl,
  getPasswordlessUrlMatches,
  mergeUniqueCredentials,
} = loadTypeScriptModule('../src/Messaging/PasswordlessUrlCredentialMatcher.ts');
const { selectAutomaticFillCredential } = loadTypeScriptModule('../src/Background/AutomaticFillPolicy.ts');

const identifierDefaults = {
  type: 'text',
  autocompleteTokens: ['on'],
  metadata: '',
  contextMetadata: '',
  disabled: false,
  readOnly: false,
  isSearch: false,
  isOneTimeCode: false,
};

test('recognises Paidy-style phone sign-in fields without accepting generic telephone fields', () => {
  assert.equal(
    isLoginIdentifier({
      ...identifierDefaults,
      type: 'tel',
      metadata: 'signin phone field tel 09000000000',
    }),
    true
  );

  assert.equal(
    isLoginIdentifier({
      ...identifierDefaults,
      type: 'tel',
      metadata: 'phone number tel',
      contextMetadata: 'billing shipping checkout',
      autocompleteTokens: ['shipping', 'tel'],
    }),
    false
  );
});

test('uses login context for otherwise generic mobile-number identifiers', () => {
  assert.equal(
    isLoginIdentifier({
      ...identifierDefaults,
      type: 'tel',
      metadata: 'mobile number',
      contextMetadata: 'log in to your account',
    }),
    true
  );

  assert.equal(isLoginIdentifier({ ...identifierDefaults, metadata: 'username', isOneTimeCode: true }), false);
});

test('restores blank-password credentials only for the exact page host', () => {
  const candidates = [
    {
      databaseId: 'db',
      uuid: 'primary',
      password: '',
      url: 'https://my.paidy.com/',
      customFields: [],
    },
    {
      databaseId: 'db',
      uuid: 'normal-password',
      password: 'secret',
      url: 'https://my.paidy.com/',
      customFields: [],
    },
    {
      databaseId: 'db',
      uuid: 'lookalike',
      password: '',
      url: 'https://my.paidy.com.evil.example/',
      customFields: [],
    },
    {
      databaseId: 'db',
      uuid: 'alternative',
      password: '',
      url: 'https://example.net/',
      customFields: [{ key: 'URL-2', value: 'my.paidy.com' }],
    },
  ];

  assert.equal(getCredentialSearchQueryForUrl('https://my.paidy.com/'), 'my.paidy.com');
  assert.deepEqual(
    getPasswordlessUrlMatches('https://my.paidy.com/', candidates).map(candidate => candidate.uuid),
    ['primary', 'alternative']
  );
});

test('merges fallback credentials without duplicating database and entry IDs', () => {
  const primary = [{ databaseId: 'db-a', uuid: 'same' }];
  const fallback = [
    { databaseId: 'db-a', uuid: 'same' },
    { databaseId: 'db-b', uuid: 'same' },
  ];

  assert.deepEqual(mergeUniqueCredentials(primary, fallback), [primary[0], fallback[1]]);
});

test('always-first and single-match automatic-fill settings select independently', () => {
  const credentials = [{ uuid: 'first' }, { uuid: 'second' }];

  assert.equal(
    selectAutomaticFillCredential(credentials, {
      autoFillImmediatelyIfOnlyASingleMatch: false,
      autoFillImmediatelyWithFirstMatch: true,
    }),
    credentials[0]
  );
  assert.equal(
    selectAutomaticFillCredential(credentials, {
      autoFillImmediatelyIfOnlyASingleMatch: true,
      autoFillImmediatelyWithFirstMatch: false,
    }),
    null
  );
  assert.equal(
    selectAutomaticFillCredential([credentials[0]], {
      autoFillImmediatelyIfOnlyASingleMatch: true,
      autoFillImmediatelyWithFirstMatch: false,
    }),
    credentials[0]
  );
});
