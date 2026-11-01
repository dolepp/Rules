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
 function countWords(value) { return (String(value).match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu) || []).length; }
 return {normalizeText,normalizeDigits,checkAnswer,countWords};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = QuizCore;
