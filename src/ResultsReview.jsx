import { useState } from 'react';
import { isCorrect } from './examSession.js';

function performance(rows, labels) {
  const groups = new Map();
  for (const row of rows) for (const label of labels(row.question)) {
    const group = groups.get(label) ?? { label, total: 0, correct: 0, missed: [] };
    group.total++;
    if (row.status === 'correct') group.correct++;
    else group.missed.push(row.number);
    groups.set(label, group);
  }
  return [...groups.values()].sort((a, b) => b.missed.length - a.missed.length || a.label.localeCompare(b.label));
}

export default function ResultsReview({ exam, questions, answers, unscoredIds, onBack, onPractice }) {
  const [filter, setFilter] = useState('missed');
  const [topic, setTopic] = useState(null);
  const rows = questions.map((question, index) => {
    const selected = answers[question.id] ?? [];
    return { question, number: index + 1, selected, unscored: unscoredIds.has(question.id),
      status: !selected.length ? 'unanswered' : isCorrect(question, selected) ? 'correct' : 'incorrect' };
  });
  const scored = rows.filter(row => !row.unscored);
  const correct = scored.filter(row => row.status === 'correct').length;
  const incorrect = scored.filter(row => row.status === 'incorrect').length;
  const unanswered = scored.filter(row => row.status === 'unanswered').length;
  const domains = performance(scored, q => [q.domain]);
  const services = performance(scored, q => q.services ?? []);
  const priorities = (services.some(area => area.missed.length) ? services : domains).filter(area => area.missed.length).slice(0, 3);
  const filters = [
    ['missed', 'Missed', rows.filter(r => !r.unscored && r.status !== 'correct').length],
    ['all', 'All', rows.length],
    ['correct', 'Correct', correct],
    ['unanswered', 'Unanswered', unanswered],
    ...(unscoredIds.size ? [['unscored', 'Unscored', unscoredIds.size]] : []),
  ];
  const visible = rows.filter(row => {
    const statusMatch = filter === 'all' || (filter === 'unscored' ? row.unscored : !row.unscored && (filter === 'missed' ? row.status !== 'correct' : row.status === filter));
    return statusMatch && (!topic || row.question.domain === topic || row.question.services?.includes(topic));
  });
  const label = status => ({correct:'Correct',incorrect:'Incorrect',unanswered:'Unanswered'})[status];
  const jumpToReview = area => {
    setTopic(area); setFilter('missed');
    document.getElementById('answer-review')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  return <main className="review-page">
    <p className="eyebrow">SESSION COMPLETE · {exam.code}</p>
    <h1>Your results & next steps</h1>
    <section className="review-summary" aria-label="Score summary">
      <div className="review-score"><strong>{scored.length ? Math.round(correct / scored.length * 100) : 0}%</strong><span>{correct} of {scored.length} scored questions correct</span></div>
      <dl className="review-totals"><div><dt>Correct</dt><dd>{correct}</dd></div><div><dt>Incorrect</dt><dd>{incorrect}</dd></div><div><dt>Unanswered</dt><dd>{unanswered}</dd></div></dl>
    </section>
    <p className="review-caption">{questions.length} questions in this session. {unscoredIds.size > 0 && `${unscoredIds.size} unscored questions do not affect your score or study priorities. `}Unanswered questions count as incorrect. This practice percentage is not an AWS scaled score.</p>
    <section className="study-next" aria-labelledby="study-next-heading">
      <h2 id="study-next-heading">What to focus on next</h2>
      <p>Start with these topics, then review the questions you missed. Counts include skipped questions.</p>
      {priorities.length ? <div className="study-priorities">{priorities.map((area, index) => <article key={area.label}>
        <span className="priority-number">{index + 1}</span><h3>{area.label}</h3>
        <p><b>{area.missed.length} of {area.total}</b> missed or skipped.</p>
        <p>{area.total < 3 ? 'Only a small sample—revisit the concept before drawing conclusions.' : 'Review the explanations, read the AWS references, then try another practice set.'}</p>
        <button className="review-text-button" onClick={() => jumpToReview(area.label)}>Review these questions →</button>
      </article>)}</div> : <p className="review-success">You answered every scored question correctly. Try another set to cover more topics.</p>}
      <details className="breakdown"><summary>See the full topic breakdown</summary><p>Study tags are inferred. One question may cover several services, so service totals can overlap.</p><div className="breakdown-columns">{[['Exam domains', domains],['AWS services', services]].map(([title, areas]) => <div key={title}><h3>{title}</h3>{areas.map(area => <div className="breakdown-row" key={area.label}><span>{area.label}</span><b>{area.correct}/{area.total} correct</b></div>)}</div>)}</div></details>
    </section>
    <section id="answer-review" className="answer-review" aria-labelledby="answer-review-heading">
      <h2 id="answer-review-heading">Review your answers</h2>
      <p>Open a question to compare your answer with the correct answer and read the explanation.</p>
      <div className="review-filters" aria-label="Filter answers">{filters.map(([value, title, count]) => <button key={value} aria-pressed={filter === value} onClick={() => {setFilter(value);setTopic(null);}}>{title} <span>{count}</span></button>)}</div>
      {topic && <p className="review-topic">Showing: <b>{topic}</b> <button className="review-text-button" onClick={() => setTopic(null)}>Clear topic filter ×</button></p>}
      <p className="review-caption" aria-live="polite">{visible.length} {visible.length === 1 ? 'question' : 'questions'} shown</p>
      {!visible.length && <p className="review-success">No questions in this view. Choose All to review the whole session.</p>}
      {visible.map(({ question: q, selected, number, status, unscored }) => {
        const omitted = q.answers.filter(id => !selected.includes(id));
        const extra = selected.filter(id => !q.answers.includes(id));
        const refs = q.validation?.references ?? (q.validation?.sourceUrl ? [{label:'AWS documentation',url:q.validation.sourceUrl}] : []);
        const answerList = ids => ids.length ? <ul>{q.choices.filter(c => ids.includes(c.id)).map(c => <li key={c.id}><b>{c.id.toUpperCase()}.</b> {c.text}</li>)}</ul> : <p>You did not select an answer.</p>;
        return <details className="answer-review-card" key={`${q.id}-${filter}-${topic ?? ''}`}>
          <summary><span className="review-question-number">Question {number}</span><span className={`review-status ${status}`}>{label(status)}{unscored ? ' · Unscored' : ''}</span><span className="review-question-preview">{q.prompt}</span><span className="review-open-hint">View answer & explanation</span></summary>
          <div className="review-card-body">
            <p className="review-caption">{q.domain}{q.answers.length > 1 ? ` · Select ${q.answers.length} answers` : ' · Select one answer'}</p>
            <div className="answer-comparison"><section className={`your-answer ${status}`}><h3>Your answer</h3>{answerList(selected)}</section><section className="correct-answer"><h3>Correct answer</h3>{answerList(q.answers)}</section></div>
            {status === 'incorrect' && <p className="answer-difference">{extra.length > 0 && `You selected ${extra.join(', ').toUpperCase()}, which ${extra.length === 1 ? 'is' : 'are'} not in the correct answer. `}{omitted.length > 0 && `You missed ${omitted.join(', ').toUpperCase()}. `}{q.answers.length > 1 && 'All correct options must be selected, with no extra options, to earn the mark.'}</p>}
            {status === 'unanswered' && <p className="answer-difference">{unscored ? 'You skipped this unscored question.' : 'No mark was earned because this question was left unanswered.'}</p>}
            <section className="review-explanation"><h3>Explanation & key takeaway</h3><p>{q.explanation}</p></section>
            <details className="all-options"><summary>See all answer options</summary><ul>{q.choices.map(c => <li key={c.id}><b>{c.id.toUpperCase()}.</b> {c.text} {q.answers.includes(c.id) && <b className="option-label">Correct answer</b>} {selected.includes(c.id) && <span className="option-label">Your selection</span>}</li>)}</ul></details>
            {refs.length > 0 && <div className="review-resources"><h3>Read more on AWS</h3>{refs.map(ref => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer">{ref.label} ↗</a>)}</div>}
            {q.validation && <details className="review-source"><summary>Question source & review notes</summary><p>PDF question {q.validation.sourceQuestion}, page {q.validation.sourcePage} · {q.validation.sourceFile}</p>{q.validation.correctedFromPdf && <p>The PDF answer key was corrected from {q.validation.sourceAnswers.join(', ').toUpperCase()} to {q.answers.join(', ').toUpperCase()}.</p>}{q.validation.wordingCorrected && <p>The wording was repaired during review. Original wording is available in the question bank.</p>}<p>{q.validation.method}</p></details>}
          </div>
        </details>;
      })}
    </section>
    <div className="review-actions"><button className="primary-button" onClick={onPractice}>Practice again →</button><button className="secondary-button" onClick={onBack}>Back to exams</button></div>
  </main>;
}
