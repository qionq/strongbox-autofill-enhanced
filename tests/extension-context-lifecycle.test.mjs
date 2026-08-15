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

const {
  hasActiveExtensionContext,
  isExtensionContextInvalidatedError,
  runWithExtensionContext,
} = loadTypeScriptModule('../src/Content/ExtensionContextLifecycle.ts');

test('recognises invalidated extension contexts and unavailable runtime IDs', () => {
  const message = 'Extension context invalidated.';

  assert.equal(isExtensionContextInvalidatedError(new Error(message)), true);
  assert.equal(isExtensionContextInvalidatedError(message), true);
  assert.equal(isExtensionContextInvalidatedError({ message }), true);
  assert.equal(isExtensionContextInvalidatedError(new Error('Native host disconnected')), false);
  assert.equal(hasActiveExtensionContext(() => 'extension-id'), true);
  assert.equal(hasActiveExtensionContext(() => undefined), false);
  assert.equal(
    hasActiveExtensionContext(() => {
      throw new Error(message);
    }),
    false
  );
});

test('stops work and returns a fallback when the context is already invalid', async () => {
  let operationCalled = false;
  let invalidatedCount = 0;

  const result = await runWithExtensionContext(
    () => undefined,
    async () => {
      operationCalled = true;
      return 'result';
    },
    () => {
      invalidatedCount += 1;
    },
    'fallback'
  );

  assert.equal(result, 'fallback');
  assert.equal(operationCalled, false);
  assert.equal(invalidatedCount, 1);
});

test('converts invalidation during work to a fallback but preserves unrelated errors', async () => {
  let invalidatedCount = 0;

  const invalidatedResult = await runWithExtensionContext(
    () => 'extension-id',
    async () => {
      throw new Error('Extension context invalidated.');
    },
    () => {
      invalidatedCount += 1;
    },
    'fallback'
  );

  assert.equal(invalidatedResult, 'fallback');
  assert.equal(invalidatedCount, 1);

  await assert.rejects(
    runWithExtensionContext(
      () => 'extension-id',
      async () => {
        throw new Error('Unexpected failure');
      },
      () => undefined,
      'fallback'
    ),
    /Unexpected failure/
  );
});
