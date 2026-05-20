const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ai = require('../services/ai');

async function record(feature, input, output) {
  try {
    await pool.query(
      'INSERT INTO ai_results (feature, input, output) VALUES ($1, $2, $3)',
      [feature, input || {}, output || {}]
    );
  } catch (e) {
    console.warn(`[ai] failed to record ${feature}:`, e.message);
  }
}

// ──────────────────────────────────────────────────────────────
// Sample fills — realistic refugee/asylum tabletop scenarios.
// Returned values map 1:1 to the field `key`s used by the
// frontend AI page components (see frontend/src/pages/AI*Page.js).
// ──────────────────────────────────────────────────────────────
const SAMPLES = {
  'coi-cite-memo': [
    {
      label: 'Honduras — gang-based persecution of women',
      values: {
        country: 'Honduras',
        claim_basis: 'Particular social group: Honduran women unable to leave abusive intra-family relationship with MS-13 affiliation.',
        notes: 'Female Honduran asylum seeker, gang-based persecution. Need COI on state failure to protect women from gang/intimate-partner violence.',
      },
    },
    {
      label: 'Syria — Alawite/Sunni religious persecution',
      values: {
        country: 'Syria',
        claim_basis: 'Religion — Sunni Muslim from minority enclave in Latakia governorate facing reprisals by pro-regime militias.',
        notes: 'Need COI on Alawite/Sunni dynamics, post-Assad reprisal patterns 2024-2026.',
      },
    },
    {
      label: 'Eritrea — indefinite military conscription',
      values: {
        country: 'Eritrea',
        claim_basis: 'Political opinion (imputed) — refusal of indefinite Sawa national service.',
        notes: 'Need COI on indefinite conscription, Giffa round-ups, and treatment of deserters / returnees.',
      },
    },
    {
      label: 'Iran — Baha\'i religious persecution',
      values: {
        country: 'Iran',
        claim_basis: 'Religion — Baha\'i faith; client\'s university expulsion and family property seizure.',
        notes: 'COI on systematic Baha\'i persecution, Yarsan, and recent post-Mahsa Amini crackdowns.',
      },
    },
    {
      label: 'Myanmar — Rohingya statelessness',
      values: {
        country: 'Myanmar',
        claim_basis: 'Race / nationality — Rohingya Muslim from Rakhine State; targeted by Tatmadaw clearance ops.',
        notes: 'COI on Tatmadaw post-coup operations 2024-2026 and Rohingya statelessness under 1982 Citizenship Law.',
      },
    },
  ],

  'hearing-prep-brief': [
    {
      label: 'Defensive merits hearing — Syrian client',
      values: {
        case_summary: 'Syrian Sunni client, age 41, fled Latakia in 2024 after pro-regime militia detained brother. Defensive merits hearing in 6 weeks at NY Immigration Court before Hon. R. Singh. I-589 filed Mar 2026.',
        court: 'New York Immigration Court',
        judge: 'Hon. R. Singh',
        date: '2026-06-12',
      },
    },
    {
      label: 'Asylum office interview — Honduran woman',
      values: {
        case_summary: 'Honduran woman age 33, single mother, fleeing MS-13 extortion + IPV. Affirmative I-589 filed Apr 2026. Asylum office interview at USCIS Newark in 4 weeks.',
        court: 'USCIS Newark Asylum Office',
        judge: 'Asylum Officer 7723',
        date: '2026-05-15',
      },
    },
    {
      label: 'BIA oral argument — DRC client',
      values: {
        case_summary: 'DRC client denied at IJ; BIA appeal on whether IJ erred in PSG analysis and credibility finding. Oral argument granted.',
        court: 'Board of Immigration Appeals',
        judge: 'Hon. T. Williams',
        date: '2026-07-15',
      },
    },
    {
      label: 'Withholding-only — Somali client',
      values: {
        case_summary: 'Somali client with prior order of removal; reasonable-fear screening passed; withholding-only hearing in San Francisco IC. Al-Shabaab persecution.',
        court: 'San Francisco Immigration Court',
        judge: 'Hon. L. Martinez',
        date: '2026-05-28',
      },
    },
    {
      label: 'TPS denial appeal — Ukrainian',
      values: {
        case_summary: 'Ukrainian TPS re-registration denied for criminal-bar concern; client contests prior conviction characterization.',
        court: 'Administrative Appeals Office',
        judge: 'AAO panel',
        date: '2026-06-30',
      },
    },
  ],

  'evidence-gap-analyze': [
    {
      label: 'Honduran IPV claim — early stage',
      values: {
        claim: 'Particular social group — Honduran women unable to leave abusive intra-family relationship; failed state protection; nexus to gender + family.',
        existing_evidence_text: 'Client declaration draft v0.3; one denuncia from PNH dated 2024; mother\'s affidavit by phone. No medical records yet.',
      },
    },
    {
      label: 'Syrian religion-based — moderate stage',
      values: {
        claim: 'Religion — Sunni Muslim from Latakia, persecution by pro-regime Alawite militia.',
        existing_evidence_text: 'I-589 filed; client declaration v1.2; brother\'s death certificate; one photo of damaged home; HRW excerpt 2024.',
      },
    },
    {
      label: 'Tibetan religious — late stage',
      values: {
        claim: 'Religion / political opinion — Tibetan Buddhist nun fled Lhasa after 2024 monastery raid.',
        existing_evidence_text: 'Full I-589 declaration; passport pages; 6 photos of Lhasa protest; expert report by Dr. Sonam Choedon; nun ordination certificate; ICT report excerpt.',
      },
    },
    {
      label: 'Eritrean conscription — early stage',
      values: {
        claim: 'Political opinion (imputed) — Eritrean deserter from Sawa indefinite national service.',
        existing_evidence_text: 'Client narrative draft v0.2; ID card photo; no documentary evidence yet.',
      },
    },
    {
      label: 'Iranian Baha\'i — moderate stage',
      values: {
        claim: 'Religion — Iranian Baha\'i, expelled from Tehran University, family property seized.',
        existing_evidence_text: 'I-589 filed; family birth certificates; university expulsion notice; UN Special Rapporteur excerpt; one photo of sealed shop.',
      },
    },
  ],

  'asylum-narrative-draft': [
    {
      label: 'Honduran woman — gang persecution + IPV',
      values: {
        client_facts: 'Female, 33, from Tegucigalpa. From age 19 in a relationship with a man who joined MS-13. He physically abused her for 8 years. When she tried to leave, gang surveilled her workplace. Police denuncia refused twice. Fled with 7-year-old daughter Sofia in Feb 2026.',
        persecution_basis: 'Particular social group: Honduran women unable to leave abusive intra-family relationship + gender + nuclear family.',
        notes: 'Female Honduran asylum seeker, gang-based persecution. Sensitive: domestic violence, trauma.',
      },
    },
    {
      label: 'Syrian Sunni — religion + political opinion',
      values: {
        client_facts: 'Male, 41, Sunni Muslim from village near Latakia. Younger brother detained in 2023 by pro-regime militia and killed. Client publicly criticized regime on social media; received threats; home raided; fled to Lebanon then US.',
        persecution_basis: 'Religion (Sunni Muslim in Alawite-dominant area) + imputed political opinion.',
        notes: 'Has medical records of injury from 2023 detention; brother\'s death certificate.',
      },
    },
    {
      label: 'Tibetan Buddhist nun — religion',
      values: {
        client_facts: 'Female, 38, ordained Tibetan Buddhist nun from monastery near Lhasa. Monastery raided by PSB in 2024; monks detained; client escaped via Nepal route. PRC authorities visited family demanding her return.',
        persecution_basis: 'Religion — Tibetan Buddhism; political opinion imputed by association with Dalai Lama-aligned monastery.',
        notes: 'Highly photographed protest activity 2014.',
      },
    },
    {
      label: 'DRC client — ethnic violence in Goma',
      values: {
        client_facts: 'Male, 44, ethnic Hutu from Goma, eastern DRC. M23-affiliated militia targeted family business in 2024; brother killed; client beaten and forced to flee. Witnessed government forces refuse to intervene.',
        persecution_basis: 'Race / ethnicity (Hutu) + particular social group (returned diaspora businessman).',
        notes: 'Client has scars; one HRW report supports area-specific violence pattern.',
      },
    },
    {
      label: 'Iranian Baha\'i — religion',
      values: {
        client_facts: 'Female, 37, born to Baha\'i family in Tehran. Expelled from Tehran University in Year 2 (2008) under regime\'s Baha\'i ban. Family shop sealed in 2022. Sister jailed for 4 years in Evin. Client fled via Türkiye in 2026.',
        persecution_basis: 'Religion — Baha\'i faith.',
        notes: 'Documentation includes expulsion letter, sealed shop photo.',
      },
    },
  ],

  'executive-brief': [
    { label: 'Default snapshot — no bias', values: { notes: '' } },
    { label: 'Focus on upcoming hearings 7d', values: { notes: 'Bias the brief toward upcoming hearings in the next 7 days and prep readiness.' } },
    { label: 'Focus on intake pipeline',     values: { notes: 'Bias toward intake pipeline health, waitlist, capacity to take new clients.' } },
    { label: 'Focus on appeals + BIA',       values: { notes: 'Bias toward BIA appeals, federal circuit petitions, and pending stays of removal.' } },
    { label: 'Focus on funder reporting',    values: { notes: 'Bias toward funder-reportable metrics: grants this quarter, cases closed, COI library growth.' } },
  ],

  'interpreter-match': [
    {
      label: 'Honduran K\'iche\'-speaking client',
      values: {
        client_country: 'Honduras',
        client_languages: 'Spanish (limited), K\'iche\' (preferred)',
        case_sensitivities: 'IPV / gang persecution; female client; female interpreter strongly preferred.',
      },
    },
    {
      label: 'Syrian Levantine Arabic client',
      values: {
        client_country: 'Syria',
        client_languages: 'Arabic (Levantine), some French',
        case_sensitivities: 'Religion-based; male client; no Alawite political affiliation in interpreter background preferred.',
      },
    },
    {
      label: 'Somali client — clan-sensitive',
      values: {
        client_country: 'Somalia',
        client_languages: 'Somali, some Swahili, English',
        case_sensitivities: 'Clan persecution; interpreter must NOT be from rival clan; female interpreter required.',
      },
    },
    {
      label: 'Tibetan client — Lhasa dialect',
      values: {
        client_country: 'Tibet (PRC)',
        client_languages: 'Tibetan (Lhasa dialect); some Mandarin',
        case_sensitivities: 'Religious persecution; interpreter must be PRC-government-free.',
      },
    },
    {
      label: 'Ukrainian client — Russophone caution',
      values: {
        client_country: 'Ukraine',
        client_languages: 'Ukrainian (preferred), Russian (acceptable but sensitive)',
        case_sensitivities: 'Client lost family to Russian shelling; prefers Ukrainian-only interpretation.',
      },
    },
  ],

  'country-conditions-summary': [
    { label: 'Honduras 2024-2026',    values: { country: 'Honduras',    period: '2024-2026', notes: '' } },
    { label: 'Syria 2023-2026',       values: { country: 'Syria',       period: '2023-2026', notes: '' } },
    { label: 'Iran 2022-2026',        values: { country: 'Iran',        period: '2022-2026', notes: '' } },
    { label: 'Eritrea 2021-2026',     values: { country: 'Eritrea',     period: '2021-2026', notes: '' } },
    { label: 'Myanmar 2022-2026',     values: { country: 'Myanmar',     period: '2022-2026', notes: '' } },
  ],

  'deportation-relief-options': [
    {
      label: 'Long-resident LPR — minor crim conviction',
      values: {
        client_facts: 'LPR for 12 years from Mexico; recent CIMT conviction (theft) deemed deportable. US-citizen spouse and two USC children. No prior immigration violations.',
        current_status: 'LPR, in removal proceedings under INA 237(a)(2)(A)(i).',
        notes: 'Looking at cancellation of removal for LPR + 212(h) waiver.',
      },
    },
    {
      label: 'Asylum seeker with final order',
      values: {
        client_facts: 'Syrian client with final removal order from 2024; conditions in Syria have changed; new evidence of persecution available.',
        current_status: 'Final order of removal; not yet executed.',
        notes: 'Considering motion to reopen, withholding-only proceedings.',
      },
    },
    {
      label: 'Honduran with USC child',
      values: {
        client_facts: 'Honduran woman, 10 years US presence, USC daughter age 7 with severe asthma. Strong community ties. No criminal record.',
        current_status: 'NTA served; pending Master Calendar.',
        notes: 'Cancellation of removal for non-LPR (10-year) primary candidate.',
      },
    },
    {
      label: 'Afghan SIV-eligible',
      values: {
        client_facts: 'Afghan former US Army translator; entered on humanitarian parole 2021; parole expiring; SIV petition pending.',
        current_status: 'Parolee, parole expires in 90 days.',
        notes: 'SIV adjustment + parole re-extension + asylum as alternative.',
      },
    },
    {
      label: 'Ukrainian U4U beneficiary',
      values: {
        client_facts: 'Ukrainian beneficiary of Uniting for Ukraine, parole expiring; sponsor still committed; TPS Ukraine designation active.',
        current_status: 'Parolee; parole expiring in 60 days.',
        notes: 'TPS Ukraine + parole re-parole + adjustment if eligible.',
      },
    },
  ],

  'sponsor-petition-draft': [
    {
      label: 'Welcome Corps — Ukrainian family',
      values: {
        beneficiary_text: 'Olena Kovalenko (CLI-2026-0007), 30, Ukrainian, currently in Poland with 4-year-old daughter Anastasia.',
        sponsor_text: 'Razom for Ukraine + private sponsor circle of 7 in Chicago, IL.',
        program: 'Welcome Corps (Private Sponsorship of Refugees)',
        notes: 'Sponsor circle has secured 12-month housing in Logan Square.',
      },
    },
    {
      label: 'I-134 humanitarian parole — Sudanese',
      values: {
        beneficiary_text: 'Sudanese family of 5, currently in N\'Djamena, Chad; mother is sister of US citizen.',
        sponsor_text: 'US citizen sister, RN, income $94k, Brooklyn, NY.',
        program: 'I-134A — Uniting for Sudanese',
        notes: 'Sponsor has 3-bedroom apartment, can house family of 5.',
      },
    },
    {
      label: 'I-134A CHNV — Venezuelan',
      values: {
        beneficiary_text: 'Venezuelan couple, ages 28 and 30, currently in Cúcuta, Colombia.',
        sponsor_text: 'Venezuelan-American sponsor in Miami, FL; income $82k; LPR.',
        program: 'CHNV parole process (Cuba, Haiti, Nicaragua, Venezuela)',
        notes: 'Sponsor is cousin; documentation of relationship available.',
      },
    },
    {
      label: 'Welcome Corps — Afghan',
      values: {
        beneficiary_text: 'Afghan family of 6, former US military interpreter household, currently in Doha, Qatar.',
        sponsor_text: 'Episcopal church sponsor circle of 10 in Boston, MA.',
        program: 'Welcome Corps (Afghan-focused track)',
        notes: 'Circle includes 2 attorneys, 1 ESL teacher.',
      },
    },
    {
      label: 'P-3 follow-to-join — Eritrean',
      values: {
        beneficiary_text: 'Eritrean sister and her 3 children, currently in Adi-Harush refugee camp, Ethiopia.',
        sponsor_text: 'Principal refugee (already granted asylum in US 2024), Seattle, WA.',
        program: 'P-3 Family Reunification + I-730 Follow-to-Join',
        notes: 'Principal has stable employment, lease, and savings.',
      },
    },
  ],

  'family-reunification-plan': [
    {
      label: 'Honduran principal — spouse and child',
      values: {
        principal_text: 'CLI-2026-0001 Maria Hernandez Lopez, Honduras, asylum pending; daughter Sofia age 7 with her in Houston.',
        members_text: 'Spouse Luis Hernandez, in hiding in San Pedro Sula. No other dependents.',
        notes: 'Once asylum granted, file I-730 for spouse; no kids to add (Sofia already present).',
      },
    },
    {
      label: 'Syrian principal — spouse + son in Amman',
      values: {
        principal_text: 'CLI-2026-0002 Ahmad al-Hariri, Syria, defensive asylum pending.',
        members_text: 'Spouse Layla al-Hariri (in Amman Jordan refugee camp); son Tariq age 11.',
        notes: 'Plan for I-730 once asylum granted; consider Welcome Corps in parallel.',
      },
    },
    {
      label: 'Tibetan principal — brother in Dharamsala',
      values: {
        principal_text: 'CLI-2026-0006 Tenzin Norbu, Tibetan Buddhist nun, defensive asylum pending.',
        members_text: 'Brother Lobsang in Dharamsala, India (in exile); no other family in PRC.',
        notes: 'Adult sibling not I-730 eligible; consider P-3 if/when she gets asylum, or family-based petition once LPR.',
      },
    },
    {
      label: 'Ukrainian principal — child + grandparents',
      values: {
        principal_text: 'CLI-2026-0007 Olena Kovalenko, Ukrainian, TPS-eligible, U4U sponsor present.',
        members_text: 'Daughter Anastasia age 4 in Lviv with maternal grandparents; grandparents not target for relocation.',
        notes: 'I-730 if asylum granted; Welcome Corps for child via Polish processing site.',
      },
    },
    {
      label: 'Eritrean principal — sister + nieces',
      values: {
        principal_text: 'CLI-2026-0013 Bashir Abdullahi, Eritrea, withholding granted Feb 2026.',
        members_text: 'Sister Berhane in Khartoum refugee camp with 2 minor children (8, 11). Spouse deceased.',
        notes: 'Withholding does NOT confer derivative status; P-3 + private sponsorship the realistic path.',
      },
    },
  ],

  'hardship-evidence-suggest': [
    {
      label: 'I-601A — Honduran client w/ USC child',
      values: {
        client_facts: 'Honduran client, 10 years US presence; USC daughter age 7 with severe asthma requiring specialist care; client is primary caretaker; husband disabled.',
        relief_type: 'I-601A Extreme Hardship Waiver',
        notes: 'Hardship to USC daughter and disabled US-citizen husband.',
      },
    },
    {
      label: 'Cancellation of removal — non-LPR',
      values: {
        client_facts: '12 years US presence; 3 USC children, one with autism; client is sole income earner; sister-in-law receives kidney dialysis.',
        relief_type: 'Cancellation of removal for non-LPR (INA 240A(b))',
        notes: 'Need to develop exceptional and extremely unusual hardship for 3 USC children.',
      },
    },
    {
      label: 'Cancellation for LPR — exclusivity issues',
      values: {
        client_facts: 'LPR 15 years; conviction for minor controlled-substance offense; USC spouse with PTSD from prior trauma; two USC children.',
        relief_type: 'Cancellation of removal for LPR (INA 240A(a))',
        notes: 'Focus on hardship + favorable discretion balance.',
      },
    },
    {
      label: 'Humanitarian asylum — past persecution only',
      values: {
        client_facts: 'Past persecution conceded by IJ; AG argues changed country conditions; client suffered torture; severe ongoing PTSD; family killed.',
        relief_type: 'Humanitarian asylum (8 CFR 208.13(b)(1)(iii))',
        notes: 'Establishing other serious harm + severity of past persecution.',
      },
    },
    {
      label: 'VAWA self-petition — H-1B spouse',
      values: {
        client_facts: 'H-4 spouse of H-1B; documented domestic abuse; medical records; police reports; spouse threatening to revoke status.',
        relief_type: 'VAWA self-petition (I-360)',
        notes: 'Battery / extreme cruelty narrative + good faith marriage.',
      },
    },
  ],

  'attorney-handoff-summary': [
    {
      label: 'Sarah Chen → Marcus Goldberg (Syrian case)',
      values: {
        case_summary: 'CAS-2026-0002 — Syrian defensive asylum, IH scheduled 2026-06-12. Heavy expert evidence; 41-document dossier; one continued hearing.',
        outgoing_notes: 'Client is shy, needs interpreter (Arabic Levantine), prefers female interpreter for medical exhibits. Brother\'s death cert in dossier v2.1 tab 14.',
      },
    },
    {
      label: 'On-leave coverage handoff',
      values: {
        case_summary: 'CAS-2026-0014 — Myanmar Rohingya defensive asylum; Master Calendar in 4 weeks.',
        outgoing_notes: 'Lead attorney out for medical leave 8 weeks. Paralegal Thiri Aye on case, can do most filings. Client interview transcripts in dossier tab 6.',
      },
    },
    {
      label: 'Pro bono → staff attorney handoff',
      values: {
        case_summary: 'CAS-2026-0011 — Guatemalan defensive asylum; pro bono firm transferring to clinic staff for the merits hearing.',
        outgoing_notes: 'I-589 filed by pro bono; need to complete COI binder + expert witness. Client has language sensitivities (Mam, not Spanish).',
      },
    },
    {
      label: 'Federal court counsel handoff',
      values: {
        case_summary: 'CAS-2026-0008 — DRC case; BIA denied; petition for review filed in 2d Circuit.',
        outgoing_notes: 'Clinic does not handle Circuit Court; transferring to academic clinic. Record on appeal indexed in dossier v3.0 tab 32.',
      },
    },
    {
      label: 'Departing summer fellow handoff',
      values: {
        case_summary: 'CAS-2026-0001 — Honduran affirmative asylum, interview May 15.',
        outgoing_notes: 'Summer fellow Maria did intake and declaration v1.3 draft. Client communicates by WhatsApp only. Phone in client record.',
      },
    },
  ],

  'regulatory-update-brief': [
    {
      label: 'Asylum bar / inadmissibility (US, 2026)',
      values: { topic: 'asylum bar and inadmissibility rules', jurisdiction: 'US', notes: '' },
    },
    {
      label: 'TPS designations rolling updates',
      values: { topic: 'TPS designations and re-registration', jurisdiction: 'US', notes: 'Focus on Ukraine, Syria, Venezuela, Haiti.' },
    },
    {
      label: 'CBP/USCIS asylum interview policy',
      values: { topic: 'asylum officer interview procedures and credible-fear', jurisdiction: 'US', notes: '' },
    },
    {
      label: 'BIA / 9th Circuit case law digest',
      values: { topic: 'BIA precedent and 9th Circuit immigration decisions', jurisdiction: 'US — 9th Cir.', notes: '' },
    },
    {
      label: 'Welcome Corps + private sponsorship',
      values: { topic: 'Welcome Corps and private refugee sponsorship', jurisdiction: 'US', notes: '' },
    },
  ],

  'partner-org-referral': [
    {
      label: 'Honduran IPV — wraparound services',
      values: {
        client_country: 'Honduras',
        client_need: 'Wraparound services: domestic violence shelter, child care during hearings, trauma counseling.',
        notes: 'Female asylum seeker w/ 7-year-old daughter; Houston, TX area.',
      },
    },
    {
      label: 'Afghan SIV — resettlement support',
      values: {
        client_country: 'Afghanistan',
        client_need: 'Resettlement assistance: ESL classes, employment placement, cultural orientation.',
        notes: 'Recently arrived SIV family of 5; northern Virginia.',
      },
    },
    {
      label: 'Ukrainian U4U — beyond legal',
      values: {
        client_country: 'Ukraine',
        client_need: 'Ukrainian-language mental health services and sponsor matching.',
        notes: 'Client + 4-year-old daughter recently arrived to Chicago, IL.',
      },
    },
    {
      label: 'Rohingya client — community connections',
      values: {
        client_country: 'Myanmar',
        client_need: 'Connection to Rohingya community in US for mutual aid and community support.',
        notes: 'Single male client, recently released from ICE custody.',
      },
    },
    {
      label: 'LGBTQ+ Iranian — affinity org referral',
      values: {
        client_country: 'Iran',
        client_need: 'LGBTQ+ affinity organization, safe housing, queer-affirming therapy.',
        notes: 'Asylum claim on sexual orientation; client may need name change support.',
      },
    },
  ],

  'donor-impact-report': [
    { label: 'Q1 2026 — major donors', values: { period: 'Q1 2026', audience: 'major_donors', notes: '' } },
    { label: 'Q1 2026 — board meeting', values: { period: 'Q1 2026', audience: 'board_meeting', notes: '' } },
    { label: 'Q1 2026 — foundation grant', values: { period: 'Q1 2026', audience: 'foundation_grant_report', notes: 'For Ford Foundation 2026 cycle.' } },
    { label: 'Annual 2025 wrap-up',      values: { period: 'Annual 2025', audience: 'newsletter', notes: '' } },
    { label: 'Mid-year 2026 — public',   values: { period: 'Mid-year 2026', audience: 'public_donors', notes: '' } },
  ],

  'court-calendar-conflicts': [
    {
      label: 'Sarah Chen — May–Jun 2026',
      values: { attorney_id: 'ATT-001', window: '2026-05-15 to 2026-06-30', notes: '' },
    },
    {
      label: 'Marcus Goldberg — Jun–Jul 2026',
      values: { attorney_id: 'ATT-002', window: '2026-06-01 to 2026-07-31', notes: '' },
    },
    {
      label: 'Priya Raman — May–Jul 2026',
      values: { attorney_id: 'ATT-003', window: '2026-05-15 to 2026-07-15', notes: '' },
    },
    {
      label: 'David Okonkwo — Jun–Aug 2026',
      values: { attorney_id: 'ATT-004', window: '2026-06-01 to 2026-08-31', notes: '' },
    },
    {
      label: 'All courts conflict scan — Jun 2026',
      values: { attorney_id: 'ALL', window: '2026-06-01 to 2026-06-30', notes: 'Cross-attorney sweep' },
    },
  ],
};

// GET /api/ai/samples?feature=<verb>
router.get('/samples', (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    if (!feature) return res.json({ features: Object.keys(SAMPLES) });
    const samples = SAMPLES[feature];
    if (!samples) return res.status(404).json({ error: `unknown feature: ${feature}` });
    res.json({ feature, samples });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ai/history
router.get('/history', async (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);
    let r;
    if (feature) {
      r = await pool.query(
        'SELECT id, feature, input, output, created_at FROM ai_results WHERE feature = $1 ORDER BY created_at DESC LIMIT $2',
        [feature, limit]
      );
    } else {
      r = await pool.query(
        'SELECT id, feature, input, output, created_at FROM ai_results ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/coi-cite-memo
router.post('/coi-cite-memo', async (req, res) => {
  try {
    const { country, claim_basis, context } = req.body || {};
    if (!country) {
      // accept empty body — use a sensible default for smoke tests
      const result = await ai.coiCiteMemo('Honduras', 'PSG — Honduran women unable to leave abusive intra-family relationship', context || {});
      await record('coi-cite-memo', { country: 'Honduras (default)', claim_basis: '(default)' }, result);
      return res.json(result);
    }
    const result = await ai.coiCiteMemo(country, claim_basis || '', context || {});
    await record('coi-cite-memo', { country, claim_basis }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/hearing-prep-brief
router.post('/hearing-prep-brief', async (req, res) => {
  try {
    const { case_summary, hearing } = req.body || {};
    if (!case_summary) return res.status(400).json({ error: 'case_summary is required' });
    const result = await ai.hearingPrepBrief(case_summary, hearing || {});
    await record('hearing-prep-brief', { case_summary, hearing }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/evidence-gap-analyze
router.post('/evidence-gap-analyze', async (req, res) => {
  try {
    const { claim, existing_evidence } = req.body || {};
    if (!claim) return res.status(400).json({ error: 'claim is required' });
    const evList = Array.isArray(existing_evidence)
      ? existing_evidence
      : (existing_evidence ? [{ note: String(existing_evidence) }] : []);
    const result = await ai.evidenceGapAnalyze(claim, evList);
    await record('evidence-gap-analyze', { claim, count: evList.length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/asylum-narrative-draft
router.post('/asylum-narrative-draft', async (req, res) => {
  try {
    const { client_facts, persecution_basis, context } = req.body || {};
    if (!client_facts) return res.status(400).json({ error: 'client_facts is required' });
    const result = await ai.asylumNarrativeDraft(client_facts, persecution_basis || '', context || {});
    await record('asylum-narrative-draft', { client_facts, persecution_basis }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/executive-brief
router.post('/executive-brief', async (req, res) => {
  try {
    const [clients, cases, hearings, dossiers, grants, deportations] = await Promise.all([
      pool.query("SELECT COUNT(*) FILTER (WHERE status='active') AS active, COUNT(*) FILTER (WHERE status='intake') AS intake, COUNT(*) AS total FROM clients"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='in_hearing') AS in_hearing, COUNT(*) FILTER (WHERE status='appeal_pending') AS appeal_pending, COUNT(*) AS total FROM cases"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='scheduled') AS scheduled, COUNT(*) FILTER (WHERE status='continued') AS continued, COUNT(*) AS total FROM hearings"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='draft') AS draft, COUNT(*) FILTER (WHERE status='in_review') AS in_review, COUNT(*) FILTER (WHERE status='final') AS final, COUNT(*) AS total FROM dossiers"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='granted') AS granted, COUNT(*) FILTER (WHERE status='denied') AS denied, COUNT(*) FILTER (WHERE status='pending') AS pending, COUNT(*) AS total FROM asylum_grants"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='on_appeal') AS on_appeal, COUNT(*) FILTER (WHERE status='final') AS final, COUNT(*) AS total FROM deportation_orders"),
    ]);
    const snapshot = {
      clients: clients.rows[0],
      cases: cases.rows[0],
      hearings: hearings.rows[0],
      dossiers: dossiers.rows[0],
      asylum_grants: grants.rows[0],
      deportation_orders: deportations.rows[0],
      ...(req.body?.notes ? { notes: req.body.notes } : {}),
    };
    const result = await ai.executiveBrief(snapshot);
    const out = { snapshot, brief: result };
    await record('executive-brief', { notes: req.body?.notes || null }, out);
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/interpreter-match
router.post('/interpreter-match', async (req, res) => {
  try {
    const { client, candidates } = req.body || {};
    let clientObj = client;
    let cands = candidates;
    if (!clientObj) {
      // Build a default client object from posted fields if AI page is using flat keys
      clientObj = {
        country: req.body?.client_country || '',
        languages: req.body?.client_languages || '',
        case_sensitivities: req.body?.case_sensitivities || '',
      };
    }
    if (!Array.isArray(cands) || cands.length === 0) {
      const r = await pool.query('SELECT * FROM interpreters WHERE status = $1 ORDER BY id ASC LIMIT 50', ['available']);
      cands = r.rows;
    }
    const result = await ai.interpreterMatch(clientObj, cands);
    await record('interpreter-match', { client: clientObj, candidates_count: cands.length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/country-conditions-summary
router.post('/country-conditions-summary', async (req, res) => {
  try {
    const { country, period, context } = req.body || {};
    if (!country) return res.status(400).json({ error: 'country is required' });
    const result = await ai.countryConditionsSummary(country, period || 'current', context || {});
    await record('country-conditions-summary', { country, period }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/deportation-relief-options
router.post('/deportation-relief-options', async (req, res) => {
  try {
    const { client_facts, current_status, context } = req.body || {};
    if (!client_facts) return res.status(400).json({ error: 'client_facts is required' });
    const result = await ai.deportationReliefOptions(client_facts, current_status || 'unknown', context || {});
    await record('deportation-relief-options', { client_facts, current_status }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/sponsor-petition-draft
router.post('/sponsor-petition-draft', async (req, res) => {
  try {
    const { beneficiary, sponsor, program, context } = req.body || {};
    if (!beneficiary && !req.body?.beneficiary_text) {
      return res.status(400).json({ error: 'beneficiary (or beneficiary_text) is required' });
    }
    const ben = beneficiary || { text: req.body.beneficiary_text };
    const spn = sponsor || { text: req.body.sponsor_text };
    const result = await ai.sponsorPetitionDraft(ben, spn, program || 'I-134A', context || {});
    await record('sponsor-petition-draft', { beneficiary: ben, sponsor: spn, program }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/family-reunification-plan
router.post('/family-reunification-plan', async (req, res) => {
  try {
    const { principal, members, context } = req.body || {};
    const prin = principal || { text: req.body?.principal_text || '' };
    let mem = members;
    if (!mem) {
      const txt = req.body?.members_text;
      mem = txt ? [{ text: txt }] : [];
    }
    if (!prin || (!prin.text && !prin.full_name && !prin.client_id)) {
      return res.status(400).json({ error: 'principal (or principal_text) is required' });
    }
    const result = await ai.familyReunificationPlan(prin, mem, context || {});
    await record('family-reunification-plan', { principal: prin, members_count: Array.isArray(mem) ? mem.length : 0 }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/hardship-evidence-suggest
router.post('/hardship-evidence-suggest', async (req, res) => {
  try {
    const { client_facts, relief_type, context } = req.body || {};
    if (!client_facts) return res.status(400).json({ error: 'client_facts is required' });
    const result = await ai.hardshipEvidenceSuggest(client_facts, relief_type || 'general hardship', context || {});
    await record('hardship-evidence-suggest', { client_facts, relief_type }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/attorney-handoff-summary
router.post('/attorney-handoff-summary', async (req, res) => {
  try {
    const { case_record, case_summary, outgoing_notes } = req.body || {};
    const rec = case_record || (case_summary ? { summary: case_summary } : null);
    if (!rec) return res.status(400).json({ error: 'case_record (or case_summary) is required' });
    const result = await ai.attorneyHandoffSummary(rec, outgoing_notes || '');
    await record('attorney-handoff-summary', { case: rec }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/regulatory-update-brief
router.post('/regulatory-update-brief', async (req, res) => {
  try {
    const { topic, jurisdiction, context } = req.body || {};
    if (!topic) return res.status(400).json({ error: 'topic is required' });
    const result = await ai.regulatoryUpdateBrief(topic, jurisdiction || 'US', context || {});
    await record('regulatory-update-brief', { topic, jurisdiction }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/partner-org-referral
router.post('/partner-org-referral', async (req, res) => {
  try {
    const { client, need, candidates } = req.body || {};
    let clientObj = client || {
      country: req.body?.client_country || '',
      notes: req.body?.notes || '',
    };
    const n = need || req.body?.client_need;
    if (!n) return res.status(400).json({ error: 'need (or client_need) is required' });
    let cands = candidates;
    if (!Array.isArray(cands) || cands.length === 0) {
      const r = await pool.query('SELECT * FROM partner_orgs WHERE status = $1 ORDER BY id ASC LIMIT 50', ['active']);
      cands = r.rows;
    }
    const result = await ai.partnerOrgReferral(clientObj, n, cands);
    await record('partner-org-referral', { client: clientObj, need: n, candidate_count: cands.length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/donor-impact-report
router.post('/donor-impact-report', async (req, res) => {
  try {
    const { period, metrics, audience } = req.body || {};
    let m = metrics || {};
    if (!Object.keys(m).length) {
      // Build a default metrics snapshot
      const [clients, cases, grants] = await Promise.all([
        pool.query('SELECT COUNT(*) AS n FROM clients'),
        pool.query('SELECT COUNT(*) AS n FROM cases'),
        pool.query("SELECT COUNT(*) FILTER (WHERE status='granted') AS granted, COUNT(*) AS total FROM asylum_grants"),
      ]);
      m = {
        active_clients: Number(clients.rows[0].n),
        total_cases: Number(cases.rows[0].n),
        grants_secured: Number(grants.rows[0].granted),
        grants_filed: Number(grants.rows[0].total),
      };
    }
    const result = await ai.donorImpactReport(period || 'current_quarter', m, audience || 'major_donors');
    await record('donor-impact-report', { period, audience, metrics: m }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/court-calendar-conflicts
router.post('/court-calendar-conflicts', async (req, res) => {
  try {
    const { attorney_id, window, calendar_rows } = req.body || {};
    if (!attorney_id) return res.status(400).json({ error: 'attorney_id is required' });
    let rows = calendar_rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      const r = await pool.query('SELECT * FROM hearings ORDER BY date ASC LIMIT 50');
      rows = r.rows;
    }
    const result = await ai.courtCalendarConflicts(attorney_id, window || 'next_60_days', rows);
    await record('court-calendar-conflicts', { attorney_id, window, row_count: rows.length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
