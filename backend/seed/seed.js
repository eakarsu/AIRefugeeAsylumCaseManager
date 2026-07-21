const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function seedHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

async function run() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== '1') throw new Error('Set ALLOW_DESTRUCTIVE_SEED=1 only for an isolated demo database');
  for (const key of ['SEED_ADMIN_PASSWORD', 'SEED_STAFF_PASSWORD', 'SEED_VIEWER_PASSWORD']) if ((process.env[key] || '').length < 12) throw new Error(`${key} must contain at least 12 characters`);
  const client = await pool.connect();
  try {
    console.log('[seed] resetting tables...');
    await client.query(`
      DROP TABLE IF EXISTS clients                CASCADE;
      DROP TABLE IF EXISTS cases                  CASCADE;
      DROP TABLE IF EXISTS hearings               CASCADE;
      DROP TABLE IF EXISTS dossiers               CASCADE;
      DROP TABLE IF EXISTS country_of_origin_info CASCADE;
      DROP TABLE IF EXISTS immigration_forms      CASCADE;
      DROP TABLE IF EXISTS evidence_docs          CASCADE;
      DROP TABLE IF EXISTS expert_witnesses       CASCADE;
      DROP TABLE IF EXISTS ai_results             CASCADE;

      DROP TABLE IF EXISTS users                  CASCADE;
      DROP TABLE IF EXISTS notifications          CASCADE;
      DROP TABLE IF EXISTS attachments            CASCADE;
      DROP TABLE IF EXISTS webhooks               CASCADE;
      DROP TABLE IF EXISTS webhook_deliveries     CASCADE;

      DROP TABLE IF EXISTS interpreters           CASCADE;
      DROP TABLE IF EXISTS attorneys              CASCADE;
      DROP TABLE IF EXISTS paralegals             CASCADE;
      DROP TABLE IF EXISTS partner_orgs           CASCADE;
      DROP TABLE IF EXISTS asylum_grants          CASCADE;
      DROP TABLE IF EXISTS deportation_orders     CASCADE;
      DROP TABLE IF EXISTS family_members         CASCADE;
      DROP TABLE IF EXISTS sponsors               CASCADE;
      DROP TABLE IF EXISTS court_calendars        CASCADE;
      DROP TABLE IF EXISTS audit_log              CASCADE;
    `);

    console.log('[seed] applying migrations...');
    const schema1 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_schema.sql'), 'utf8');
    await client.query(schema1);
    const schema2 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '002_schema.sql'), 'utf8');
    await client.query(schema2);

    console.log('[seed] inserting clients...');
    const clients = [
      ['CLI-2026-0001', 'Maria Hernandez Lopez',      'Honduras',          '1992-07-14', '2026-03-02', 'active'],
      ['CLI-2026-0002', 'Ahmad Hassan al-Hariri',     'Syria',             '1985-02-22', '2026-02-18', 'active'],
      ['CLI-2026-0003', 'Fatima Yusuf Ahmed',         'Somalia',           '1994-11-09', '2026-01-25', 'active'],
      ['CLI-2026-0004', 'Daniyar Tursunov',           'Kazakhstan',        '1979-05-30', '2026-02-12', 'active'],
      ['CLI-2026-0005', 'Esperanza Ramirez Cruz',     'El Salvador',       '1990-09-03', '2026-03-15', 'intake'],
      ['CLI-2026-0006', 'Tenzin Norbu',               'Tibet (PRC)',       '1988-12-19', '2026-01-08', 'active'],
      ['CLI-2026-0007', 'Olena Kovalenko',            'Ukraine',           '1996-04-11', '2026-03-22', 'active'],
      ['CLI-2026-0008', 'Pierre-Luc Mbeki',           'DR Congo',          '1982-06-27', '2026-02-04', 'active'],
      ['CLI-2026-0009', 'Joud al-Tikriti',            'Iraq',              '1975-08-15', '2026-03-09', 'active'],
      ['CLI-2026-0010', 'Ngozi Adebayo',              'Nigeria',           '1991-10-05', '2026-02-26', 'intake'],
      ['CLI-2026-0011', 'Marvin Rodriguez Pineda',    'Guatemala',         '1986-01-30', '2026-03-18', 'active'],
      ['CLI-2026-0012', 'Sahar Karimi',               'Iran',              '1989-03-08', '2026-02-21', 'active'],
      ['CLI-2026-0013', 'Bashir Abdullahi',           'Eritrea',           '1993-07-19', '2026-01-14', 'active'],
      ['CLI-2026-0014', 'Win Min Aung',               'Myanmar',           '1987-09-25', '2026-02-28', 'active'],
      ['CLI-2026-0015', 'Yulia Petrenko',             'Belarus',           '1995-11-12', '2026-03-05', 'closed'],
    ];
    for (const c of clients) {
      await client.query(
        `INSERT INTO clients (client_id,full_name,country_of_origin,dob,intake_date,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        c
      );
    }

    console.log('[seed] inserting cases...');
    const cases = [
      ['CAS-2026-0001', 'CLI-2026-0001', 'asylum_affirmative',   'Sarah Chen, Esq.',         '2026-03-04', 'open'],
      ['CAS-2026-0002', 'CLI-2026-0002', 'asylum_defensive',     'Marcus Goldberg, Esq.',    '2026-02-20', 'in_hearing'],
      ['CAS-2026-0003', 'CLI-2026-0003', 'withholding_removal',  'Priya Raman, Esq.',        '2026-01-28', 'in_hearing'],
      ['CAS-2026-0004', 'CLI-2026-0004', 'cat_protection',       'David Okonkwo, Esq.',      '2026-02-14', 'open'],
      ['CAS-2026-0005', 'CLI-2026-0005', 'asylum_affirmative',   'Sarah Chen, Esq.',         '2026-03-16', 'intake'],
      ['CAS-2026-0006', 'CLI-2026-0006', 'asylum_defensive',     'Marcus Goldberg, Esq.',    '2026-01-10', 'briefing'],
      ['CAS-2026-0007', 'CLI-2026-0007', 'TPS_application',      'Priya Raman, Esq.',        '2026-03-24', 'open'],
      ['CAS-2026-0008', 'CLI-2026-0008', 'asylum_defensive',     'David Okonkwo, Esq.',      '2026-02-06', 'appeal_pending'],
      ['CAS-2026-0009', 'CLI-2026-0009', 'SIV_application',      'Sarah Chen, Esq.',         '2026-03-12', 'open'],
      ['CAS-2026-0010', 'CLI-2026-0010', 'asylum_affirmative',   'Marcus Goldberg, Esq.',    '2026-02-28', 'intake'],
      ['CAS-2026-0011', 'CLI-2026-0011', 'asylum_defensive',     'Priya Raman, Esq.',        '2026-03-20', 'briefing'],
      ['CAS-2026-0012', 'CLI-2026-0012', 'asylum_affirmative',   'David Okonkwo, Esq.',      '2026-02-22', 'open'],
      ['CAS-2026-0013', 'CLI-2026-0013', 'withholding_removal',  'Sarah Chen, Esq.',         '2026-01-16', 'in_hearing'],
      ['CAS-2026-0014', 'CLI-2026-0014', 'asylum_defensive',     'Marcus Goldberg, Esq.',    '2026-03-02', 'open'],
      ['CAS-2026-0015', 'CLI-2026-0015', 'asylum_affirmative',   'Priya Raman, Esq.',        '2026-03-07', 'closed'],
    ];
    for (const c of cases) {
      await client.query(
        `INSERT INTO cases (case_id,client_id,type,lead_attorney,opened_at,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        c
      );
    }

    console.log('[seed] inserting hearings...');
    const hearings = [
      ['HRG-2026-0001', 'CAS-2026-0002', 'New York Immigration Court',     '2026-06-12 09:00+00', 'Hon. R. Singh',        'scheduled'],
      ['HRG-2026-0002', 'CAS-2026-0003', 'San Francisco Immigration Court','2026-05-28 10:30+00', 'Hon. L. Martinez',     'scheduled'],
      ['HRG-2026-0003', 'CAS-2026-0006', 'Arlington Immigration Court',    '2026-06-04 13:00+00', 'Hon. K. Patel',        'scheduled'],
      ['HRG-2026-0004', 'CAS-2026-0008', 'Board of Immigration Appeals',   '2026-07-15 09:00+00', 'Hon. T. Williams',     'scheduled'],
      ['HRG-2026-0005', 'CAS-2026-0011', 'Chicago Immigration Court',      '2026-06-19 11:00+00', 'Hon. J. Park',         'scheduled'],
      ['HRG-2026-0006', 'CAS-2026-0013', 'Los Angeles Immigration Court',  '2026-05-22 09:30+00', 'Hon. M. Davis',        'scheduled'],
      ['HRG-2026-0007', 'CAS-2026-0002', 'New York Immigration Court',     '2026-04-08 09:00+00', 'Hon. R. Singh',        'continued'],
      ['HRG-2026-0008', 'CAS-2026-0004', 'Houston Immigration Court',      '2026-06-25 14:00+00', 'Hon. E. Garcia',       'scheduled'],
      ['HRG-2026-0009', 'CAS-2026-0009', 'USCIS NBC Asylum Office',        '2026-05-30 10:00+00', 'Asylum Officer 8841',  'scheduled'],
      ['HRG-2026-0010', 'CAS-2026-0012', 'Boston Immigration Court',       '2026-07-02 09:30+00', 'Hon. A. Nguyen',       'scheduled'],
      ['HRG-2026-0011', 'CAS-2026-0014', 'Miami Immigration Court',        '2026-06-09 13:30+00', 'Hon. C. Velasquez',    'scheduled'],
      ['HRG-2026-0012', 'CAS-2026-0001', 'USCIS Newark Asylum Office',     '2026-05-15 11:00+00', 'Asylum Officer 7723',  'scheduled'],
      ['HRG-2026-0013', 'CAS-2026-0003', 'San Francisco Immigration Court','2026-03-12 10:30+00', 'Hon. L. Martinez',     'continued'],
      ['HRG-2026-0014', 'CAS-2026-0006', 'Arlington Immigration Court',    '2026-04-10 13:00+00', 'Hon. K. Patel',        'continued'],
      ['HRG-2026-0015', 'CAS-2026-0011', 'Chicago Immigration Court',      '2026-04-22 11:00+00', 'Hon. J. Park',         'continued'],
    ];
    for (const h of hearings) {
      await client.query(
        `INSERT INTO hearings (hearing_id,case_id,court,date,judge,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        h
      );
    }

    console.log('[seed] inserting dossiers...');
    const dossiers = [
      ['DOS-2026-0001', 'CAS-2026-0001', 'v1.3', 24, '2026-05-10', 'in_review'],
      ['DOS-2026-0002', 'CAS-2026-0002', 'v2.1', 41, '2026-05-12', 'final'],
      ['DOS-2026-0003', 'CAS-2026-0003', 'v1.8', 33, '2026-05-09', 'final'],
      ['DOS-2026-0004', 'CAS-2026-0004', 'v1.0', 12, '2026-05-04', 'draft'],
      ['DOS-2026-0005', 'CAS-2026-0005', 'v0.4', 6,  '2026-05-08', 'draft'],
      ['DOS-2026-0006', 'CAS-2026-0006', 'v1.5', 27, '2026-05-11', 'in_review'],
      ['DOS-2026-0007', 'CAS-2026-0007', 'v1.1', 18, '2026-05-13', 'in_review'],
      ['DOS-2026-0008', 'CAS-2026-0008', 'v3.0', 56, '2026-05-06', 'submitted'],
      ['DOS-2026-0009', 'CAS-2026-0009', 'v1.2', 21, '2026-05-13', 'in_review'],
      ['DOS-2026-0010', 'CAS-2026-0010', 'v0.6', 9,  '2026-05-09', 'draft'],
      ['DOS-2026-0011', 'CAS-2026-0011', 'v1.4', 25, '2026-05-12', 'in_review'],
      ['DOS-2026-0012', 'CAS-2026-0012', 'v1.0', 14, '2026-05-07', 'draft'],
      ['DOS-2026-0013', 'CAS-2026-0013', 'v2.2', 38, '2026-05-05', 'final'],
      ['DOS-2026-0014', 'CAS-2026-0014', 'v1.0', 11, '2026-05-10', 'draft'],
      ['DOS-2026-0015', 'CAS-2026-0015', 'v2.0', 30, '2026-04-28', 'archived'],
    ];
    for (const d of dossiers) {
      await client.query(
        `INSERT INTO dossiers (dossier_id,case_id,version,doc_count,last_updated,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        d
      );
    }

    console.log('[seed] inserting country_of_origin_info...');
    const coi = [
      ['COI-2026-0001', 'Honduras',     '2024-2026', 'US Dept of State Country Reports on Human Rights',          '2026-04-30',  18],
      ['COI-2026-0002', 'Syria',        '2023-2026', 'UNHCR International Protection Considerations',            '2026-05-02',  31],
      ['COI-2026-0003', 'Somalia',      '2024-2026', 'EUAA Country Guidance: Somalia',                           '2026-04-22',  22],
      ['COI-2026-0004', 'Kazakhstan',   '2022-2026', 'Human Rights Watch World Report — Kazakhstan',             '2026-03-15',  9],
      ['COI-2026-0005', 'El Salvador',  '2023-2026', 'IACHR Annual Report — El Salvador chapter',                '2026-04-12',  14],
      ['COI-2026-0006', 'Tibet (PRC)',  '2020-2026', 'Freedom House — Freedom in Tibet',                         '2026-04-05',  11],
      ['COI-2026-0007', 'Ukraine',      '2022-2026', 'UNHCR Position on Returns to Ukraine',                     '2026-05-05',  37],
      ['COI-2026-0008', 'DR Congo',     '2024-2026', 'UN OHCHR Reports — DRC',                                   '2026-04-18',  16],
      ['COI-2026-0009', 'Iraq',         '2023-2026', 'EUAA Country Guidance: Iraq',                              '2026-04-08',  20],
      ['COI-2026-0010', 'Nigeria',      '2023-2026', 'Amnesty International — Nigeria',                          '2026-03-28',  13],
      ['COI-2026-0011', 'Guatemala',    '2024-2026', 'US Dept of State Country Reports on Human Rights',         '2026-04-30',  12],
      ['COI-2026-0012', 'Iran',         '2022-2026', 'UN Special Rapporteur on Iran reports',                    '2026-04-15',  24],
      ['COI-2026-0013', 'Eritrea',      '2021-2026', 'UN Commission of Inquiry on Eritrea (legacy)',             '2026-02-20',  10],
      ['COI-2026-0014', 'Myanmar',      '2022-2026', 'UNHCR Position on Returns to Myanmar',                     '2026-05-01',  19],
      ['COI-2026-0015', 'Belarus',      '2021-2026', 'OSCE Moscow Mechanism reports — Belarus',                  '2026-03-10',  8],
    ];
    for (const r of coi) {
      await client.query(
        `INSERT INTO country_of_origin_info (coi_id,country,period,source,retrieved_at,citation_count) VALUES ($1,$2,$3,$4,$5,$6)`,
        r
      );
    }

    console.log('[seed] inserting immigration_forms...');
    const forms = [
      ['FRM-2026-0001', 'CAS-2026-0001', 'I-589',  'v2024-09', '2026-04-12', 'filed'],
      ['FRM-2026-0002', 'CAS-2026-0002', 'I-589',  'v2024-09', '2026-03-05', 'filed'],
      ['FRM-2026-0003', 'CAS-2026-0003', 'I-589',  'v2024-09', '2026-02-10', 'filed'],
      ['FRM-2026-0004', 'CAS-2026-0004', 'I-589',  'v2024-09', null,         'draft'],
      ['FRM-2026-0005', 'CAS-2026-0007', 'I-821',  'v2025-01', '2026-04-02', 'filed'],
      ['FRM-2026-0006', 'CAS-2026-0008', 'EOIR-26','v2024-06', '2026-03-22', 'filed'],
      ['FRM-2026-0007', 'CAS-2026-0009', 'I-360',  'v2024-08', '2026-04-25', 'filed'],
      ['FRM-2026-0008', 'CAS-2026-0001', 'I-765',  'v2024-09', '2026-04-30', 'pending'],
      ['FRM-2026-0009', 'CAS-2026-0006', 'I-589',  'v2024-09', '2026-02-01', 'filed'],
      ['FRM-2026-0010', 'CAS-2026-0011', 'I-589',  'v2024-09', '2026-04-04', 'filed'],
      ['FRM-2026-0011', 'CAS-2026-0012', 'I-589',  'v2024-09', null,         'draft'],
      ['FRM-2026-0012', 'CAS-2026-0013', 'I-589',  'v2024-09', '2026-02-15', 'filed'],
      ['FRM-2026-0013', 'CAS-2026-0014', 'I-589',  'v2024-09', null,         'draft'],
      ['FRM-2026-0014', 'CAS-2026-0010', 'I-589',  'v2024-09', null,         'draft'],
      ['FRM-2026-0015', 'CAS-2026-0005', 'I-589',  'v2024-09', null,         'draft'],
    ];
    for (const f of forms) {
      await client.query(
        `INSERT INTO immigration_forms (form_id,case_id,form_type,version,filed_at,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        f
      );
    }

    console.log('[seed] inserting evidence_docs...');
    const evidence = [
      ['EVD-2026-0001', 'CAS-2026-0001', 'police_report',         'Honduran National Police, Tegucigalpa',    '2026-04-02', 'verified'],
      ['EVD-2026-0002', 'CAS-2026-0002', 'medical_record',        'Médecins Sans Frontières clinic, Aleppo',  '2026-03-12', 'verified'],
      ['EVD-2026-0003', 'CAS-2026-0003', 'witness_affidavit',     'Cousin in Nairobi (sworn affidavit)',      '2026-02-25', 'verified'],
      ['EVD-2026-0004', 'CAS-2026-0004', 'expert_country_report', 'Prof. K. Aliev, Tashkent Univ.',           '2026-03-18', 'pending_review'],
      ['EVD-2026-0005', 'CAS-2026-0006', 'photographs',           'Client phone — Lhasa demonstration',       '2026-01-30', 'verified'],
      ['EVD-2026-0006', 'CAS-2026-0007', 'identity_documents',    'Ukrainian internal passport (apostille)',  '2026-04-05', 'verified'],
      ['EVD-2026-0007', 'CAS-2026-0008', 'NGO_letter',            'HRW DRC report excerpt',                   '2026-03-08', 'verified'],
      ['EVD-2026-0008', 'CAS-2026-0009', 'employment_letter',     'US Army CJTF translator certification',    '2026-04-18', 'verified'],
      ['EVD-2026-0009', 'CAS-2026-0011', 'police_report',         'PNC Guatemala denuncia',                   '2026-04-09', 'pending_review'],
      ['EVD-2026-0010', 'CAS-2026-0012', 'social_media',          'Twitter posts archived via archive.org',   '2026-03-22', 'pending_review'],
      ['EVD-2026-0011', 'CAS-2026-0013', 'witness_affidavit',     'Eritrean diaspora witness, Stockholm',     '2026-01-28', 'verified'],
      ['EVD-2026-0012', 'CAS-2026-0014', 'photographs',           'Family photos of property destruction',    '2026-03-15', 'verified'],
      ['EVD-2026-0013', 'CAS-2026-0002', 'medical_record',        'Trauma psych eval, Bellevue NY',           '2026-04-22', 'verified'],
      ['EVD-2026-0014', 'CAS-2026-0010', 'NGO_letter',            'Equality Now intake letter',               '2026-03-10', 'pending_review'],
      ['EVD-2026-0015', 'CAS-2026-0015', 'identity_documents',    'Belarusian passport copy (legalized)',     '2026-03-04', 'verified'],
    ];
    for (const e of evidence) {
      await client.query(
        `INSERT INTO evidence_docs (doc_id,case_id,type,source,uploaded_at,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        e
      );
    }

    console.log('[seed] inserting expert_witnesses...');
    const experts = [
      ['EXP-2026-0001', 'Dr. Elena Rivera',          'Central American gang violence, MS-13',          'CAS-2026-0001', 4500, 'engaged'],
      ['EXP-2026-0002', 'Prof. Yusuf al-Khoury',     'Syrian conflict, Alawite/Sunni dynamics',        'CAS-2026-0002', 5200, 'engaged'],
      ['EXP-2026-0003', 'Dr. Amina Farah',           'Somali clan politics, al-Shabaab',               'CAS-2026-0003', 3800, 'engaged'],
      ['EXP-2026-0004', 'Dr. Kamilla Aliyeva',       'Central Asia human rights',                      'CAS-2026-0004', 3200, 'engaged'],
      ['EXP-2026-0005', 'Dr. Sonam Choedon',         'Tibetan religious persecution',                  'CAS-2026-0006', 2900, 'engaged'],
      ['EXP-2026-0006', 'Prof. Mykhailo Kovalchuk',  'Ukraine — Russian occupation conditions',        'CAS-2026-0007', 4100, 'pending'],
      ['EXP-2026-0007', 'Dr. Patrice Mbongo',        'DR Congo east — armed groups',                   'CAS-2026-0008', 3700, 'engaged'],
      ['EXP-2026-0008', 'Dr. Layla al-Sadr',         'Iraq — Yazidi/minority persecution',             'CAS-2026-0009', 4400, 'engaged'],
      ['EXP-2026-0009', 'Dr. Sade Adesanya',         'Nigeria — Boko Haram, FGM risk',                 'CAS-2026-0010', 3500, 'pending'],
      ['EXP-2026-0010', 'Dr. Carla Vasquez',         'Guatemala — femicide, gang persecution',         'CAS-2026-0011', 3300, 'engaged'],
      ['EXP-2026-0011', 'Dr. Babak Mahmoudi',        'Iran — political dissidents, women rights',      'CAS-2026-0012', 4600, 'engaged'],
      ['EXP-2026-0012', 'Dr. Asmara Tesfay',         'Eritrea — indefinite conscription',              'CAS-2026-0013', 3900, 'engaged'],
      ['EXP-2026-0013', 'Dr. Khin Soe',              'Myanmar — Rohingya, Tatmadaw',                   'CAS-2026-0014', 3600, 'engaged'],
      ['EXP-2026-0014', 'Dr. Henryk Wisniewski',     'Belarus — Lukashenka regime repression',         'CAS-2026-0015', 3100, 'completed'],
      ['EXP-2026-0015', 'Dr. Maria Salinas',         'El Salvador — MS-13 / gang violence',            'CAS-2026-0005', 3400, 'pending'],
    ];
    for (const e of experts) {
      await client.query(
        `INSERT INTO expert_witnesses (witness_id,name,expertise,case_id,fee_usd,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        e
      );
    }

    console.log('[seed] inserting users...');
    const users = [
      ['admin@asylum.io',    seedHash(process.env.SEED_ADMIN_PASSWORD),  'Admin',    'admin'],
      ['attorney@asylum.io', seedHash(process.env.SEED_STAFF_PASSWORD),  'Attorney', 'attorney'],
      ['viewer@asylum.io',   seedHash(process.env.SEED_VIEWER_PASSWORD), 'Viewer',   'viewer'],
    ];
    for (const u of users) {
      await client.query(
        `INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,$4)`,
        u
      );
    }

    console.log('[seed] inserting notifications...');
    const notifications = [
      [1, 'Hearing in 7 days',           'Hearing HRG-2026-0006 — CAS-2026-0013 — LA Immigration Court',  'high',     'hearings'],
      [1, 'New deportation order',       'Order DEP-2026-0002 issued against CAS-2026-0008',              'critical', 'deportation_orders'],
      [1, 'COI updated for Syria',       'New UNHCR Position Paper retrieved — 31 citations',             'info',     'country_of_origin_info'],
      [2, 'Dossier draft requires review','DOS-2026-0004 — CAS-2026-0004',                                'high',     'dossiers'],
      [2, 'Evidence pending review',     '4 evidence_docs pending review across active cases',            'info',     'evidence_docs'],
    ];
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (user_id,title,body,severity,source) VALUES ($1,$2,$3,$4,$5)`,
        n
      );
    }

    console.log('[seed] inserting webhooks...');
    const webhooks = [
      ['UNHCR Partner Bridge',      'https://httpbin.org/post', 'sec_unhcr_2026',    'case.created,grant.created',     true],
      ['Pro Bono Coordinator Hook', 'https://httpbin.org/post', 'sec_probono_2026',  'case.created,hearing.scheduled', true],
    ];
    for (const w of webhooks) {
      await client.query(
        `INSERT INTO webhooks (name,url,secret,events,active) VALUES ($1,$2,$3,$4,$5)`,
        w
      );
    }

    console.log('[seed] inserting interpreters...');
    const interpreters = [
      ['INT-2026-0001', 'Lucia Mendoza',       'Spanish, K\'iche\', Q\'eqchi\'',          'NAJIT certified',                  'Houston, TX',     'available'],
      ['INT-2026-0002', 'Rami al-Sayed',       'Arabic (Levantine, MSA), French',         'ATA, FCJIS court-certified',       'Newark, NJ',      'available'],
      ['INT-2026-0003', 'Hodan Warsame',       'Somali, Swahili, English',                'NAJIT certified',                  'Minneapolis, MN', 'engaged'],
      ['INT-2026-0004', 'Aigerim Bekova',      'Russian, Kazakh, Kyrgyz',                 'Federal court-certified',          'Brooklyn, NY',    'available'],
      ['INT-2026-0005', 'Andres Salinas',      'Spanish, Nahuatl',                        'NAJIT certified',                  'Los Angeles, CA', 'available'],
      ['INT-2026-0006', 'Pema Tsering',        'Tibetan (Lhasa, Amdo), Mandarin',         'Community-certified',              'Brooklyn, NY',    'available'],
      ['INT-2026-0007', 'Iryna Bondarenko',    'Ukrainian, Russian, Polish',              'NAJIT certified',                  'Chicago, IL',     'engaged'],
      ['INT-2026-0008', 'Patrice Lumumba',     'French, Lingala, Swahili',                'EOIR-rostered',                    'Washington, DC',  'available'],
      ['INT-2026-0009', 'Layla al-Zahra',      'Arabic (Iraqi), Kurdish (Sorani)',        'ATA, NAJIT',                       'Detroit, MI',     'available'],
      ['INT-2026-0010', 'Funke Adeyemi',       'Yoruba, Igbo, Hausa, English',            'NAJIT, ATA',                       'Atlanta, GA',     'available'],
      ['INT-2026-0011', 'Marisol Rivera',      'Spanish, Mam',                            'NAJIT certified',                  'Phoenix, AZ',     'engaged'],
      ['INT-2026-0012', 'Babak Tehrani',       'Farsi, Dari, Pashto',                     'EOIR-rostered, ATA',               'San Francisco',   'available'],
      ['INT-2026-0013', 'Asmara Berhane',      'Tigrinya, Amharic, Arabic',               'Community-certified',              'Seattle, WA',     'available'],
      ['INT-2026-0014', 'Aung Myo Soe',        'Burmese, Karen, Rohingya dialect',        'Community-certified',              'Buffalo, NY',     'available'],
      ['INT-2026-0015', 'Hanna Krot',          'Belarusian, Russian, Polish',             'NAJIT certified',                  'Chicago, IL',     'available'],
    ];
    for (const i of interpreters) {
      await client.query(
        `INSERT INTO interpreters (interpreter_id,name,languages,certifications,base,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        i
      );
    }

    console.log('[seed] inserting attorneys...');
    const attorneys = [
      ['ATT-001', 'Sarah Chen, Esq.',       'NY', 'Asylum, withholding, CAT, refugee resettlement',  18, 'active'],
      ['ATT-002', 'Marcus Goldberg, Esq.',  'NY', 'Defensive asylum, BIA appeals',                   22, 'active'],
      ['ATT-003', 'Priya Raman, Esq.',      'CA', 'Asylum, TPS, U-visa, T-visa',                     14, 'active'],
      ['ATT-004', 'David Okonkwo, Esq.',    'DC', 'Asylum, CAT, Federal court litigation',           12, 'active'],
      ['ATT-005', 'Aisha Mohamed, Esq.',    'MN', 'East African client base, asylum',                16, 'active'],
      ['ATT-006', 'Carlos Hernandez, Esq.', 'TX', 'Central American asylum, family unification',     21, 'active'],
      ['ATT-007', 'Lin Tao, Esq.',          'CA', 'Chinese, Tibetan, religious persecution',         9,  'active'],
      ['ATT-008', 'Yelena Volkov, Esq.',    'IL', 'Russophone clients — Ukraine, Belarus, RU',       11, 'active'],
      ['ATT-009', 'Kwame Asante, Esq.',     'GA', 'West African asylum, FGM-based claims',           13, 'active'],
      ['ATT-010', 'Reza Karimi, Esq.',      'CA', 'Iranian, Afghan, religious / political',          10, 'active'],
      ['ATT-011', 'Ngozi Eze, Esq.',        'NJ', 'Pediatric asylum, unaccompanied minors',          17, 'active'],
      ['ATT-012', 'Tomáš Novák, Esq.',      'NY', 'Eastern European asylum, BIA appeals',            8,  'active'],
      ['ATT-013', 'Hana Nakamura, Esq.',    'WA', 'Southeast Asian asylum, Rohingya',                7,  'on_leave'],
      ['ATT-014', 'Diego Vargas, Esq.',     'FL', 'Cuban/Venezuelan/Haitian asylum, parole',         19, 'active'],
      ['ATT-015', 'Rivka Stein, Esq.',      'NY', 'LGBTQ+ asylum, gender-based claims',              15, 'active'],
    ];
    for (const a of attorneys) {
      await client.query(
        `INSERT INTO attorneys (attorney_id,name,bar_state,specialty,case_count,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        a
      );
    }

    console.log('[seed] inserting paralegals...');
    const paralegals = [
      ['PAR-001', 'Jennifer Liu',          'ATT-001', 'New York, NY',     11, 'active'],
      ['PAR-002', 'Roberto Mendez',        'ATT-006', 'Houston, TX',      14, 'active'],
      ['PAR-003', 'Amira Khalil',          'ATT-002', 'New York, NY',     12, 'active'],
      ['PAR-004', 'Sofia Ruiz',            'ATT-003', 'Oakland, CA',      9,  'active'],
      ['PAR-005', 'Daniel Park',           'ATT-007', 'San Francisco, CA',8,  'active'],
      ['PAR-006', 'Hanan Yusuf',           'ATT-005', 'Minneapolis, MN',  10, 'active'],
      ['PAR-007', 'Olha Petrova',          'ATT-008', 'Chicago, IL',      7,  'active'],
      ['PAR-008', 'Jean-Marc Kabongo',     'ATT-009', 'Atlanta, GA',      9,  'active'],
      ['PAR-009', 'Maya Behnam',           'ATT-010', 'San Diego, CA',    6,  'active'],
      ['PAR-010', 'Linda Okoye',           'ATT-011', 'Newark, NJ',       12, 'active'],
      ['PAR-011', 'Vaclav Horak',          'ATT-012', 'Brooklyn, NY',     5,  'active'],
      ['PAR-012', 'Thiri Aye',             'ATT-013', 'Seattle, WA',      4,  'on_leave'],
      ['PAR-013', 'Esmeralda Reyes',       'ATT-014', 'Miami, FL',        13, 'active'],
      ['PAR-014', 'Rebecca Goldman',       'ATT-015', 'Brooklyn, NY',     11, 'active'],
      ['PAR-015', 'Tariq Hussein',         'ATT-004', 'Washington, DC',   8,  'active'],
    ];
    for (const p of paralegals) {
      await client.query(
        `INSERT INTO paralegals (paralegal_id,name,attorney_id,base,case_count,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        p
      );
    }

    console.log('[seed] inserting partner_orgs...');
    const partners = [
      ['ORG-001', 'UNHCR USA Liaison Office',                'USA',    'Refugee resettlement coordination',           'unhcr-usa@unhcr.org',         'active'],
      ['ORG-002', 'International Rescue Committee (IRC)',    'USA',    'Resettlement, case management, legal',        'newyork@rescue.org',          'active'],
      ['ORG-003', 'HIAS',                                    'USA',    'Refugee legal services, advocacy',            'info@hias.org',               'active'],
      ['ORG-004', 'Kids in Need of Defense (KIND)',          'USA',    'Unaccompanied children legal services',       'info@supportkind.org',        'active'],
      ['ORG-005', 'CLINIC (Catholic Legal Immigration)',     'USA',    'Affiliate legal training and support',        'clinicinfo@cliniclegal.org',  'active'],
      ['ORG-006', 'Asylum Access Mexico',                    'Mexico', 'Cross-border referrals, COI evidence',        'mexico@asylumaccess.org',     'active'],
      ['ORG-007', 'Refugee Council UK',                      'UK',     'Comparative COI, expert referrals',           'info@refugeecouncil.org.uk',  'active'],
      ['ORG-008', 'Jesuit Refugee Service / USA',            'USA',    'Detention visitation, pro bono',              'jrsusa@jrsusa.org',           'active'],
      ['ORG-009', 'Tahirih Justice Center',                  'USA',    'Gender-based violence asylum',                'info@tahirih.org',            'active'],
      ['ORG-010', 'Center for Gender & Refugee Studies',     'USA',    'Expert witness referrals, COI library',       'cgrs@uchastings.edu',         'active'],
      ['ORG-011', 'Immigrant Defense Project',               'USA',    'Crim-imm consultation, training',             'info@immigrantdefenseproject.org','active'],
      ['ORG-012', 'Karen Organization of Minnesota',         'USA',    'Burmese / Karen community support',           'info@mnkaren.org',            'active'],
      ['ORG-013', 'Razom for Ukraine',                       'USA',    'Ukrainian community + advocacy',              'hello@razomforukraine.org',   'active'],
      ['ORG-014', 'Eritrean Diaspora Network',               'USA',    'Eritrean community witness referrals',        'info@eridiaspora.org',        'active'],
      ['ORG-015', 'Local Mutual Aid Coalition',              'USA',    'Housing, food, transport for new arrivals',   'coordinator@mutualaid.local', 'inactive'],
    ];
    for (const o of partners) {
      await client.query(
        `INSERT INTO partner_orgs (org_id,name,country,services,contact,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        o
      );
    }

    console.log('[seed] inserting asylum_grants...');
    const grants = [
      ['GRN-2026-0001', 'CAS-2026-0015', 'granted',  '2026-04-22', 'Chicago Immigration Court',       'political opinion'],
      ['GRN-2026-0002', 'CAS-2026-0006', 'granted',  '2026-03-30', 'Arlington Immigration Court',     'religion (Tibetan Buddhism)'],
      ['GRN-2026-0003', 'CAS-2026-0013', 'granted',  '2026-02-18', 'Los Angeles Immigration Court',   'particular social group'],
      ['GRN-2026-0004', 'CAS-2026-0007', 'pending',  null,         'USCIS Newark Asylum Office',      'TPS Ukraine designation'],
      ['GRN-2026-0005', 'CAS-2026-0009', 'granted',  '2026-04-05', 'USCIS NBC SIV adjudication',      'SIV — Iraqi translator'],
      ['GRN-2026-0006', 'CAS-2026-0002', 'pending',  null,         'New York Immigration Court',      'religion (Christian minority)'],
      ['GRN-2026-0007', 'CAS-2026-0003', 'pending',  null,         'San Francisco Immigration Court', 'political opinion'],
      ['GRN-2026-0008', 'CAS-2026-0011', 'pending',  null,         'Chicago Immigration Court',       'particular social group'],
      ['GRN-2026-0009', 'CAS-2026-0001', 'pending',  null,         'USCIS Newark Asylum Office',      'particular social group'],
      ['GRN-2026-0010', 'CAS-2026-0014', 'pending',  null,         'Miami Immigration Court',         'political opinion'],
      ['GRN-2026-0011', 'CAS-2026-0012', 'pending',  null,         'Boston Immigration Court',       'religion (Baha\'i)'],
      ['GRN-2026-0012', 'CAS-2026-0004', 'pending',  null,         'Houston Immigration Court',       'CAT — risk of torture'],
      ['GRN-2026-0013', 'CAS-2026-0005', 'pending',  null,         'USCIS — TBD',                     'particular social group'],
      ['GRN-2026-0014', 'CAS-2026-0010', 'pending',  null,         'USCIS — TBD',                     'gender / particular social group'],
      ['GRN-2026-0015', 'CAS-2026-0008', 'denied',   '2026-03-15', 'Board of Immigration Appeals',    'on appeal — BIA remand sought'],
    ];
    for (const g of grants) {
      await client.query(
        `INSERT INTO asylum_grants (grant_id,case_id,status,granted_at,court,basis) VALUES ($1,$2,$3,$4,$5,$6)`,
        g
      );
    }

    console.log('[seed] inserting deportation_orders...');
    const deportations = [
      ['DEP-2026-0001', 'CAS-2026-0008', '2026-03-15', 'DR Congo',     'on_appeal',          'BIA appeal pending'],
      ['DEP-2026-0002', 'CAS-2026-0008', '2026-04-22', 'DR Congo',     'on_appeal',          'Stay of removal granted'],
      ['DEP-2026-0003', 'CAS-2026-0014', null,         'Myanmar',      'preliminary',        'In Master Calendar'],
      ['DEP-2026-0004', 'CAS-2026-0004', null,         'Kazakhstan',   'preliminary',        'CAT relief sought'],
      ['DEP-2026-0005', 'CAS-2026-0011', null,         'Guatemala',    'preliminary',        'In Master Calendar'],
      ['DEP-2026-0006', 'CAS-2026-0013', null,         'Eritrea',      'cancelled',          'Withholding granted — see GRN-2026-0003'],
      ['DEP-2026-0007', 'CAS-2026-0006', null,         'PRC',          'cancelled',          'Asylum granted — see GRN-2026-0002'],
      ['DEP-2026-0008', 'CAS-2026-0015', null,         'Belarus',      'cancelled',          'Asylum granted — see GRN-2026-0001'],
      ['DEP-2026-0009', 'CAS-2026-0001', null,         'Honduras',     'not_issued',         'Affirmative pending'],
      ['DEP-2026-0010', 'CAS-2026-0002', null,         'Syria',        'preliminary',        'Defensive in MCH'],
      ['DEP-2026-0011', 'CAS-2026-0003', null,         'Somalia',      'preliminary',        'Defensive in MCH'],
      ['DEP-2026-0012', 'CAS-2026-0007', null,         'Ukraine',      'not_issued',         'TPS protection active'],
      ['DEP-2026-0013', 'CAS-2026-0010', null,         'Nigeria',      'preliminary',        'Pending NTA'],
      ['DEP-2026-0014', 'CAS-2026-0012', null,         'Iran',         'preliminary',        'Defensive in MCH'],
      ['DEP-2026-0015', 'CAS-2026-0009', null,         'Iraq',         'not_issued',         'SIV granted'],
    ];
    for (const d of deportations) {
      await client.query(
        `INSERT INTO deportation_orders (order_id,case_id,issued_at,removal_country,status,appeal_status) VALUES ($1,$2,$3,$4,$5,$6)`,
        d
      );
    }

    console.log('[seed] inserting family_members...');
    const family = [
      ['FAM-2026-0001', 'CLI-2026-0001', 'Sofia Hernandez',         'daughter (age 7)',  'with client in Houston, TX',         'reunited'],
      ['FAM-2026-0002', 'CLI-2026-0001', 'Luis Hernandez',          'spouse',            'San Pedro Sula, Honduras (in hiding)', 'separated'],
      ['FAM-2026-0003', 'CLI-2026-0002', 'Layla al-Hariri',         'spouse',            'Amman, Jordan refugee camp',         'separated'],
      ['FAM-2026-0004', 'CLI-2026-0002', 'Tariq al-Hariri',         'son (age 11)',      'Amman, Jordan refugee camp',         'separated'],
      ['FAM-2026-0005', 'CLI-2026-0003', 'Anab Yusuf',              'mother',            'Mogadishu, Somalia',                 'separated'],
      ['FAM-2026-0006', 'CLI-2026-0006', 'Lobsang Norbu',           'brother',           'Dharamsala, India (in exile)',       'separated'],
      ['FAM-2026-0007', 'CLI-2026-0007', 'Anastasia Kovalenko',     'daughter (age 4)',  'Lviv, Ukraine with grandparents',    'separated'],
      ['FAM-2026-0008', 'CLI-2026-0008', 'Marie Mbeki',             'spouse',            'Goma, DR Congo',                     'separated'],
      ['FAM-2026-0009', 'CLI-2026-0009', 'Zainab al-Tikriti',       'spouse',            'with client in Detroit, MI',         'reunited'],
      ['FAM-2026-0010', 'CLI-2026-0011', 'Carla Rodriguez',         'spouse',            'Quetzaltenango, Guatemala',          'separated'],
      ['FAM-2026-0011', 'CLI-2026-0011', 'Diego Rodriguez',         'son (age 9)',       'Quetzaltenango, Guatemala',          'separated'],
      ['FAM-2026-0012', 'CLI-2026-0012', 'Hassan Karimi',           'brother',           'Tehran, Iran (under surveillance)',  'separated'],
      ['FAM-2026-0013', 'CLI-2026-0013', 'Berhane Abdullahi',       'sister',            'Khartoum, Sudan refugee camp',       'separated'],
      ['FAM-2026-0014', 'CLI-2026-0014', 'Hla Hla Aung',            'spouse',            'Cox\'s Bazar refugee camp, BD',      'separated'],
      ['FAM-2026-0015', 'CLI-2026-0015', 'Andrei Petrenko',         'spouse',            'with client in Chicago, IL',         'reunited'],
    ];
    for (const f of family) {
      await client.query(
        `INSERT INTO family_members (member_id,client_id,name,relationship,location,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        f
      );
    }

    console.log('[seed] inserting sponsors...');
    const sponsors = [
      ['SPN-2026-0001', 'CLI-2026-0001', 'Iglesia Cristo Rey',           'Houston, TX',         'congregational sponsor',  'active'],
      ['SPN-2026-0002', 'CLI-2026-0002', 'Sara Mansour (cousin)',        'Brooklyn, NY',        'family sponsor (I-134)',  'active'],
      ['SPN-2026-0003', 'CLI-2026-0003', 'Somali Community of MN',       'Minneapolis, MN',     'community sponsor',       'active'],
      ['SPN-2026-0004', 'CLI-2026-0004', 'Kazakh Diaspora Assn.',        'Brooklyn, NY',        'community sponsor',       'pending'],
      ['SPN-2026-0005', 'CLI-2026-0005', 'St. Anne\'s Parish',           'Los Angeles, CA',     'congregational sponsor',  'active'],
      ['SPN-2026-0006', 'CLI-2026-0006', 'Tibetan Assn. of NY',          'Brooklyn, NY',        'community sponsor',       'active'],
      ['SPN-2026-0007', 'CLI-2026-0007', 'Razom for Ukraine',            'Chicago, IL',         'NGO sponsor',             'active'],
      ['SPN-2026-0008', 'CLI-2026-0008', 'Africa Faith and Justice',     'Washington, DC',      'community sponsor',       'active'],
      ['SPN-2026-0009', 'CLI-2026-0009', 'No One Left Behind',           'Detroit, MI',         'SIV NGO sponsor',         'active'],
      ['SPN-2026-0010', 'CLI-2026-0010', 'Nigerian Womens Assn.',        'Atlanta, GA',         'community sponsor',       'pending'],
      ['SPN-2026-0011', 'CLI-2026-0011', 'Asociación Pop No\'j',         'Phoenix, AZ',         'community sponsor',       'active'],
      ['SPN-2026-0012', 'CLI-2026-0012', 'Iranian Federated Womens',     'San Diego, CA',       'community sponsor',       'active'],
      ['SPN-2026-0013', 'CLI-2026-0013', 'Eritrean Community Center',    'Seattle, WA',         'community sponsor',       'active'],
      ['SPN-2026-0014', 'CLI-2026-0014', 'Karen Organization of MN',     'St. Paul, MN',        'community sponsor',       'active'],
      ['SPN-2026-0015', 'CLI-2026-0015', 'Belarus Council USA',          'Chicago, IL',         'community sponsor',       'active'],
    ];
    for (const s of sponsors) {
      await client.query(
        `INSERT INTO sponsors (sponsor_id,client_id,name,location,sponsor_status,status) VALUES ($1,$2,$3,$4,$5,$6)`,
        s
      );
    }

    console.log('[seed] inserting court_calendars...');
    const calendars = [
      ['CAL-2026-0001', 'New York Immigration Court',     '2026-06-12', 28, 'open',     'Hon. R. Singh'],
      ['CAL-2026-0002', 'San Francisco Immigration Court','2026-05-28', 31, 'open',     'Hon. L. Martinez'],
      ['CAL-2026-0003', 'Arlington Immigration Court',    '2026-06-04', 24, 'open',     'Hon. K. Patel'],
      ['CAL-2026-0004', 'Board of Immigration Appeals',   '2026-07-15', 18, 'open',     'Hon. T. Williams'],
      ['CAL-2026-0005', 'Chicago Immigration Court',      '2026-06-19', 26, 'open',     'Hon. J. Park'],
      ['CAL-2026-0006', 'Los Angeles Immigration Court',  '2026-05-22', 33, 'open',     'Hon. M. Davis'],
      ['CAL-2026-0007', 'Houston Immigration Court',      '2026-06-25', 29, 'open',     'Hon. E. Garcia'],
      ['CAL-2026-0008', 'USCIS NBC Asylum Office',        '2026-05-30', 12, 'open',     'Asylum Officer 8841'],
      ['CAL-2026-0009', 'Boston Immigration Court',       '2026-07-02', 21, 'open',     'Hon. A. Nguyen'],
      ['CAL-2026-0010', 'Miami Immigration Court',        '2026-06-09', 30, 'open',     'Hon. C. Velasquez'],
      ['CAL-2026-0011', 'USCIS Newark Asylum Office',     '2026-05-15', 14, 'open',     'Asylum Officer 7723'],
      ['CAL-2026-0012', 'Atlanta Immigration Court',      '2026-06-30', 22, 'open',     'Hon. D. Carter'],
      ['CAL-2026-0013', 'New York Immigration Court',     '2026-04-08', 27, 'closed',   'Hon. R. Singh'],
      ['CAL-2026-0014', 'San Francisco Immigration Court','2026-03-12', 25, 'closed',   'Hon. L. Martinez'],
      ['CAL-2026-0015', 'Arlington Immigration Court',    '2026-04-10', 23, 'closed',   'Hon. K. Patel'],
    ];
    for (const c of calendars) {
      await client.query(
        `INSERT INTO court_calendars (calendar_id,court,date,case_count,status,judge) VALUES ($1,$2,$3,$4,$5,$6)`,
        c
      );
    }

    console.log('[seed] inserting audit_log...');
    const audit = [
      ['AUD-2026-0001', 'attorney@asylum.io', 'CAS-2026-0001', 'create',           'success', '2026-03-04 09:15+00'],
      ['AUD-2026-0002', 'attorney@asylum.io', 'DOS-2026-0002', 'update',           'success', '2026-05-12 14:22+00'],
      ['AUD-2026-0003', 'admin@asylum.io',    'users',         'role_change',      'success', '2026-04-30 10:01+00'],
      ['AUD-2026-0004', 'attorney@asylum.io', 'FRM-2026-0001', 'file_with_USCIS',  'success', '2026-04-12 16:45+00'],
      ['AUD-2026-0005', 'viewer@asylum.io',   'CLI-2026-0002', 'view',             'success', '2026-05-13 11:30+00'],
      ['AUD-2026-0006', 'attorney@asylum.io', 'EVD-2026-0009', 'verify',           'success', '2026-05-09 09:00+00'],
      ['AUD-2026-0007', 'attorney@asylum.io', 'GRN-2026-0001', 'record_grant',     'success', '2026-04-22 13:18+00'],
      ['AUD-2026-0008', 'attorney@asylum.io', 'DEP-2026-0002', 'note_appeal',      'success', '2026-04-23 09:40+00'],
      ['AUD-2026-0009', 'admin@asylum.io',    'webhooks',      'create',           'success', '2026-03-20 15:55+00'],
      ['AUD-2026-0010', 'attorney@asylum.io', 'HRG-2026-0001', 'reschedule',       'success', '2026-05-02 12:10+00'],
      ['AUD-2026-0011', 'attorney@asylum.io', 'CAS-2026-0008', 'file_BIA_appeal',  'success', '2026-04-05 11:22+00'],
      ['AUD-2026-0012', 'attorney@asylum.io', 'EXP-2026-0001', 'engage_expert',    'success', '2026-04-10 09:30+00'],
      ['AUD-2026-0013', 'attorney@asylum.io', 'INT-2026-0003', 'assign_interpreter','success','2026-04-12 14:00+00'],
      ['AUD-2026-0014', 'viewer@asylum.io',   'CAS-2026-0010', 'view',             'denied',  '2026-05-14 08:42+00'],
      ['AUD-2026-0015', 'attorney@asylum.io', 'DOS-2026-0008', 'submit',           'success', '2026-05-06 17:05+00'],
    ];
    for (const a of audit) {
      await client.query(
        `INSERT INTO audit_log (entry_id,actor,target,action,result,ts) VALUES ($1,$2,$3,$4,$5,$6)`,
        a
      );
    }

    console.log('[seed] complete.');
  } catch (e) {
    console.error('[seed] error:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
