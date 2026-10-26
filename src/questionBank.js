import clfUrl from './data/clf-reviewed.json?url&no-inline';
import saaUrl from './data/saa-reviewed.json?url&no-inline';
import summary from './data/review-summary.json';

export const exams = {
  clf: {
    id: 'clf', code: 'CLF-C02', title: 'Cloud Practitioner', level: 'Foundational',
    minutes: 90, examLength: 65, unscoredQuestions: 15, accent: 'blue',
    description: 'Practice with the Cloud Practitioner questions from your uploaded PDF.',
    questionsUrl: clfUrl, bankSummary: summary.clf,
    scoredDomains: {'Cloud Concepts': 12, 'Security and Compliance': 15, 'Cloud Technology and Services': 17, 'Billing, Pricing, and Support': 6},
  },
  saa: {
    id: 'saa', code: 'SAA-C03', title: 'Solutions Architect – Associate', level: 'Associate',
    minutes: 130, examLength: 65, unscoredQuestions: 15, accent: 'green',
    description: 'Practice with the Solutions Architect questions from your uploaded PDF.',
    questionsUrl: saaUrl, bankSummary: summary.saa,
    scoredDomains: {'Design Secure Architectures': 15, 'Design Resilient Architectures': 13, 'Design High-Performing Architectures': 12, 'Design Cost-Optimized Architectures': 10},
  },
};

const loadedExams = new Map();
export async function loadExam(id) {
  if (!exams[id]) throw new Error('Unknown exam.');
  if (loadedExams.has(id)) return loadedExams.get(id);
  const response = await fetch(exams[id].questionsUrl);
  if (!response.ok) throw new Error('Could not download the question bank.');
  const questions = await response.json();
  if (!Array.isArray(questions) || questions.length !== exams[id].bankSummary.imported) {
    throw new Error('The downloaded question bank is incomplete.');
  }
  const exam = { ...exams[id], questions };
  loadedExams.set(id, exam);
  return exam;
}
