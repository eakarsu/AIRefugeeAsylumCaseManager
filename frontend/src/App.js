import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';

// 18 CRUD pages
import ClientsPage              from './pages/ClientsPage';
import CasesPage                from './pages/CasesPage';
import HearingsPage             from './pages/HearingsPage';
import DossiersPage             from './pages/DossiersPage';
import CountryOfOriginInfoPage  from './pages/CountryOfOriginInfoPage';
import ImmigrationFormsPage     from './pages/ImmigrationFormsPage';
import EvidenceDocsPage         from './pages/EvidenceDocsPage';
import ExpertWitnessesPage      from './pages/ExpertWitnessesPage';
import InterpretersPage         from './pages/InterpretersPage';
import AttorneysPage            from './pages/AttorneysPage';
import ParalegalsPage           from './pages/ParalegalsPage';
import PartnerOrgsPage          from './pages/PartnerOrgsPage';
import AsylumGrantsPage         from './pages/AsylumGrantsPage';
import DeportationOrdersPage    from './pages/DeportationOrdersPage';
import FamilyMembersPage        from './pages/FamilyMembersPage';
import SponsorsPage             from './pages/SponsorsPage';
import CourtCalendarsPage       from './pages/CourtCalendarsPage';
import AuditLogPage             from './pages/AuditLogPage';

// 16 AI pages
import AICoiCiteMemoPage              from './pages/AICoiCiteMemoPage';
import AIHearingPrepBriefPage         from './pages/AIHearingPrepBriefPage';
import AIEvidenceGapAnalyzePage       from './pages/AIEvidenceGapAnalyzePage';
import AIAsylumNarrativeDraftPage     from './pages/AIAsylumNarrativeDraftPage';
import AIExecutiveBriefPage           from './pages/AIExecutiveBriefPage';
import AIInterpreterMatchPage         from './pages/AIInterpreterMatchPage';
import AICountryConditionsSummaryPage from './pages/AICountryConditionsSummaryPage';
import AIDeportationReliefOptionsPage from './pages/AIDeportationReliefOptionsPage';
import AISponsorPetitionDraftPage     from './pages/AISponsorPetitionDraftPage';
import AIFamilyReunificationPlanPage  from './pages/AIFamilyReunificationPlanPage';
import AIHardshipEvidenceSuggestPage  from './pages/AIHardshipEvidenceSuggestPage';
import AIAttorneyHandoffSummaryPage   from './pages/AIAttorneyHandoffSummaryPage';
import AIRegulatoryUpdateBriefPage    from './pages/AIRegulatoryUpdateBriefPage';
import AIPartnerOrgReferralPage       from './pages/AIPartnerOrgReferralPage';
import AIDonorImpactReportPage        from './pages/AIDonorImpactReportPage';
import AICourtCalendarConflictsPage   from './pages/AICourtCalendarConflictsPage';

// Admin
import WebhooksPage from './pages/WebhooksPage';

// Custom analytics
import CustomViewsPage from './pages/CustomViewsPage';

import LoginPage from './pages/LoginPage';
import { getToken } from './services/api';

import './App.css';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function ShellRoutes() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main" style={{ padding: 0 }}>
        <Topbar />
        <div style={{ padding: '24px 32px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* 18 CRUD */}
            <Route path="/clients"                element={<ClientsPage />} />
            <Route path="/cases"                  element={<CasesPage />} />
            <Route path="/hearings"               element={<HearingsPage />} />
            <Route path="/dossiers"               element={<DossiersPage />} />
            <Route path="/country-of-origin-info" element={<CountryOfOriginInfoPage />} />
            <Route path="/immigration-forms"      element={<ImmigrationFormsPage />} />
            <Route path="/evidence-docs"          element={<EvidenceDocsPage />} />
            <Route path="/expert-witnesses"       element={<ExpertWitnessesPage />} />
            <Route path="/interpreters"           element={<InterpretersPage />} />
            <Route path="/attorneys"              element={<AttorneysPage />} />
            <Route path="/paralegals"             element={<ParalegalsPage />} />
            <Route path="/partner-orgs"           element={<PartnerOrgsPage />} />
            <Route path="/asylum-grants"          element={<AsylumGrantsPage />} />
            <Route path="/deportation-orders"     element={<DeportationOrdersPage />} />
            <Route path="/family-members"         element={<FamilyMembersPage />} />
            <Route path="/sponsors"               element={<SponsorsPage />} />
            <Route path="/court-calendars"        element={<CourtCalendarsPage />} />
            <Route path="/audit-log"              element={<AuditLogPage />} />

            {/* 16 AI */}
            <Route path="/ai/coi-cite-memo"              element={<AICoiCiteMemoPage />} />
            <Route path="/ai/hearing-prep-brief"         element={<AIHearingPrepBriefPage />} />
            <Route path="/ai/evidence-gap-analyze"       element={<AIEvidenceGapAnalyzePage />} />
            <Route path="/ai/asylum-narrative-draft"     element={<AIAsylumNarrativeDraftPage />} />
            <Route path="/ai/executive-brief"            element={<AIExecutiveBriefPage />} />
            <Route path="/ai/interpreter-match"          element={<AIInterpreterMatchPage />} />
            <Route path="/ai/country-conditions-summary" element={<AICountryConditionsSummaryPage />} />
            <Route path="/ai/deportation-relief-options" element={<AIDeportationReliefOptionsPage />} />
            <Route path="/ai/sponsor-petition-draft"     element={<AISponsorPetitionDraftPage />} />
            <Route path="/ai/family-reunification-plan"  element={<AIFamilyReunificationPlanPage />} />
            <Route path="/ai/hardship-evidence-suggest"  element={<AIHardshipEvidenceSuggestPage />} />
            <Route path="/ai/attorney-handoff-summary"   element={<AIAttorneyHandoffSummaryPage />} />
            <Route path="/ai/regulatory-update-brief"    element={<AIRegulatoryUpdateBriefPage />} />
            <Route path="/ai/partner-org-referral"       element={<AIPartnerOrgReferralPage />} />
            <Route path="/ai/donor-impact-report"        element={<AIDonorImpactReportPage />} />
            <Route path="/ai/court-calendar-conflicts"   element={<AICourtCalendarConflictsPage />} />

            <Route path="/webhooks" element={<WebhooksPage />} />

            {/* Custom analytics views */}
            <Route path="/custom-views" element={<CustomViewsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <ShellRoutes />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
