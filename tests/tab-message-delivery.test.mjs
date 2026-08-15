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
      target: ts.ScriptTarget.ES2020
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };

  Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}

const { deliverTabMessage, isMissingTabReceiverError } = loadTypeScriptModule('../src/Background/TabMessageDelivery.ts');

test('recognises Chrome missing-receiver errors in common wrapper shapes', () => {
  const message = 'Could not establish connection. Receiving end does not exist.';

  assert.equal(isMissingTabReceiverError(new Error(message)), true);
  assert.equal(isMissingTabReceiverError(message), true);
  assert.equal(isMissingTabReceiverError({ message }), true);
  assert.equal(isMissingTabReceiverError(new Error('Native host disconnected')), false);
});

test('returns false instead of rejecting when a tab has no content-script receiver', async () => {
  const delivered = await deliverTabMessage(
    async () => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    },
    42,
    { openInlineMenu: true }
  );

  assert.equal(delivered, false);
});

test('reports successful delivery and preserves unexpected errors', async () => {
  assert.equal(await deliverTabMessage(async () => undefined, 42, { restoreFocus: true }), true);

  await assert.rejects(
    deliverTabMessage(
      async () => {
        throw new Error('Unexpected transport failure');
      },
      42,
      { restoreFocus: true }
    ),
    /Unexpected transport failure/
  );
});

test('targets the child frame that announced its input fields', async () => {
  let received;

  const delivered = await deliverTabMessage(
    async (tabId, message, options) => {
      received = { tabId, message, options };
    },
    42,
    { credential: { uuid: 'apple-login' }, onLoadFill: true },
    7
  );

  assert.equal(delivered, true);
  assert.deepEqual(received, {
    tabId: 42,
    message: { credential: { uuid: 'apple-login' }, onLoadFill: true },
    options: { frameId: 7 },
  });
});
