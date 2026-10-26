export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function isCorrect(question, selected = []) {
  return selected.length === question.answers.length && question.answers.every((id) => selected.includes(id));
}

export function createSession(exam, mode, count, random = Math.random) {
  const pool = shuffle(exam.questions.filter((q) => q.validation.status === 'reviewed'), random);
  const required = mode === 'full' ? exam.examLength : count;
  if (!Number.isInteger(required) || required < 1 || pool.length < required) throw new Error('Insufficient reviewed questions.');
  if (mode !== 'full') return { questions: pool.slice(0, required), unscoredIds: new Set() };
  const scored = Object.entries(exam.scoredDomains).flatMap(([domain, size]) => {
    const subset = pool.filter((q) => q.domain === domain);
    if (subset.length < size) throw new Error(`Insufficient reviewed questions for ${domain}.`);
    return subset.slice(0, size);
  });
  const used = new Set(scored.map((q) => q.id));
  const unscored = pool.filter((q) => !used.has(q.id)).slice(0, exam.unscoredQuestions);
  return { questions: shuffle([...scored, ...unscored], random), unscoredIds: new Set(unscored.map((q) => q.id)) };
}

export function scoreSession(questions, responses, unscoredIds = new Set()) {
  return questions.filter((q) => !unscoredIds.has(q.id)).reduce((score, q) => score + Number(isCorrect(q, responses[q.id])), 0);
}
