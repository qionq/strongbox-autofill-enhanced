import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const languagesDirectory = path.join(repositoryRoot, 'src/Localization/Languages');

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

function flatten(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, fullKey, output);
    } else {
      output[fullKey] = child;
    }
  }

  return output;
}

function placeholders(value) {
  return [...String(value).matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].map(match => match[1]).sort();
}

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

const localeFiles = readdirSync(languagesDirectory).filter(file => file.endsWith('.json')).sort();
const locales = Object.fromEntries(
  localeFiles.map(file => [file.replace(/\.json$/, ''), flatten(JSON.parse(readFileSync(path.join(languagesDirectory, file), 'utf8')))])
);
const english = locales.en;

test('all bundled locales cover the English key set with matching placeholders', () => {
  const expectedKeys = Object.keys(english).sort();

  for (const [locale, entries] of Object.entries(locales)) {
    assert.deepEqual(Object.keys(entries).sort(), expectedKeys, `${locale} must contain the same translation keys as English`);

    for (const key of expectedKeys) {
      assert.deepEqual(placeholders(entries[key]), placeholders(english[key]), `${locale}:${key} must preserve interpolation placeholders`);
    }
  }
});

test('language selection is English-first and respects supported browser locales', () => {
  const { defaultLanguage, resolveSupportedLanguage } = loadTypeScriptModule('../src/Localization/LanguageSelection.ts');
  const supported = Object.keys(locales);

  assert.equal(defaultLanguage, 'en');
  assert.equal(resolveSupportedLanguage('ja-JP', supported), 'ja');
  assert.equal(resolveSupportedLanguage('fr-CA', supported), 'fr');
  assert.equal(resolveSupportedLanguage('pt-BR', supported), 'pt-BR');
  assert.equal(resolveSupportedLanguage('xx-ZZ', supported), 'en');
});

test('visible UI copy is not hard-coded in Japanese source strings', () => {
  const allowedDetectionFiles = new Set(['LoginIdentifierDetector.ts', 'PageAnalyser.ts']);
  const offenders = listSourceFiles(path.join(repositoryRoot, 'src')).filter(file => {
    if (allowedDetectionFiles.has(path.basename(file))) return false;
    return /[ぁ-んァ-ヶ一-龠々]/u.test(readFileSync(file, 'utf8'));
  });

  assert.deepEqual(offenders, []);
});
