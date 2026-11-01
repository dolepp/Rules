import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root = process.cwd();
const read = n => JSON.parse(fs.readFileSync(path.join(root, `data/${n}.json`), 'utf8'));
const lessons = read('lessons'), materials = read('materials'), sources = read('sources');
assert.equal(lessons.length, 27);
assert.deepEqual(lessons.map(l => l.id), Array.from({length:27},(_,i)=>i+1));
assert.equal(new Set(sources.map(s=>s.id)).size, sources.length);
for (const s of sources) {
 const url = new URL(s.url);
 assert.ok(url.protocol === 'https:' && ['fipi.ru','doc.fipi.ru'].includes(url.hostname), `Неофициальный источник: ${s.url}`);
}
for (const l of lessons) {
 assert.ok(l.title && l.summary && l.group && l.sections.length >= 3 && l.steps.length >= 3);
 assert.ok(l.quiz.question && l.quiz.answer && l.quiz.explanation);
 assert.ok(l.sources.length >= 2);
 for (const id of l.sources) assert.ok(sources.some(s=>s.id===id), `Источник ${id} не найден`);
 for (const section of l.sections) assert.ok(section.title && section.body.length >= 50);
}
assert.equal(materials.length, 63);
assert.equal(new Set(materials.map(m=>m.id)).size, materials.length);
for (const m of materials) {
 assert.ok(m.path.startsWith('assets/materials/') && !m.path.includes('..'));
 assert.equal(new URL(m.source).hostname, 'cloud.mail.ru');
 const bytes = fs.readFileSync(path.join(root, m.path));
 assert.equal(bytes.length, m.size, `Размер ${m.name}`);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),m.sha256,`Контрольная сумма ${m.name}`);
 for (const n of m.tasks) assert.ok(lessons.some(l=>l.id===n));
 if (m.type === 'docx') assert.equal(typeof JSON.parse(fs.readFileSync(`data/documents/${m.id}.json`)).text, 'string');
}
for (const name of ['index.html','app.js','styles.css','assets/favicon.svg']) assert.ok(fs.statSync(name).size > 0);
const html = fs.readFileSync('index.html','utf8');
for (const [,file] of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) if (!file.startsWith('https:')) assert.ok(fs.existsSync(file),`Ссылка ${file} не найдена`);
console.log(`OK: 27 заданий, ${lessons.reduce((n,l)=>n+l.sections.length,0)} разделов правил, ${sources.length} официальных источников, 63 файла; все контрольные суммы совпали.`);
