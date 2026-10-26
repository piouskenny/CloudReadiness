import { useState } from 'react';

export default function QuestionLibrary({ exam, onBack }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const query = search.trim().toLowerCase();
  const matches = exam.questions.filter((q) => (status === 'all' || q.validation.status === status) && (!query || `${q.prompt} ${q.validation.sourceQuestion} ${q.services.join(' ')}`.toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(matches.length / 20));
  return <main className="library-wrap">
    <button className="back-link" onClick={onBack}>← Back to exam setup</button>
    <p className="eyebrow">{exam.code} · YOUR PDF QUESTION BANK</p>
    <h1>Every imported question, in one place</h1>
    <p>{exam.bankSummary.imported} imported · {exam.bankSummary.reviewed} ready for practice · {exam.bankSummary.flagged} flagged</p>
    <p className="library-note">Questions received AI content review with targeted AWS documentation checks. This is not an independent expert certification. Flagged questions are excluded from tests. Original PDF numbers and page references are preserved; study tags are inferred.</p>
    <div className="library-filters">
      <label>Find a question<input value={search} placeholder="Search wording, service, or PDF question number" onChange={(e) => { setSearch(e.target.value); setPage(0); }}/></label>
      <label>Review status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="all">All imported questions</option><option value="reviewed">Ready for practice</option><option value="flagged">Flagged — excluded</option></select></label>
    </div>
    <p>{matches.length} matching questions</p>
    {matches.slice(page * 20, page * 20 + 20).map((q) => <article className="library-question" key={q.id}>
      <div className="library-meta"><b>PDF question {q.validation.sourceQuestion} · page {q.validation.sourcePage}</b><span className={q.validation.status === 'flagged' ? 'flagged-pill' : 'reviewed-pill'}>{q.validation.status === 'flagged' ? 'Flagged — excluded' : 'Ready for practice'}</span></div>
      <h2>{q.prompt}</h2>
      <ol type="A">{q.choices.map((choice) => <li value={choice.id.charCodeAt(0) - 96} key={choice.id}>{choice.text}</li>)}</ol>
      {q.validation.status === 'flagged' ? <p className="hold-note">{q.validation.holdReason}</p> : <details><summary>Show reviewed answer and study references</summary><p><b>Answer: {q.answers.join(', ').toUpperCase()}</b></p><p>{q.explanation}</p>{q.validation.correctedFromPdf && <p className="hold-note">PDF key corrected: {q.validation.sourceAnswers.join(', ').toUpperCase()} → {q.answers.join(', ').toUpperCase()}</p>}<div className="reference-list">{q.validation.references.map((ref) => <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer">{ref.label} ↗</a>)}</div></details>}
      {q.original && <details><summary>{q.validation.wordingCorrected ? 'See original PDF wording before corrections' : 'See original extracted text'}</summary><p>{q.original.prompt}</p><ol type="A">{q.original.choices.map((c) => <li value={c.id.charCodeAt(0) - 96} key={c.id}>{c.text}</li>)}</ol></details>}
      <small>{q.validation.sourceFile}</small>
    </article>)}
    {!matches.length && <p>No matching questions. Try another search or status.</p>}
    <div className="library-pagination"><button className="secondary-button" disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button><span>Page {page + 1} of {pages}</span><button className="secondary-button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next →</button></div>
  </main>;
}
