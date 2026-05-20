const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [
      clients, cases, hearings, dossiers, coi, forms, evidence, experts,
      interpreters, attorneys, paralegals, orgs, grants, deportations, family, sponsors, calendars, audit,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active, COUNT(*) FILTER (WHERE status='intake') AS intake FROM clients"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='in_hearing') AS in_hearing, COUNT(*) FILTER (WHERE status='appeal_pending') AS appeal_pending FROM cases"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='scheduled') AS scheduled, COUNT(*) FILTER (WHERE status='continued') AS continued FROM hearings"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='draft') AS draft, COUNT(*) FILTER (WHERE status='in_review') AS in_review, COUNT(*) FILTER (WHERE status='final') AS final FROM dossiers"),
      pool.query("SELECT COUNT(*) AS total, COALESCE(SUM(citation_count),0) AS total_citations FROM country_of_origin_info"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='filed') AS filed, COUNT(*) FILTER (WHERE status='draft') AS draft FROM immigration_forms"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='verified') AS verified, COUNT(*) FILTER (WHERE status='pending_review') AS pending FROM evidence_docs"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='engaged') AS engaged, COUNT(*) FILTER (WHERE status='pending') AS pending FROM expert_witnesses"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='available') AS available, COUNT(*) FILTER (WHERE status='engaged') AS engaged FROM interpreters"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active FROM attorneys"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active FROM paralegals"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active FROM partner_orgs"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='granted') AS granted, COUNT(*) FILTER (WHERE status='denied') AS denied, COUNT(*) FILTER (WHERE status='pending') AS pending FROM asylum_grants"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='on_appeal') AS on_appeal, COUNT(*) FILTER (WHERE status='final') AS final FROM deportation_orders"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='separated') AS separated, COUNT(*) FILTER (WHERE status='reunited') AS reunited FROM family_members"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active FROM sponsors"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open FROM court_calendars"),
      pool.query("SELECT COUNT(*) AS total FROM audit_log"),
    ]);
    res.json({
      clients: clients.rows[0],
      cases: cases.rows[0],
      hearings: hearings.rows[0],
      dossiers: dossiers.rows[0],
      country_of_origin_info: coi.rows[0],
      immigration_forms: forms.rows[0],
      evidence_docs: evidence.rows[0],
      expert_witnesses: experts.rows[0],
      interpreters: interpreters.rows[0],
      attorneys: attorneys.rows[0],
      paralegals: paralegals.rows[0],
      partner_orgs: orgs.rows[0],
      asylum_grants: grants.rows[0],
      deportation_orders: deportations.rows[0],
      family_members: family.rows[0],
      sponsors: sponsors.rows[0],
      court_calendars: calendars.rows[0],
      audit_log: audit.rows[0],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
