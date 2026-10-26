import { useEffect, useMemo, useState } from 'react';
import { exams } from './questionBank.js';
import QuestionLibrary from './QuestionLibrary.jsx';
import { createSession, scoreSession } from './examSession.js';

const Logo = () => <img className="brand-mark" src="/company-mark.png" alt="Company mark" />;

function groupPerformance(items, responses, getLabels) {
  const groups = new Map();
  items.forEach((item) => {
    const selected = responses[item.id] ?? [];
    const correct = selected.length === item.answers.length && item.answers.every((id) => selected.includes(id));
    getLabels(item).forEach((label) => {
      if (!groups.has(label)) groups.set(label, { label, total: 0, correct: 0 });
      const group = groups.get(label);
      group.total += 1;
      if (correct) group.correct += 1;
    });
  });
  return [...groups.values()].map((group) => ({ ...group, accuracy: Math.round((group.correct / group.total) * 100) }));
}

function App() {
  const [screen, setScreen] = useState('home');
  const [activeExam, setActiveExam] = useState(null);
  const [mode, setMode] = useState('full');
  const [sessionMode, setSessionMode] = useState('full');
  const [customCount, setCustomCount] = useState(10);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [unscoredIds, setUnscoredIds] = useState(new Set());
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [deadline, setDeadline] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(new Set());
  const [review, setReview] = useState(false);

  const exam = activeExam ? exams[activeExam] : null;
  const availableQuestions = exam?.questions.filter((item) => item.validation?.status === 'reviewed') ?? [];
  const question = sessionQuestions[current];
  const total = sessionQuestions.length;
  const selected = question ? answers[question.id] ?? [] : [];
  const attempted = useMemo(() => Object.values(answers).filter((value) => value.length > 0).length, [answers]);
  const scoreableQuestions = sessionQuestions.filter((item) => sessionMode !== 'full' || !unscoredIds.has(item.id));
  const score = scoreSession(scoreableQuestions, answers);
  const domainPerformance = groupPerformance(scoreableQuestions, answers, (item) => [item.domain]);
  const servicePerformance = groupPerformance(scoreableQuestions, answers, (item) => item.services ?? []);
  const focusAreas = [
    ...domainPerformance.map((area) => ({ ...area, kind: 'Domain' })),
    ...servicePerformance.map((area) => ({ ...area, kind: 'Service' })),
  ].filter((area) => area.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy);

  useEffect(() => {
    if (screen !== 'exam' || sessionMode !== 'full' || review || !deadline) return undefined;
    const updateClock = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) setScreen('results');
    };
    updateClock();
    const timer = window.setInterval(updateClock, 250);
    window.addEventListener('focus', updateClock);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', updateClock); };
  }, [screen, sessionMode, review, deadline]);

  function begin(id) {
    setActiveExam(id);
    setMode('full');
    setCustomCount(10);
    setCurrent(0);
    setAnswers({});
    setMarked(new Set());
    setReview(false);
    setScreen('setup');
  }

  function startSession(selectedMode, requestedCount) {
    const required = selectedMode === 'full' ? exam.examLength : requestedCount;
    if (availableQuestions.length < required) return;
    const session = createSession(exam, selectedMode, requestedCount);
    setSessionQuestions(session.questions);
    setUnscoredIds(session.unscoredIds);
    setDeadline(selectedMode === 'full' ? Date.now() + exam.minutes * 60 * 1000 : null);
    setSessionMode(selectedMode);
    setRemainingSeconds(selectedMode === 'full' ? exam.minutes * 60 : 0);
    setCurrent(0);
    setAnswers({});
    setMarked(new Set());
    setReview(false);
    setScreen('exam');
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

  if (screen === 'library') return <div className="app-shell"><QuestionLibrary key={exam.id} exam={exam} onBack={() => setScreen('setup')}/></div>;

  if (screen === 'home') {
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
            <div className="section-heading"><div><p className="eyebrow">YOUR PRACTICE PATH</p><h2>Choose a certification</h2></div><span className="question-bank-note"><span className="status-dot" /> PDF questions imported</span></div>
            <div className="exam-grid">
              {Object.values(exams).map((item) => (
                <article className={`exam-card ${item.accent}`} key={item.id}>
                  <div className="card-top"><span className="level-pill">{item.level}</span><span className="card-code">{item.code}</span></div>
                  <div className="exam-icon" aria-hidden="true">{item.id === 'clf' ? <svg viewBox="0 0 48 48"><path d="M14 31a10 10 0 0 1 .3-20 12 12 0 0 1 22.4 3 9 9 0 0 1-.8 17H14Z"/><path d="M24 20v15m-5-5 5 5 5-5"/></svg> : <svg viewBox="0 0 48 48"><path d="M8 38h32M12 31l8-9 6 4 11-14"/><path d="M29 12h8v8"/><circle cx="12" cy="31" r="2"/><circle cx="20" cy="22" r="2"/><circle cx="26" cy="26" r="2"/></svg>}</div>
                  <h3>{item.title}</h3><p className="card-description">{item.description}</p><p className="bank-count">{item.bankSummary.imported} imported · {item.bankSummary.reviewed} ready · {item.bankSummary.flagged} flagged</p>
                  <div className="card-stats"><div><b>{item.examLength}</b><span>exam questions</span></div><i/><div><b>{item.minutes} min</b><span>time limit</span></div></div>
                  <button className="primary-button" onClick={() => begin(item.id)}>Choose exam type <span>→</span></button>
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

  if (screen === 'setup') {
    const fullReady = availableQuestions.length >= exam.examLength;
    const customReady = availableQuestions.length >= customCount;
    return (
      <div className="app-shell">
        <header className="topbar"><button className="brand brand-button" onClick={() => setScreen('home')}><Logo /><span>Cloud<span className="brand-light">Readiness</span></span></button><div className="topbar-right"><span className="internal-badge"><span className="status-dot" /> {exam.code}</span></div></header>
        <main className="setup-wrap">
          <button className="back-link" onClick={() => setScreen('home')}>← <span>All certifications</span></button>
          <p className="eyebrow">PRACTICE SETUP · {exam.code}</p><h1>Choose how you want to practice</h1><p className="setup-lead">{exam.title} · {availableQuestions.length} reviewed questions available for practice</p>
          <div className="mode-grid">
            <div role="radio" aria-checked={mode === 'full'} tabIndex={0} className={`mode-card ${mode === 'full' ? 'active' : ''}`} onClick={() => setMode('full')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setMode('full'); }}>
              <span className="mode-radio">{mode === 'full' ? '●' : '○'}</span><span className="mode-tag">EXAM SIMULATION</span><h2>Full mock exam</h2><p>Practice under exam-like conditions from start to finish.</p><div className="mode-facts"><span>{exam.examLength} questions</span><span>{exam.minutes} minutes</span><span>{exam.unscoredQuestions} unscored</span></div><small>Unscored questions are mixed in and won’t affect your practice result.</small>
            </div>
            <div role="radio" aria-checked={mode === 'custom'} tabIndex={0} className={`mode-card ${mode === 'custom' ? 'active' : ''}`} onClick={() => setMode('custom')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setMode('custom'); }}>
              <span className="mode-radio">{mode === 'custom' ? '●' : '○'}</span><span className="mode-tag">FLEXIBLE PRACTICE</span><h2>Custom practice</h2><p>Choose a shorter set for a focused study session.</p><div className="count-options">{[10, 15, 30, 40, 50].map((count) => <button type="button" key={count} disabled={availableQuestions.length < count} className={customCount === count ? 'selected' : ''} onClick={(event) => { event.stopPropagation(); setMode('custom'); setCustomCount(count); }}>{count}</button>)}</div><small>All questions count toward your practice result. Untimed.</small>
            </div>
          </div>
          <div className="bank-status"><span className="status-dot"/><div><b>{availableQuestions.length} reviewed questions from your PDF are ready</b><p>All {exam.bankSummary.imported} PDF questions are imported. {exam.bankSummary.flagged} flagged questions are excluded from scored tests. Full mocks and all custom sizes are available. Questions received AI content review with targeted AWS documentation checks; this is not independent expert certification.</p></div></div>
          <button className="secondary-button" onClick={() => setScreen('library')}>Browse all {exam.bankSummary.imported} PDF questions and review notes</button>
          <button className="primary-button setup-start" disabled={mode === 'full' ? !fullReady : !customReady} onClick={() => startSession(mode, customCount)}>{mode === 'full' ? 'Begin full mock exam' : `Start ${customCount}-question practice`} <span>→</span></button>
        </main>
      </div>
    );
  }

  if (screen === 'results') {
    return (
      <div className="app-shell"><header className="topbar"><button className="brand brand-button" onClick={() => { setScreen('home'); setActiveExam(null); }}><Logo /><span>Cloud<span className="brand-light">Readiness</span></span></button><div className="topbar-right"><span className="internal-badge"><span className="status-dot" /> Practice result</span></div></header>
        <main className="result-wrap">
          <div className="result-card">
            <div className="result-check">✓</div><p className="eyebrow">SESSION COMPLETE · {exam.code}</p><h1>Nice work showing up.</h1>
            <p className="result-lead">You answered {attempted} of {total} questions.</p>
            <div className="score-ring"><strong>{Math.round((score / scoreableQuestions.length) * 100)}<small>%</small></strong><span>{score} of {scoreableQuestions.length} scored correct</span></div>
            <p className="disclaimer">{sessionMode === 'full' ? `${exam.unscoredQuestions} questions were excluded from this practice score, as in the exam format. This percentage is not an AWS scaled score.` : 'This is a practice percentage, not an AWS scaled score.'}</p>
            <section className="feedback-report">
              <div className="feedback-heading"><h2>Your focus report</h2><p>Based on scored questions only, with inferred domain and service tags. Small samples can shift the percentages. Review missed questions and their AWS references below.</p></div>
              {focusAreas.length > 0 ? <div className="focus-list">{focusAreas.map((area) => <div className="focus-row" key={`${area.kind}-${area.label}`}><span className="focus-kind">{area.kind === 'Service' ? 'SERVICE' : 'EXAM DOMAIN'}</span><div className="focus-main"><b>{area.label}</b><span>{area.correct} of {area.total} correct · {area.total === 1 ? '1 question' : `${area.total} questions`}</span></div><strong>{area.accuracy}%</strong></div>)}</div> : <p className="no-focus">No clear focus area showed up in this session. Keep practicing across the domains and services.</p>}
              <div className="report-columns">
                <div className="report-section"><h3>Exam domains</h3>{domainPerformance.map((area) => <div className="performance-row" key={area.label}><div><span>{area.label}</span><b>{area.accuracy}%</b></div><div className="performance-track"><i style={{ width: `${area.accuracy}%` }}/></div><small>{area.correct}/{area.total} correct</small></div>)}</div>
                <div className="report-section"><h3>AWS services</h3>{servicePerformance.length ? servicePerformance.map((area) => <div className="performance-row" key={area.label}><div><span>{area.label}</span><b>{area.accuracy}%</b></div><div className="performance-track"><i style={{ width: `${area.accuracy}%` }}/></div><small>{area.correct}/{area.total} correct</small></div>) : <p className="no-services">No service-specific questions were included in this session.</p>}</div>
              </div>
            </section>
            <div className="result-actions"><button className="primary-button" onClick={() => { setScreen('exam'); setReview(true); setCurrent(0); }}>Review answers <span>→</span></button><button className="secondary-button" onClick={() => { setScreen('home'); setActiveExam(null); }}>Back to exams</button></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell exam-view"><header className="topbar"><button className="brand brand-button" onClick={() => { setScreen('home'); setActiveExam(null); }}><Logo /><span>Cloud<span className="brand-light">Readiness</span></span></button><div className="topbar-right">{sessionMode === 'full' ? <span className="timer-chip">◷ {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}</span> : <span className="preview-chip">CUSTOM PRACTICE</span>}<button className="exit-button" onClick={() => { setScreen('home'); setActiveExam(null); }}>Exit practice <span>×</span></button></div></header>
      <main className="practice-layout"><aside className="question-rail"><button className="back-link" onClick={() => { setScreen('home'); setActiveExam(null); }}>← <span>All certifications</span></button><div className="rail-course"><div className={`mini-icon ${exam.accent}`}>{exam.id === 'clf' ? '☁' : '⌁'}</div><div><span>{exam.code}</span><b>{exam.title}</b></div></div><div className="rail-progress"><div className="progress-label"><span>YOUR PROGRESS</span><b>{current + 1} / {total}</b></div><div className="progress-track"><div style={{ width: `${((current + 1) / total) * 100}%` }}/></div></div><p className="rail-caption">QUESTION NAVIGATOR <span>Tap to jump</span></p><div className="question-grid">{sessionQuestions.map((item, i) => <button className={`${current === i ? 'current' : ''} ${(answers[item.id]?.length ? 'answered' : '')} ${marked.has(item.id) ? 'marked' : ''}`} key={item.id} onClick={() => setCurrent(i)}>{i + 1}</button>)}</div><div className="rail-legend"><span><i className="legend-dot answered-dot"/>Answered</span><span><i className="legend-dot mark-dot"/>Review</span></div><div className="rail-info"><span>◷</span><p><b>{sessionMode === 'full' ? 'Exam time remaining' : 'Custom practice'}</b><br/>{sessionMode === 'full' ? '15 unscored questions are mixed in; their status is hidden.' : 'Untimed practice. All selected questions count toward your result.'}</p></div></aside>
      <section className="question-column"><div className="question-meta"><span className="domain-tag">{question.domain}</span><span>QUESTION {String(current + 1).padStart(2, '0')} <i>·</i> {total}</span></div><div className="question-content"><div className="question-title-row"><h1>{question.prompt}</h1><button className={`flag-button ${marked.has(question.id) ? 'is-marked' : ''}`} onClick={toggleMarked}>{marked.has(question.id) ? '⚑' : '⚐'} <span>{marked.has(question.id) ? 'Marked for review' : 'Mark for review'}</span></button></div><p className="select-hint">{question.answers.length > 1 ? `Select ${question.answers.length} answers.` : 'Select one answer.'}</p><div className="answer-list">{question.choices.map((choice) => { const checked = selected.includes(choice.id); const reveal = review; const correct = question.answers.includes(choice.id); return <button className={`answer-option ${checked ? 'selected' : ''} ${reveal && correct ? 'correct' : ''} ${reveal && checked && !correct ? 'incorrect' : ''}`} key={choice.id} onClick={() => !review && toggleAnswer(choice.id)}><span className="choice-letter">{choice.id.toUpperCase()}</span><span className="choice-text">{choice.text}</span><span className="choice-control">{checked ? '✓' : ''}</span></button>; })}</div>{review && <div className="explanation"><div className="explanation-mark">✦</div><div><b>{question.answers.every((id) => selected.includes(id)) && selected.length === question.answers.length ? 'That’s correct.' : 'Review this concept.'}</b><p>{question.explanation}</p><p className="source-provenance">From your PDF: question {question.validation.sourceQuestion}, page {question.validation.sourcePage}.{question.validation.correctedFromPdf && ` Answer key corrected from ${question.validation.sourceAnswers.join(", ").toUpperCase()} to ${question.answers.join(", ").toUpperCase()}.`}{question.validation.wordingCorrected && " Wording repaired; original text is available in the question bank."}{sessionMode === 'full' && unscoredIds.has(question.id) && " This question was unscored."}</p>{question.validation?.sourceUrl && <a className="source-link" href={question.validation.sourceUrl} target="_blank" rel="noreferrer">AWS documentation ↗</a>}</div></div>}</div>
        <div className="question-footer"><div><button className="secondary-button" disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>← Previous</button><button className="next-button" onClick={() => { if (review) { if (current === total - 1) setScreen('results'); else setCurrent((n) => n + 1); } else if (current === total - 1) setScreen('results'); else setCurrent((n) => n + 1); }}>{review ? current === total - 1 ? 'Finish review' : 'Next question' : current === total - 1 ? 'Finish exam' : 'Next question'} <span>→</span></button></div><span className="auto-save"><i/> Answer kept for this session</span></div>
      </section></main>
    </div>
  );
}

export default App;
