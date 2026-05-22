// Apply pass 7: External government feed stubs (EOIR / USCIS / DHS).
// Tagged NEEDS-CREDS in the audit; ship as 503 stubs that document the
// caller contract until production credentials + endpoint URLs are
// provisioned. NEVER throw 500 (mask misconfiguration as a real bug).

const express = require('express');
const router = express.Router();

function stub(provider, endpoint) {
  return (req, res) => {
    res.status(503).json({
      error: 'NEEDS-CREDS',
      provider,
      endpoint,
      reason: 'Production credentials and live endpoint URL are not yet provisioned for this feed.',
      required_env: {
        EOIR_API_BASE:    process.env.EOIR_API_BASE    ? 'present' : 'missing',
        EOIR_API_KEY:     process.env.EOIR_API_KEY     ? 'present' : 'missing',
        USCIS_API_BASE:   process.env.USCIS_API_BASE   ? 'present' : 'missing',
        USCIS_API_KEY:    process.env.USCIS_API_KEY    ? 'present' : 'missing',
        DHS_API_BASE:     process.env.DHS_API_BASE     ? 'present' : 'missing',
        DHS_API_KEY:      process.env.DHS_API_KEY      ? 'present' : 'missing',
      },
      contract: {
        method: req.method,
        accepted_inputs: ['a_number', 'receipt_number', 'case_id', 'date_range'],
        expected_shape: '{ status, last_action_date, next_hearing, source }',
      },
      disclaimer: 'No data has been retrieved. Do not infer case status from this response.',
      requires_attorney_review: true,
      not_legal_advice: true,
    });
  };
}

// EOIR — Executive Office for Immigration Review (immigration courts)
router.get('/eoir/case/:a_number',     stub('EOIR', 'GET /eoir/case/:a_number'));
router.get('/eoir/hearing/:hearing_id', stub('EOIR', 'GET /eoir/hearing/:hearing_id'));
router.get('/eoir/calendar',            stub('EOIR', 'GET /eoir/calendar?court=&date='));

// USCIS — case-status API
router.get('/uscis/case/:receipt_number', stub('USCIS', 'GET /uscis/case/:receipt_number'));
router.get('/uscis/processing-times',     stub('USCIS', 'GET /uscis/processing-times?form='));

// DHS — A-file index / detention status
router.get('/dhs/a-file/:a_number',  stub('DHS', 'GET /dhs/a-file/:a_number'));
router.get('/dhs/detention/:a_number', stub('DHS', 'GET /dhs/detention/:a_number'));

// Single discovery endpoint so the UI can show what's wired vs. blocked
router.get('/', (req, res) => {
  res.json({
    status: 'NEEDS-CREDS',
    providers: ['EOIR', 'USCIS', 'DHS'],
    endpoints: [
      '/external-feeds/eoir/case/:a_number',
      '/external-feeds/eoir/hearing/:hearing_id',
      '/external-feeds/eoir/calendar',
      '/external-feeds/uscis/case/:receipt_number',
      '/external-feeds/uscis/processing-times',
      '/external-feeds/dhs/a-file/:a_number',
      '/external-feeds/dhs/detention/:a_number',
    ],
    disclaimer: 'All feeds return HTTP 503 until production credentials are provisioned.',
    requires_attorney_review: true,
    not_legal_advice: true,
  });
});

module.exports = router;
