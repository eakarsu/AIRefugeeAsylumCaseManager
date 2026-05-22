const express = require('express');

const router = express.Router();

const prepCases = [
  { id: 1, applicant: 'Client A', language: 'Kinyarwanda', basis: 'political opinion', gaps: ['chronology detail', 'translator availability'], readiness: 68 },
  { id: 2, applicant: 'Client B', language: 'Spanish', basis: 'particular social group', gaps: ['country condition citation'], readiness: 81 },
  { id: 3, applicant: 'Client C', language: 'Dari', basis: 'religion', gaps: [], readiness: 94 },
];

router.get('/', (req, res) => {
  res.json({
    summary: {
      applicants: prepCases.length,
      interpreterNeeds: prepCases.filter((item) => item.language !== 'English').length,
      avgReadiness: Math.round(prepCases.reduce((sum, item) => sum + item.readiness, 0) / prepCases.length),
    },
    prepCases,
  });
});

router.post('/brief', (req, res) => {
  const item = prepCases.find((entry) => entry.id === Number(req.body?.id)) || prepCases[0];
  res.json({
    applicant: item.applicant,
    prepFocus: [`Explain ${item.basis} claim elements`, 'Practice concise timeline answers', ...item.gaps],
    traumaInformedNote: 'Use breaks, avoid leading questions, and confirm interpreter comprehension.',
  });
});

module.exports = router;
