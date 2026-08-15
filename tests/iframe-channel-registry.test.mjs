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

const { IframeChannelRegistry } = loadTypeScriptModule('../src/Background/IframeChannelRegistry.ts');

test('accepts only strong random tokens registered by web content scripts', () => {
  const validSender = { tab: { id: 11 }, url: 'https://example.test/login' };

  assert.equal(IframeChannelRegistry.register('short', validSender), false);
  assert.equal(IframeChannelRegistry.register('a'.repeat(64), { ...validSender, url: 'chrome-extension://example/iframe.html' }), false);
  assert.equal(IframeChannelRegistry.register('b'.repeat(64), validSender), true);
});

test('a channel can be claimed once and only by its registered tab', () => {
  const wrongTabToken = 'c'.repeat(64);
  assert.equal(IframeChannelRegistry.register(wrongTabToken, { tab: { id: 21 }, url: 'https://example.test/' }), true);
  assert.equal(IframeChannelRegistry.claim(wrongTabToken, { tab: { id: 22 } }), false);
  assert.equal(IframeChannelRegistry.claim(wrongTabToken, { tab: { id: 21 } }), false);

  const validToken = 'd'.repeat(64);
  assert.equal(IframeChannelRegistry.register(validToken, { tab: { id: 21 }, url: 'https://example.test/' }), true);
  assert.equal(IframeChannelRegistry.claim(validToken, { tab: { id: 21 } }), true);
  assert.equal(IframeChannelRegistry.claim(validToken, { tab: { id: 21 } }), false);
});
