'use strict';
// The normalizer follows the official response type; matching tasks retain order.
const QuizCore = (() => {
 function normalizeText(value) { return String(value ?? '').normalize('NFC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[\s\u0301]/g,'').trim(); }
 function normalizeDigits(value) { const compact = String(value ?? '').replace(/[\s,;]/g,''); return /^\d+$/.test(compact) ? compact : null; }
 function sentenceSets(value, range) {
  const raw=String(value ?? '').trim();
  if (!/^[\d\s,;]+$/.test(raw)) return [];
  const [min,max]=range || [1,99];
  const tokens=raw.split(/[\s,;]+/).filter(Boolean);
  const canonical=parts=>[...parts].sort((a,b)=>a-b).join(',');
  if(tokens.length>1) { const nums=tokens.map(Number); return nums.every(n=>n>=min && n<=max) && new Set(nums).size===nums.length ? [canonical(nums)] : []; }
  const compact=tokens[0] || '';if(compact.length>20) return [];
  const results=[];
  function visit(at, parts) {
   if(results.length>1000) return;
   if(at===compact.length) {results.push(canonical(parts));return;}
   for(let size=1;size<=String(max).length && at+size<=compact.length;size++) {
    const token=compact.slice(at,at+size);if(token[0]==='0')continue;
    const n=Number(token);if(n>=min && n<=max && !parts.includes(n))visit(at+size,[...parts,n]);
   }
  }
  visit(0,[]);return results;
 }
 function checkAnswer(question, value) {
  if (question.answerMode === 'essay') return null;
  if (question.answerMode === 'number-list') { const actual=sentenceSets(value,question.sentenceRange); return actual.length>0 && question.answers.some(a=>sentenceSets(a,question.sentenceRange).some(expected=>actual.includes(expected))); }
  if (question.answerMode === 'set' || question.answerMode === 'ordered') {
   const actual = normalizeDigits(value); if (!actual) return false;
   if (question.answerMode === 'ordered') return question.answers.some(a=>normalizeDigits(a)===actual);
   // Duplicate choices are invalid; sorting must not erase a repeated answer.
   if (new Set(actual).size !== actual.length) return false;
   return question.answers.some(a=>[...a].sort().join('') === [...actual].sort().join(''));
  }
  const actual = normalizeText(value); return !!actual && question.answers.some(a=>normalizeText(a) === actual);
 }
 function analyzeAnswer(question, value) {
  const correct=checkAnswer(question,value), accepted=question.answers[0] || '';
  if(correct===true) return {correct:true,summary:'Ответ совпадает с допустимым вариантом.',missing:[],extra:[],positions:[]};
  if(question.answerMode==='essay') return {correct:null,summary:'Сочинение проверяется по критериям, а не по короткому ключу.',missing:[],extra:[],positions:[]};
  if(question.kind==='wordlist-drill') return {correct:false,summary:question.task===4?'Нужно указать номер слога с ударной гласной, а не номер буквы или само слово.':'Нужно восстановить указанную букву и записать полное нормативное слово. Сравни написание по буквам в разборе.',missing:[],extra:[],positions:[]};
  if(question.answerMode==='ordered') {
   const input=normalizeDigits(value);
   if(!input) return {correct:false,summary:'В ответе должны быть только номера соответствий. Можно разделять их пробелами или запятыми.',missing:[],extra:[],positions:[]};
   const positions=[...accepted].flatMap((expected,i)=>input[i]===expected?[]:[{position:i+1,label:'АБВГДЕЖЗИК'[i] || String(i+1),actual:input[i] || 'нет ответа',expected}]);
   return {correct:false,summary:input.length!==accepted.length?`Нужно ${accepted.length} цифр в порядке букв из условия; введено ${input.length}.`:'Есть ошибки в соответствиях. Даже правильные цифры в другом порядке означают другой ответ.',positions,missing:[],extra:[]};
  }
  if(question.answerMode==='set' || question.answerMode==='number-list') {
   const input=normalizeDigits(value);
   if(!input) return {correct:false,summary:'Запиши номера ответов цифрами, без слов. Допустимы пробелы, запятые и точка с запятой.',missing:[],extra:[],positions:[]};
   let actualSets, expectedSets;
   if(question.answerMode==='number-list') {
    actualSets=sentenceSets(value,question.sentenceRange).map(x=>x.split(','));expectedSets=question.answers.flatMap(a=>sentenceSets(a,question.sentenceRange).map(x=>x.split(',')));
    if(!actualSets.length) return {correct:false,summary:`Проверь номера предложений: в условии указан диапазон ${question.sentenceRange[0]}–${question.sentenceRange[1]}. Один номер нельзя записывать несколько раз.`,missing:[],extra:[],positions:[]};
   } else {
    if(new Set(input).size!==input.length)return {correct:false,summary:'Номер варианта повторяется. Каждый выбранный номер записывают только один раз.',missing:[],extra:[],positions:[]};
    actualSets=[[...input]];expectedSets=question.answers.map(a=>[...a]);
   }
   let best;
   for(const actual of actualSets) for(const expected of expectedSets) {
    const missing=expected.filter(n=>!actual.includes(n)),extra=actual.filter(n=>!expected.includes(n));
    if(!best || missing.length+extra.length<best.missing.length+best.extra.length)best={missing,extra};
   }
   const label=question.answerMode==='number-list'?'предложений':'вариантов';
   return {correct:false,...best,positions:[],summary:[best.missing.length?`Пропущены номера ${label}: ${best.missing.join(', ')}.`:'',best.extra.length?`Лишние номера ${label}: ${best.extra.join(', ')}.`:''].filter(Boolean).join(' ')};
  }
  const text=String(value).trim();
  const taskText=question.parts.map(p=>p.text).join(' ');
  const action=/исключив|исключённое/.test(taskText)?'Нужно выписать исключённое слово, а не оставшуюся часть предложения.':/заменив|подобрав|запишите слово правильно/i.test(taskText)?'Нужна исправленная форма слова в контексте.':'Проверь значение, грамматическую форму и требование к ответу из условия.';
  return {correct:false,summary:`Ответ «${text.slice(0,250)}» не совпадает с допустимыми ответами. ${action}`,missing:[],extra:[],positions:[]};
 }
 function countWords(value) { return (String(value).match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu) || []).length; }
 return {normalizeText,normalizeDigits,checkAnswer,analyzeAnswer,countWords};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = QuizCore;
