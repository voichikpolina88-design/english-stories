import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const moduleCache = new Map();
const expectedEnglishHash = "2e9ccd2fe2b6c8d923dc37d286d5b83249a84f9e982aec46d016cf423ab443ca";
const invalidTranslations = new Set([
  "",
  "перевод по контексту",
  "translation",
  "undefined",
  "null",
  "нет перевода",
  "перевод отсутствует",
]);

function resolveModule(filePath) {
  const candidates = [filePath, `${filePath}.ts`, `${filePath}.tsx`, path.join(filePath, "index.ts")];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) throw new Error(`Cannot resolve ${filePath}`);
  return resolved;
}

function loadTypeScriptModule(filePath) {
  const resolvedPath = resolveModule(path.resolve(root, filePath));
  const cached = moduleCache.get(resolvedPath);
  if (cached) return cached.exports;

  const source = fs.readFileSync(resolvedPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: resolvedPath,
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(resolvedPath, module);

  const localRequire = (request) =>
    request.startsWith(".")
      ? loadTypeScriptModule(path.resolve(path.dirname(resolvedPath), request))
      : require(request);

  const wrapper = vm.runInThisContext(`(function (require, module, exports) { ${compiled}\n})`, {
    filename: resolvedPath,
  });
  wrapper(localRequire, module, module.exports);
  return module.exports;
}

function hasValidTranslation(value, normalizedWord) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) && !invalidTranslations.has(normalized) && normalized !== normalizedWord.toLowerCase();
}

const { aliceInWonderlandBook } = loadTypeScriptModule("src/data/aliceInWonderland.ts");
const { aliceChaptersOneToFourLexicon } = loadTypeScriptModule(
  "src/data/books/aliceChaptersOneToFourLexicon.ts",
);
const chapters = aliceInWonderlandBook.chapters.slice(0, 4);
const englishText = chapters
  .flatMap((chapter) => chapter.paragraphs)
  .flatMap((paragraph) => paragraph.sentences)
  .map((sentence) => sentence.text)
  .join("\n") + "\n";
const englishHash = crypto.createHash("sha256").update(englishText).digest("hex");
const failures = [];
const seenWordIds = new Set();
const coverage = [];

for (const [surface, lexical] of Object.entries(aliceChaptersOneToFourLexicon)) {
  if (!lexical.lemma || !lexical.translation || !lexical.partOfSpeech || !lexical.transcription) {
    failures.push(`Incomplete lexical supplement: ${surface}`);
  }
  if (!hasValidTranslation(lexical.translation, surface)) {
    failures.push(`Invalid lexical supplement translation: ${surface}`);
  }
  if (!/^\/.+\/$/.test(lexical.transcription)) {
    failures.push(`Invalid IPA format: ${surface} -> ${lexical.transcription}`);
  }
}

for (const chapter of chapters) {
  let total = 0;
  let translated = 0;
  const untranslatedForms = new Set();

  for (const paragraph of chapter.paragraphs) {
    for (const sentence of paragraph.sentences) {
      if (sentence.translation.includes("_")) {
        failures.push(`Technical underscore in ${sentence.id}`);
      }

      for (const word of sentence.words ?? []) {
        if (word.isPunctuation) continue;
        total += 1;

        if (seenWordIds.has(word.id)) failures.push(`Duplicate wordId: ${word.id}`);
        seenWordIds.add(word.id);

        const translations = [word.translation, word.contextualTranslation, ...(word.commonTranslations ?? [])];
        if (translations.some((value) => hasValidTranslation(value, word.normalized))) {
          translated += 1;
        } else {
          untranslatedForms.add(word.normalized);
        }

        if (aliceChaptersOneToFourLexicon[word.normalized]) {
          if (!word.lemma || !word.partOfSpeech || !word.transcription || !word.lexicalEntryId) {
            failures.push(`Supplement metadata did not reach ${word.id}`);
          }
        }
      }
    }
  }

  coverage.push({
    chapter: chapter.number,
    total,
    translated,
    untranslated: total - translated,
    uniqueUntranslated: untranslatedForms.size,
  });
}

if (englishHash !== expectedEnglishHash) {
  failures.push(`English text hash changed: ${englishHash}`);
}

console.log("Глава | Всего кликабельных вхождений | Переведено | Непереведено | Уникальных форм без перевода");
for (const row of coverage) {
  console.log(
    `${row.chapter} | ${row.total} | ${row.translated} | ${row.untranslated} | ${row.uniqueUntranslated}`,
  );
}
console.log(`\nЛексических дополнений: ${Object.keys(aliceChaptersOneToFourLexicon).length}`);
console.log(`SHA-256 английского текста: ${englishHash}`);

if (failures.length > 0) {
  console.error(`\nПроверка не пройдена (${failures.length}):`);
  failures.slice(0, 50).forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Проверка пройдена: пропусков, заглушек, дублей wordId и изменений английского текста нет.");
}
