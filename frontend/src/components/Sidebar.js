import React from 'react';
import { NavLink } from 'react-router-dom';
import { logout, getStoredUser } from '../services/api';

// Sidebar menu groups for the refugee/asylum legal aid console.
// Groups follow the spec: Overview / Clients / Cases / Hearings / Evidence /
// Country Info / Family / Governance / AI Drafting / AI Analysis / Admin.

const CLIENTS_LINKS = [
  { to: '/clients', label: 'Clients' },
];

const CASES_LINKS = [
  { to: '/cases',              label: 'Cases' },
  { to: '/dossiers',           label: 'Dossiers' },
  { to: '/immigration-forms',  label: 'Immigration Forms' },
];

const HEARINGS_LINKS = [
  { to: '/hearings',         label: 'Hearings' },
  { to: '/court-calendars',  label: 'Court Calendars' },
];

const EVIDENCE_LINKS = [
  { to: '/evidence-docs',     label: 'Evidence Docs' },
  { to: '/expert-witnesses',  label: 'Expert Witnesses' },
];

const COUNTRY_INFO_LINKS = [
  { to: '/country-of-origin-info', label: 'Country of Origin Info' },
];

const FAMILY_LINKS = [
  { to: '/family-members', label: 'Family Members' },
  { to: '/sponsors',       label: 'Sponsors' },
];

const GOVERNANCE_LINKS = [
  { to: '/asylum-grants',      label: 'Asylum Grants' },
  { to: '/deportation-orders', label: 'Deportation Orders' },
  { to: '/audit-log',          label: 'Audit Log' },
  { to: '/attorneys',          label: 'Attorneys' },
  { to: '/paralegals',         label: 'Paralegals' },
  { to: '/interpreters',       label: 'Interpreters' },
  { to: '/partner-orgs',       label: 'Partner Orgs' },
];

// "AI Drafting" — generative / drafting verbs
const AI_DRAFTING_LINKS = [
  { to: '/ai/coi-cite-memo',          label: 'AI · COI Cite Memo' },
  { to: '/ai/coi-briefer-bundle',     label: 'AI · COI Briefer (Source Bundle)' },
  { to: '/ai/asylum-narrative-draft', label: 'AI · Asylum Narrative Draft' },
  { to: '/ai/declaration-redliner',   label: 'AI · Declaration Redliner' },
  { to: '/ai/hearing-prep-brief',     label: 'AI · Hearing Prep Brief' },
  { to: '/ai/hearing-qa-simulator',   label: 'AI · Hearing Q&A Simulator' },
  { to: '/ai/credible-fear-interview-prep', label: 'AI · Credible Fear Prep' },
  { to: '/ai/sponsor-petition-draft', label: 'AI · Sponsor Petition Draft' },
  { to: '/ai/attorney-handoff-summary', label: 'AI · Attorney Handoff Summary' },
  { to: '/ai/donor-impact-report',    label: 'AI · Donor Impact Report' },
  { to: '/ai/translation-helper',     label: 'AI · Translation Helper' },
];

// "AI Analysis" — analytical / classification / matching verbs
const AI_ANALYSIS_LINKS = [
  { to: '/ai/evidence-gap-analyze',       label: 'AI · Evidence Gap Analyze' },
  { to: '/ai/country-conditions-summary', label: 'AI · Country Conditions Summary' },
  { to: '/ai/deportation-relief-options', label: 'AI · Deportation Relief Options' },
  { to: '/ai/interpreter-match',          label: 'AI · Interpreter Match' },
  { to: '/ai/family-reunification-plan',  label: 'AI · Family Reunification Plan' },
  { to: '/ai/hardship-evidence-suggest',  label: 'AI · Hardship Evidence Suggest' },
  { to: '/ai/regulatory-update-brief',    label: 'AI · Regulatory Update Brief' },
  { to: '/ai/partner-org-referral',       label: 'AI · Partner Org Referral' },
  { to: '/ai/court-calendar-conflicts',   label: 'AI · Court Calendar Conflicts' },
  { to: '/ai/executive-brief',            label: 'AI · Executive Brief' },
];

// Apply pass 7 — additional tooling (non-AI)
const PASS7_TOOLS_LINKS = [
  { to: '/court-dates',    label: 'Court Dates (Scheduler)' },
  { to: '/redactions',     label: 'Document Redactions' },
  { to: '/pii-vault',      label: 'PII Vault' },
  { to: '/trauma-flags',   label: 'Trauma-Informed Flags' },
  { to: '/i18n',           label: 'i18n Bundles' },
  { to: '/external-feeds', label: 'External Feeds (EOIR/USCIS/DHS)' },
];

export default function Sidebar() {
  const user = getStoredUser();
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h1>ASYLUM CASE MANAGER</h1>
        <p>Refugee / Asylum Legal Aid</p>
      </div>

      <NavLink to="/" end>Overview</NavLink>

      <div className="sidebar-group-label">Clients</div>
      {CLIENTS_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">Cases</div>
      {CASES_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">Hearings</div>
      {HEARINGS_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">Evidence</div>
      {EVIDENCE_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">Country Info</div>
      {COUNTRY_INFO_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">Family</div>
      {FAMILY_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">Governance</div>
      {GOVERNANCE_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">AI Drafting</div>
      {AI_DRAFTING_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">AI Analysis</div>
      {AI_ANALYSIS_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">Analytics</div>
      <NavLink to="/custom-views">Case Analytics</NavLink>

      <div className="sidebar-group-label">Tools</div>
      {PASS7_TOOLS_LINKS.map((l) => (<NavLink key={l.to} to={l.to}>{l.label}</NavLink>))}

      <div className="sidebar-group-label">Benefits Eligibility</div>
      <NavLink to="/benefits/medicaid-eligibility">Medicaid Eligibility</NavLink>
      <NavLink to="/benefits/snap-eligibility">SNAP Eligibility</NavLink>
      <NavLink to="/benefits/ssi-ssdi-eligibility">SSI / SSDI Eligibility</NavLink>
      <NavLink to="/benefits/tanf-calc">TANF Calculator</NavLink>
      <NavLink to="/benefits/income-verification">Income Verification</NavLink>
      <NavLink to="/benefits/asset-tests">Asset Tests</NavLink>
      <NavLink to="/benefits/household-composition">Household Composition</NavLink>
      <NavLink to="/benefits/notice-generation">Notice Generation</NavLink>
      <NavLink to="/benefits/appeals-workflow">Appeals Workflow</NavLink>

      <div className="sidebar-group-label">Admin</div>
      <NavLink to="/webhooks">Webhooks</NavLink>

      <div className="sidebar-user">
        {user && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || user.email}</div>
            <div className="sidebar-user-role">{user.role || 'user'}</div>
          </div>
        )}
        <button className="btn secondary sidebar-logout" onClick={logout}>Sign Out</button>
      </div>
    </nav>
  );
}
