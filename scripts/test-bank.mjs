import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSession, isCorrect, scoreSession } from '../src/examSession.js';
const quotas = {
 clf: {'Cloud Concepts':12,'Security and Compliance':15,'Cloud Technology and Services':17,'Billing, Pricing, and Support':6},
 saa: {'Design Secure Architectures':15,'Design Resilient Architectures':13,'Design High-Performing Architectures':12,'Design Cost-Optimized Architectures':10},
};
for (const id of ['clf','saa']) {
 const questions=JSON.parse(fs.readFileSync(new URL(`../src/data/${id}-reviewed.json`,import.meta.url),'utf8'));
 const source=JSON.parse(fs.readFileSync(new URL(`../src/data/${id}-imported.json`,import.meta.url),'utf8'));
 const expected=id==='clf'?229:882;
 assert.equal(questions.length,expected); assert.equal(new Set(questions.map(q=>q.id)).size,expected);
 for (const [index,q] of questions.entries()) {
  assert.equal(q.validation.sourceQuestion,index+1); assert.equal(q.id,source[index].id);
  assert.ok(q.validation.sourcePage>=1); assert.ok(q.validation.sourceFile.endsWith('.pdf'));
  assert.ok(q.prompt.length>20);
  if(q.validation.status==='reviewed') {
   assert.ok(q.choices.length>=4); assert.ok(q.answers.length>0);
   assert.equal(new Set(q.choices.map(c=>c.id)).size,q.choices.length);
   assert.ok(q.answers.every(a=>q.choices.some(c=>c.id===a)));
   assert.ok(q.choices.every(c=>c.text.trim().length>0));
   assert.ok(!JSON.stringify(q).includes('\\u0000'));
   assert.ok(q.explanation); assert.ok(q.validation.references.length);
  } else { assert.equal(q.answers.length,0); assert.ok(q.validation.holdReason); }
 }
 const exam={questions,examLength:65,unscoredQuestions:15,scoredDomains:quotas[id]};
 const seen=new Set();
 for(let run=0;run<100;run++) {
  const full=createSession(exam,'full');
  assert.equal(full.questions.length,65); assert.equal(full.unscoredIds.size,15);
  assert.equal(new Set(full.questions.map(q=>q.id)).size,65);
  assert.ok(full.questions.every(q=>q.validation.status==='reviewed'));
  const scored=full.questions.filter(q=>!full.unscoredIds.has(q.id));
  for(const [domain,count] of Object.entries(quotas[id])) assert.equal(scored.filter(q=>q.domain===domain).length,count);
  const responses=Object.fromEntries(full.questions.map(q=>[q.id,q.answers]));
  assert.equal(scoreSession(full.questions,responses,full.unscoredIds),50);
  for(const key of full.unscoredIds) responses[key]=[];
  assert.equal(scoreSession(full.questions,responses,full.unscoredIds),50);
  assert.equal(scoreSession(full.questions,{},full.unscoredIds),0);
  full.questions.forEach(q=>seen.add(q.id));
 }
 assert.ok(seen.size>65,'Repeated mocks must draw from the larger PDF bank');
 for(const count of [10,15,30,40,50]) {
  const custom=createSession(exam,'custom',count); assert.equal(custom.questions.length,count);
  assert.equal(new Set(custom.questions.map(q=>q.id)).size,count);assert.equal(custom.unscoredIds.size,0);
 }
 assert.throws(()=>createSession(exam,'custom',10000));
 console.log(`${id}: ${expected} source questions preserved; 100 full mocks, domain quotas, all custom sizes, flagged exclusion, and scoring passed`);
}
assert.equal(isCorrect({answers:['a','c']},['a']),false);
assert.equal(isCorrect({answers:['a','c']},['c','a']),true);
assert.equal(isCorrect({answers:['a','c']},['a','b','c']),false);
assert.equal(isCorrect({answers:['a']},[]),false);
console.log('Exact-match multi-response and unanswered-question scoring passed');
