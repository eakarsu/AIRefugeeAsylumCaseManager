import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

const FEATURES = [
  { path: '/clients',                title: 'Clients',                icon: 'C', color: '#3b82f6', desc: 'Refugee / asylum seekers in intake or active representation.' },
  { path: '/cases',                  title: 'Cases',                  icon: 'K', color: '#06b6d4', desc: 'Asylum, withholding, CAT, TPS, SIV and related matters.' },
  { path: '/hearings',               title: 'Hearings',               icon: 'H', color: '#10b981', desc: 'Master Calendar, Individual Hearings, asylum office interviews.' },
  { path: '/dossiers',               title: 'Dossiers',               icon: 'D', color: '#f59e0b', desc: 'Case dossiers assembled for filing or hearing.' },
  { path: '/country-of-origin-info', title: 'Country of Origin Info', icon: 'O', color: '#a78bfa', desc: 'COI library: UNHCR, US State, EUAA, HRW, Amnesty.' },
  { path: '/immigration-forms',      title: 'Immigration Forms',      icon: 'F', color: '#ec4899', desc: 'I-589, I-730, I-360, I-765, EOIR-26, I-821.' },
  { path: '/evidence-docs',          title: 'Evidence Docs',          icon: 'E', color: '#22c55e', desc: 'Police reports, medical records, expert reports, photos.' },
  { path: '/expert-witnesses',       title: 'Expert Witnesses',       icon: 'X', color: '#ef4444', desc: 'Country-condition and subject experts engaged.' },

  { path: '/interpreters',           title: 'Interpreters',           icon: 'I', color: '#0ea5e9', desc: 'NAJIT / ATA / community-certified interpreters by language.' },
  { path: '/attorneys',              title: 'Attorneys',              icon: 'A', color: '#14b8a6', desc: 'Staff and pro bono attorneys with specialty.' },
  { path: '/paralegals',             title: 'Paralegals',             icon: 'P', color: '#fb7185', desc: 'Paralegals attached to lead attorneys.' },
  { path: '/partner-orgs',           title: 'Partner Orgs',           icon: 'R', color: '#facc15', desc: 'UNHCR, IRC, HIAS, KIND, CLINIC and other partners.' },
  { path: '/asylum-grants',          title: 'Asylum Grants',          icon: 'G', color: '#a3e635', desc: 'Outcomes of asylum, withholding, CAT and SIV adjudications.' },
  { path: '/deportation-orders',     title: 'Deportation Orders',     icon: 'Z', color: '#60a5fa', desc: 'Removal orders and pending appeals / motions to reopen.' },
  { path: '/family-members',         title: 'Family Members',         icon: 'M', color: '#7dd3fc', desc: 'Family ties used for I-730 follow-to-join and reunification.' },
  { path: '/sponsors',               title: 'Sponsors',               icon: 'S', color: '#f472b6', desc: 'Welcome Corps, family, congregational and NGO sponsors.' },
  { path: '/court-calendars',        title: 'Court Calendars',        icon: 'T', color: '#dc2626', desc: 'Court / asylum office docket days clinic is tracking.' },
  { path: '/audit-log',              title: 'Audit Log',              icon: '+', color: '#34d399', desc: 'Append-only governance log of clinic actions.' },

  { path: '/ai/coi-cite-memo',              title: 'AI · COI Cite Memo',              icon: '*', color: '#8b5cf6', desc: 'Generate citation memo for a specific claim basis.' },
  { path: '/ai/hearing-prep-brief',         title: 'AI · Hearing Prep Brief',         icon: '*', color: '#8b5cf6', desc: 'Direct exam, cross themes, exhibit checklist.' },
  { path: '/ai/evidence-gap-analyze',       title: 'AI · Evidence Gap Analyze',       icon: '*', color: '#8b5cf6', desc: 'Identify missing or weak evidence for a claim.' },
  { path: '/ai/asylum-narrative-draft',     title: 'AI · Asylum Narrative Draft',     icon: '*', color: '#8b5cf6', desc: 'Draft I-589 declaration outline + nexus.' },
  { path: '/ai/executive-brief',            title: 'AI · Executive Brief',            icon: '*', color: '#8b5cf6', desc: 'Clinic snapshot for the managing attorney.' },
  { path: '/ai/interpreter-match',          title: 'AI · Interpreter Match',          icon: '*', color: '#8b5cf6', desc: 'Match interpreter to client and case sensitivity.' },
  { path: '/ai/country-conditions-summary', title: 'AI · Country Conditions Summary', icon: '*', color: '#8b5cf6', desc: 'Summarize country conditions and protected grounds.' },
  { path: '/ai/deportation-relief-options', title: 'AI · Deportation Relief Options', icon: '*', color: '#8b5cf6', desc: 'Map available relief against removal.' },
  { path: '/ai/sponsor-petition-draft',     title: 'AI · Sponsor Petition Draft',     icon: '*', color: '#8b5cf6', desc: 'Outline I-134A / Welcome Corps petition.' },
  { path: '/ai/family-reunification-plan',  title: 'AI · Family Reunification Plan',  icon: '*', color: '#8b5cf6', desc: 'Map reunification pathways and timeline.' },
  { path: '/ai/hardship-evidence-suggest',  title: 'AI · Hardship Evidence Suggest',  icon: '*', color: '#8b5cf6', desc: 'Suggest evidence for hardship narratives.' },
  { path: '/ai/attorney-handoff-summary',   title: 'AI · Attorney Handoff Summary',   icon: '*', color: '#8b5cf6', desc: 'Build a handoff packet for incoming counsel.' },
  { path: '/ai/regulatory-update-brief',    title: 'AI · Regulatory Update Brief',    icon: '*', color: '#8b5cf6', desc: 'Summarize recent reg/policy/case law on a topic.' },
  { path: '/ai/partner-org-referral',       title: 'AI · Partner Org Referral',       icon: '*', color: '#8b5cf6', desc: 'Recommend partner orgs for non-legal needs.' },
  { path: '/ai/donor-impact-report',        title: 'AI · Donor Impact Report',        icon: '*', color: '#8b5cf6', desc: 'Draft a donor / funder impact report (no PII).' },
  { path: '/ai/court-calendar-conflicts',   title: 'AI · Court Calendar Conflicts',   icon: '*', color: '#8b5cf6', desc: 'Detect conflicts and travel issues across hearings.' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h2>Clinic Dashboard</h2>
        <p>Refugee / asylum case operations · {new Date().toUTCString()}</p>
      </div>

      {err && <div className="ai-error">Stats unavailable: {err}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat"><div className="stat-label">Clients</div><div className="stat-value">{stats.clients?.total ?? '—'}</div><div className="stat-sub">{stats.clients?.active ?? 0} active · {stats.clients?.intake ?? 0} intake</div></div>
          <div className="stat"><div className="stat-label">Cases</div><div className="stat-value">{stats.cases?.total ?? '—'}</div><div className="stat-sub">{stats.cases?.open ?? 0} open · {stats.cases?.in_hearing ?? 0} in hearing</div></div>
          <div className="stat"><div className="stat-label">Hearings</div><div className="stat-value">{stats.hearings?.total ?? '—'}</div><div className="stat-sub">{stats.hearings?.scheduled ?? 0} scheduled · {stats.hearings?.continued ?? 0} continued</div></div>
          <div className="stat"><div className="stat-label">Dossiers</div><div className="stat-value">{stats.dossiers?.total ?? '—'}</div><div className="stat-sub">{stats.dossiers?.draft ?? 0} draft · {stats.dossiers?.in_review ?? 0} in review · {stats.dossiers?.final ?? 0} final</div></div>
          <div className="stat"><div className="stat-label">COI Sources</div><div className="stat-value">{stats.country_of_origin_info?.total ?? '—'}</div><div className="stat-sub">{stats.country_of_origin_info?.total_citations ?? 0} citations</div></div>
          <div className="stat"><div className="stat-label">Forms</div><div className="stat-value">{stats.immigration_forms?.total ?? '—'}</div><div className="stat-sub">{stats.immigration_forms?.filed ?? 0} filed · {stats.immigration_forms?.draft ?? 0} draft</div></div>
          <div className="stat"><div className="stat-label">Evidence</div><div className="stat-value">{stats.evidence_docs?.total ?? '—'}</div><div className="stat-sub">{stats.evidence_docs?.verified ?? 0} verified · {stats.evidence_docs?.pending ?? 0} pending</div></div>
          <div className="stat"><div className="stat-label">Experts</div><div className="stat-value">{stats.expert_witnesses?.total ?? '—'}</div><div className="stat-sub">{stats.expert_witnesses?.engaged ?? 0} engaged · {stats.expert_witnesses?.pending ?? 0} pending</div></div>

          <div className="stat"><div className="stat-label">Interpreters</div><div className="stat-value">{stats.interpreters?.total ?? '—'}</div><div className="stat-sub">{stats.interpreters?.available ?? 0} available · {stats.interpreters?.engaged ?? 0} engaged</div></div>
          <div className="stat"><div className="stat-label">Attorneys</div><div className="stat-value">{stats.attorneys?.total ?? '—'}</div><div className="stat-sub">{stats.attorneys?.active ?? 0} active</div></div>
          <div className="stat"><div className="stat-label">Paralegals</div><div className="stat-value">{stats.paralegals?.total ?? '—'}</div><div className="stat-sub">{stats.paralegals?.active ?? 0} active</div></div>
          <div className="stat"><div className="stat-label">Partner Orgs</div><div className="stat-value">{stats.partner_orgs?.total ?? '—'}</div><div className="stat-sub">{stats.partner_orgs?.active ?? 0} active</div></div>
          <div className="stat"><div className="stat-label">Grants</div><div className="stat-value">{stats.asylum_grants?.total ?? '—'}</div><div className="stat-sub">{stats.asylum_grants?.granted ?? 0} granted · {stats.asylum_grants?.pending ?? 0} pending</div></div>
          <div className="stat"><div className="stat-label">Deportations</div><div className="stat-value">{stats.deportation_orders?.total ?? '—'}</div><div className="stat-sub">{stats.deportation_orders?.on_appeal ?? 0} on appeal</div></div>
          <div className="stat"><div className="stat-label">Family</div><div className="stat-value">{stats.family_members?.total ?? '—'}</div><div className="stat-sub">{stats.family_members?.reunited ?? 0} reunited · {stats.family_members?.separated ?? 0} separated</div></div>
          <div className="stat"><div className="stat-label">Sponsors</div><div className="stat-value">{stats.sponsors?.total ?? '—'}</div><div className="stat-sub">{stats.sponsors?.active ?? 0} active</div></div>
          <div className="stat"><div className="stat-label">Calendars</div><div className="stat-value">{stats.court_calendars?.total ?? '—'}</div><div className="stat-sub">{stats.court_calendars?.open ?? 0} open</div></div>
          <div className="stat"><div className="stat-label">Audit Entries</div><div className="stat-value">{stats.audit_log?.total ?? '—'}</div><div className="stat-sub">governance log</div></div>
        </div>
      )}

      <h3 style={{ color: '#cbd5e1', margin: '8px 0 14px', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }}>Capabilities</h3>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div
            key={f.path}
            className="feature-card"
            style={{ ['--card-color']: f.color }}
            onClick={() => navigate(f.path)}
          >
            <div className="feature-card-icon" style={{ background: f.color + '22', color: f.color }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
