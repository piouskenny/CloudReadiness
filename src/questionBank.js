import clfQuestions from './data/clf-reviewed.json';
import saaQuestions from './data/saa-reviewed.json';
import summary from './data/review-summary.json';

export const exams = {
  clf: {
    id: 'clf', code: 'CLF-C02', title: 'Cloud Practitioner', level: 'Foundational',
    minutes: 90, examLength: 65, unscoredQuestions: 15, accent: 'blue',
    description: 'Practice with the Cloud Practitioner questions from your uploaded PDF.',
    questions: clfQuestions, bankSummary: summary.clf,
    scoredDomains: {'Cloud Concepts': 12, 'Security and Compliance': 15, 'Cloud Technology and Services': 17, 'Billing, Pricing, and Support': 6},
  },
  saa: {
    id: 'saa', code: 'SAA-C03', title: 'Solutions Architect – Associate', level: 'Associate',
    minutes: 130, examLength: 65, unscoredQuestions: 15, accent: 'green',
    description: 'Practice with the Solutions Architect questions from your uploaded PDF.',
    questions: saaQuestions, bankSummary: summary.saa,
    scoredDomains: {'Design Secure Architectures': 15, 'Design Resilient Architectures': 13, 'Design High-Performing Architectures': 12, 'Design Cost-Optimized Architectures': 10},
  },
};
