const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {checkAnswer,countWords} = require('../quiz-core.js');
const bank = JSON.parse(fs.readFileSync('data/practice.json','utf8'));
assert.ok(bank.questions.length >= 200);
const ids = new Set();
for (const q of bank.questions) {
 assert.ok(!ids.has(q.id));ids.add(q.id);
 assert.ok(Number.isInteger(q.task) && q.task>=1 && q.task<=27);
 assert.ok(Number.isInteger(q.originalTask) && q.originalTask>=1 && q.originalTask<=27);
 assert.ok(q.parts.length>0 && q.parts.every(p=>p.text && Number.isInteger(p.page)));
 assert.ok(bank.sources.some(s=>s.id===q.sourceId && s.year===q.year));
 assert.ok(Number.isInteger(q.answerPage) && q.answerPage>0);
 for (const p of [...q.parts,...q.context]) {assert.ok(p.image.startsWith('assets/practice/') && !p.image.includes('..'));assert.ok(fs.statSync(p.image).size>100);}
 if (q.answerMode==='essay') {assert.equal(q.task,27);assert.equal(checkAnswer(q,'текст'),null);assert.equal(q.answers.length,0);}
 else {
  assert.ok(q.answers.length>0);
  for (const a of q.answers) assert.equal(checkAnswer(q,a),true,`Official key rejected: ${q.id} ${a}`);
  assert.equal(checkAnswer(q,''),false);
  assert.equal(checkAnswer(q,'совсем неверный ответ'),false);
 }
}
for(let n=1;n<=27;n++) assert.ok(bank.questions.filter(q=>q.task===n).length>=5,`Not enough practice for ${n}`);
for(const s of bank.sources) { assert.equal(new URL(s.url).hostname,'doc.fipi.ru'); assert.ok(s.pdfPath.startsWith('assets/practice/') && !s.pdfPath.includes('..')); const bytes=fs.readFileSync(s.pdfPath); assert.equal(bytes.subarray(0,5).toString(),'%PDF-'); assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),s.pdfSha256); }
assert.equal(checkAnswer({answerMode:'set',answers:['135']},'5, 1, 3'),true);
assert.equal(checkAnswer({answerMode:'set',answers:['135']},'1135'),false);
assert.equal(checkAnswer({answerMode:'set',answers:['135']},'1357'),false);
assert.equal(checkAnswer({answerMode:'set',answers:['135']},'13x5'),false);
assert.equal(checkAnswer({answerMode:'set',answers:['135']},'1.3.5'),false);
assert.equal(checkAnswer({answerMode:'ordered',answers:['73148']},'8 4 1 3 7'),false);
assert.equal(checkAnswer({answerMode:'ordered',answers:['73148']},'7 3 1 4 8'),true);
assert.equal(checkAnswer({answerMode:'text',answers:['ещё бы']},' ЕЩЕ   БЫ '),true);
assert.equal(checkAnswer({answerMode:'text',answers:['одержать','усилие','усилия']},'УСИЛИЯ'),true);
assert.equal(checkAnswer({answerMode:'number-list',answers:['11'],sentenceRange:[7,14]},'11'),true);
assert.equal(checkAnswer({answerMode:'number-list',answers:['1011'],sentenceRange:[7,14]},'11, 10'),true);
assert.equal(checkAnswer({answerMode:'number-list',answers:['1011'],sentenceRange:[7,14]},'11, 11'),false);
assert.equal(checkAnswer({answerMode:'number-list',answers:['8'],sentenceRange:[7,12]},'18'),false);
assert.equal(countWords('Северо-западный ветер. Два слова.'),4);
console.log(`OK: ${bank.questions.length} official FIPI questions, 27 topics, source files, all official answer alternatives, ordered matching, unordered choices, duplicate rejection, text normalization, essay mode.`);
