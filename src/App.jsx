import { useMemo, useState } from 'react';
import { exams } from './questionBank.js';

const Logo = () => <img className="brand-mark" src="/company-mark.png" alt="Company mark" />;

function App() {
  const [activeExam, setActiveExam] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(new Set());
  const [finished, setFinished] = useState(false);
  const [review, setReview] = useState(false);

  const exam = activeExam ? exams[activeExam] : null;
  const questions = exam?.questions.filter((item) => item.validation?.status === 'verified') ?? [];
  const question = questions[current];
  const total = questions.length;
  const selected = question ? answers[question.id] ?? [] : [];
  const attempted = useMemo(() => Object.keys(answers).length, [answers]);
  const score = questions.reduce((sum, item) => sum + (item.answers.every((id) => (answers[item.id] ?? []).includes(id)) && (answers[item.id] ?? []).length === item.answers.length ? 1 : 0), 0);

  function begin(id) {
    setActiveExam(id);
    setCurrent(0);
    setAnswers({});
    setMarked(new Set());
    setFinished(false);
    setReview(false);
  }

  function toggleAnswer(choiceId) {
    const multi = question.answers.length > 1;
    setAnswers((previous) => {
      const wasSelected = (previous[question.id] ?? []).includes(choiceId);
      const next = multi
        ? wasSelected ? previous[question.id].filter((id) => id !== choiceId) : [...(previous[question.id] ?? []), choiceId]
        : wasSelected ? [] : [choiceId];
      return { ...previous, [question.id]: next };
    });
  }

  function toggleMarked() {
    setMarked((previous) => {
      const next = new Set(previous);
      next.has(question.id) ? next.delete(question.id) : next.add(question.id);
      return next;
    });
  }

  if (!exam) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#home" aria-label="Home"><Logo /><span>Cloud<span className="brand-light">Readiness</span></span></a>
          <div className="topbar-right"><span className="internal-badge"><span className="status-dot" /> Internal learning</span><div className="avatar">AR</div></div>
        </header>
        <main className="dashboard">
          <div className="welcome-row">
            <div><p className="eyebrow">LEARNING CENTRE <span> / </span> AWS CERTIFICATIONS</p><h1>Ready to level up?</h1><p className="lead">Choose an exam and build confidence one practice session at a time.</p></div>
            <div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-core"><span>☁</span><b>AWS</b></div></div>
          </div>

          <section className="exam-section">
            <div className="section-heading"><div><p className="eyebrow">YOUR PRACTICE PATH</p><h2>Choose a certification</h2></div><span className="question-bank-note"><span className="status-dot" /> Demo question bank</span></div>
            <div className="exam-grid">
              {Object.values(exams).map((item) => (
                <article className={`exam-card ${item.accent}`} key={item.id}>
                  <div className="card-top"><span className="level-pill">{item.level}</span><span className="card-code">{item.code}</span></div>
                  <div className="exam-icon" aria-hidden="true">{item.id === 'clf' ? <svg viewBox="0 0 48 48"><path d="M14 31a10 10 0 0 1 .3-20 12 12 0 0 1 22.4 3 9 9 0 0 1-.8 17H14Z"/><path d="M24 20v15m-5-5 5 5 5-5"/></svg> : <svg viewBox="0 0 48 48"><path d="M8 38h32M12 31l8-9 6 4 11-14"/><path d="M29 12h8v8"/><circle cx="12" cy="31" r="2"/><circle cx="20" cy="22" r="2"/><circle cx="26" cy="26" r="2"/></svg>}</div>
                  <h3>{item.title}</h3><p className="card-description">{item.description}</p>
                  <div className="card-stats"><div><b>{item.examLength}</b><span>exam questions</span></div><i/><div><b>{item.minutes} min</b><span>time limit</span></div></div>
                  <button className="primary-button" onClick={() => begin(item.id)}>Start practice <span>→</span></button>
                </article>
              ))}
              <article className="coming-card"><div className="plus-icon">+</div><h3>More exams soon</h3><p>We’ll add more AWS certifications as your learning path grows.</p><span className="coming-tag">COMING NEXT</span></article>
            </div>
          </section>
          <aside className="tip-banner"><div className="tip-icon">✦</div><p><b>Learn as you go.</b> Review explanations after each session and use them to guide your next study block.</p><span className="tip-arrow">↗</span></aside>
          <footer><span>Built for learning at work</span><span>Practice consistently. Grow confidently.</span></footer>
        </main>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="app-shell"><header className="topbar"><button className="brand brand-button" onClick={() => setActiveExam(null)}><Logo /><span>Cloud<span className="brand-light">Readiness</span></span></button><div className="topbar-right"><span className="internal-badge"><span className="status-dot" /> Practice preview</span></div></header>
        <main className="result-wrap"><div className="result-card"><div className="result-check">✓</div><p className="eyebrow">SESSION COMPLETE · {exam.code}</p><h1>Nice work showing up.</h1><p className="result-lead">You answered {attempted} of {total} demo questions.</p><div className="score-ring"><strong>{Math.round((score / total) * 100)}<small>%</small></strong><span>{score} of {total} correct</span></div><p className="disclaimer">This is a short practice preview, not a full-length AWS exam or an AWS scaled score.</p><div className="result-actions"><button className="primary-button" onClick={() => { setFinished(false); setReview(true); setCurrent(0); }}>Review answers <span>→</span></button><button className="secondary-button" onClick={() => setActiveExam(null)}>Back to exams</button></div></div></main>
      </div>
    );
  }

  return (
    <div className="app-shell exam-view"><header className="topbar"><button className="brand brand-button" onClick={() => setActiveExam(null)}><Logo /><span>Cloud<span className="brand-light">Readiness</span></span></button><div className="topbar-right"><span className="preview-chip">DEMO PREVIEW</span><button className="exit-button" onClick={() => setActiveExam(null)}>Exit practice <span>×</span></button></div></header>
      <main className="practice-layout"><aside className="question-rail"><button className="back-link" onClick={() => setActiveExam(null)}>← <span>All certifications</span></button><div className="rail-course"><div className={`mini-icon ${exam.accent}`}>{exam.id === 'clf' ? '☁' : '⌁'}</div><div><span>{exam.code}</span><b>{exam.title}</b></div></div><div className="rail-progress"><div className="progress-label"><span>YOUR PROGRESS</span><b>{current + 1} / {total}</b></div><div className="progress-track"><div style={{ width: `${((current + 1) / total) * 100}%` }}/></div></div><p className="rail-caption">QUESTION NAVIGATOR <span>Tap to jump</span></p><div className="question-grid">{questions.map((item, i) => <button className={`${current === i ? 'current' : ''} ${(answers[item.id]?.length ? 'answered' : '')} ${marked.has(item.id) ? 'marked' : ''}`} key={item.id} onClick={() => setCurrent(i)}>{i + 1}</button>)}</div><div className="rail-legend"><span><i className="legend-dot answered-dot"/>Answered</span><span><i className="legend-dot mark-dot"/>Review</span></div><div className="rail-info"><span>◷</span><p><b>Take your time</b><br/>This preview is untimed. Full exam timing can be enabled when the complete question bank is ready.</p></div></aside>
      <section className="question-column"><div className="question-meta"><span className="domain-tag">{question.domain}</span><span>QUESTION {String(current + 1).padStart(2, '0')} <i>·</i> {total}</span></div><div className="question-content"><div className="question-title-row"><h1>{question.prompt}</h1><button className={`flag-button ${marked.has(question.id) ? 'is-marked' : ''}`} onClick={toggleMarked}>{marked.has(question.id) ? '⚑' : '⚐'} <span>{marked.has(question.id) ? 'Marked for review' : 'Mark for review'}</span></button></div><p className="select-hint">{question.answers.length > 1 ? `Select ${question.answers.length} answers.` : 'Select one answer.'}</p><div className="answer-list">{question.choices.map((choice) => { const checked = selected.includes(choice.id); const reveal = review; const correct = question.answers.includes(choice.id); return <button className={`answer-option ${checked ? 'selected' : ''} ${reveal && correct ? 'correct' : ''} ${reveal && checked && !correct ? 'incorrect' : ''}`} key={choice.id} onClick={() => !review && toggleAnswer(choice.id)}><span className="choice-letter">{choice.id.toUpperCase()}</span><span className="choice-text">{choice.text}</span><span className="choice-control">{checked ? '✓' : ''}</span></button>; })}</div>{review && <div className="explanation"><div className="explanation-mark">✦</div><div><b>{question.answers.every((id) => selected.includes(id)) && selected.length === question.answers.length ? 'That’s correct.' : 'Review this concept.'}</b><p>{question.explanation}</p>{question.validation?.sourceUrl && <a className="source-link" href={question.validation.sourceUrl} target="_blank" rel="noreferrer">AWS documentation ↗</a>}</div></div>}</div>
        <div className="question-footer"><div><button className="secondary-button" disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>← Previous</button><button className="next-button" onClick={() => { if (review) { if (current === total - 1) setActiveExam(null); else setCurrent((n) => n + 1); } else if (current === total - 1) setFinished(true); else setCurrent((n) => n + 1); }}>{review ? current === total - 1 ? 'Finish review' : 'Next question' : current === total - 1 ? 'Finish preview' : 'Next question'} <span>→</span></button></div><span className="auto-save"><i/> Answer kept for this session</span></div>
      </section></main>
    </div>
  );
}

export default App;
