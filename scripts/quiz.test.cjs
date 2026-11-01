const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {checkAnswer,analyzeAnswer,countWords} = require('../quiz-core.js');
const bank = JSON.parse(fs.readFileSync('data/practice.json','utf8'));
assert.ok(bank.questions.length >= 500);
const ids = new Set();
for (const q of bank.questions) {
 assert.ok(!ids.has(q.id));ids.add(q.id);
 assert.ok(Number.isInteger(q.task) && q.task>=1 && q.task<=27);
 if(q.kind==='wordlist-drill') assert.equal(q.originalTask,null); else assert.ok(Number.isInteger(q.originalTask) && q.originalTask>=1 && q.originalTask<=27);
 assert.ok(q.parts.length>0 && q.parts.every(p=>p.text && Number.isInteger(p.page)));
 assert.ok(bank.sources.some(s=>s.id===q.sourceId && s.year===q.year));
 assert.ok(q.solution && q.solution.steps.length>=2 && q.solution.summary);
 assert.equal(q.solution.authorship,'site');
 const lessons=JSON.parse(fs.readFileSync('data/lessons.json','utf8'));
 for(const r of q.solution.ruleRefs) assert.ok(lessons.find(l=>l.id===r.lesson)?.sections[r.section]);
 assert.ok(Number.isInteger(q.answerPage) && q.answerPage>0);
 for (const p of [...q.parts,...q.context]) {if(p.image) { assert.ok(p.image.startsWith('assets/practice/') && !p.image.includes('..'));assert.ok(fs.statSync(p.image).size>100); } else assert.equal(q.kind,'wordlist-drill');}
 if (q.answerMode==='essay') {assert.equal(q.task,27);assert.equal(checkAnswer(q,'текст'),null);assert.equal(q.answers.length,0);}
 else {
  assert.ok(q.answers.length>0);
  for (const a of q.answers) assert.equal(checkAnswer(q,a),true,`Official key rejected: ${q.id} ${a}`);
  assert.equal(analyzeAnswer(q,q.answers[0]).correct,true);
  const diagnosis=analyzeAnswer(q,'999');assert.equal(diagnosis.correct,checkAnswer(q,'999'));assert.ok(diagnosis.summary);
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
console.log(`OK: ${bank.questions.length} exercises with FIPI sources, 27 topics, source files, all official answer alternatives, ordered matching, unordered choices, duplicate rejection, text normalization, essay mode.`);

assert.deepEqual(analyzeAnswer({answerMode:'set',answers:['135']},'123').missing,['5']);
assert.deepEqual(analyzeAnswer({answerMode:'set',answers:['135']},'123').extra,['2']);
assert.equal(analyzeAnswer({answerMode:'ordered',answers:['73148']},'74138').positions[0].label,'Б');
assert.equal(analyzeAnswer({answerMode:'number-list',answers:['1011'],sentenceRange:[7,14]},'11').missing[0],'10');
for(const q of bank.questions.filter(q=>q.year===2020 && [10,17,20].includes(q.task))) {
 assert.equal(q.answerMode,'set');assert.equal(checkAnswer(q,[...q.answers[0]].reverse().join('')),true);
 assert.equal(checkAnswer(q,'любая другая последовательность этих цифр'),false);
}
assert.equal(bank.questions.find(q=>q.id==='fipi-demo-2022-1-1').task,3);
assert.equal(bank.questions.find(q=>q.id==='fipi-demo-2022-2-1').task,1);
assert.equal(bank.questions.find(q=>q.id==='fipi-demo-2022-3-1').task,2);
assert.ok(bank.questions.filter(q=>q.kind==='wordlist-drill').length>=300);
console.log('OK: per-question explanations and rule references; personalized error diagnostics; 300 wordlist drills; legacy numbering and answer notes.');
