// SSR smoke test for AIResultDisplay.
// Renders the component with realistic AI payloads and asserts:
//  - No <pre>...JSON...</pre> dump in the output
//  - Expected structural classes are present (ai-panel, ai-hero, ai-kpi, ai-section, ai-table or ai-card)
//  - exec-brief's nested `brief` is unwrapped (headline/operational_picture surface to top level)

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Patch require to babel-transform .js files under src/
const origCompile = Module.prototype._compile;
Module.prototype._compile = function (content, filename) {
  if (filename.includes('/src/')) {
    const out = babel.transformSync(content, {
      filename,
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'classic' }],
      ],
      babelrc: false,
      configFile: false,
    });
    return origCompile.call(this, out.code, filename);
  }
  return origCompile.call(this, content, filename);
};

const AIResultDisplay = require('./src/components/AIResultDisplay').default;

// ── Sample payloads ───────────────────────────────────────────────────
const assessRiskPayload = {
  scenario: 'Tabletop Exercise: Baseline Risk Assessment',
  overall_risk_level: 'low',
  risk_matrix: [
    { risk: 'Insufficient operational baseline data', category: 'operational', likelihood: 'high', impact: 'medium', score: 6, owner: 'Operations Chief' },
    { risk: 'Limited context for threat modeling',    category: 'intelligence', likelihood: 'high', impact: 'low',    score: 3, owner: 'Intelligence Officer' },
  ],
  mitigations: [
    { risk: 'Insufficient operational baseline data', mitigation: 'Request detailed fleet status', lead_time_hours: 2, cost_estimate_usd: 0 },
  ],
  escalation_triggers: ['Any unplanned asset loss > 10%', 'Personnel casualty event'],
  residual_risk: 'low',
  summary: 'Baseline readiness posture is sound but incomplete.',
};

const execBriefPayload = {
  snapshot: { missions: { active: '6', total: '15' }, assets: { ready: '6', total: '15' } },
  brief: {
    headline: 'OPERATIONAL READINESS: 73% | FORCE POSTURE ADEQUATE',
    operational_picture: 'Fleet composition: 15 total assets with 6 ready (40%)…',
    force_readiness: { ready_percent: 40, deployed_percent: 33, maintenance_percent: 20, narrative: 'Combined operational availability at 73%.' },
    active_operations_summary: [
      { mission: 'OP-1', status: 'active', notes: 'Forward presence' },
      { mission: 'OP-2', status: 'planning', notes: 'Drill' },
    ],
    top_risks: [
      { risk: 'Supply delay', severity: 'high', owner: 'J4' },
      { risk: 'Maintenance backlog', severity: 'medium', owner: 'Maintenance' },
    ],
    decisions_required: [
      { decision: 'Authorize surge', deadline: '24h', options: ['Yes', 'No'], recommendation: 'Yes' },
    ],
    next_24h_outlook: 'Stable with watch on supply.',
    summary: 'Force posture adequate; surface 2 critical threats.',
  },
};

const summaryWithJson = {
  summary: '```json\n{"headline":"Hidden by parser","summary":"Inner summary","scores":[1,2,3]}\n```',
  raw: 'unused',
};

// ── Assertions ────────────────────────────────────────────────────────
function assertNoJsonDump(html, name) {
  // raw "<pre>{ ... JSON-like ... </pre>" would indicate failure
  const preBlocks = html.match(/<pre[^>]*>[\s\S]*?<\/pre>/g) || [];
  for (const p of preBlocks) {
    if (/[{}"]/.test(p) && p.length > 80) {
      throw new Error(`[${name}] JSON-like <pre> dump found:\n${p.slice(0, 200)}…`);
    }
  }
  if (html.includes('"risk_matrix":') || html.includes('"force_readiness":')) {
    throw new Error(`[${name}] Raw JSON key syntax leaked into HTML`);
  }
}

function assertContains(html, needle, name) {
  if (!html.includes(needle)) {
    throw new Error(`[${name}] missing expected fragment: ${needle}`);
  }
}

function runCase(label, payload) {
  const el = React.createElement(AIResultDisplay, { result: payload, feature: label, title: 'AI · ' + label });
  const html = renderToStaticMarkup(el);
  assertNoJsonDump(html, label);
  return html;
}

let ok = true;
function expect(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    ok = false;
    console.log(`✗ ${name}\n  ${e.message}`);
  }
}

expect('assess-risk renders structurally', () => {
  const html = runCase('assess-risk', assessRiskPayload);
  assertContains(html, 'ai-panel', 'assess-risk');
  assertContains(html, 'ai-classbar', 'assess-risk');
  assertContains(html, 'Executive Summary', 'assess-risk');
  assertContains(html, 'ai-hero-headline', 'assess-risk');
  assertContains(html, 'Tabletop Exercise', 'assess-risk');
  assertContains(html, 'ai-kpi', 'assess-risk');
  assertContains(html, 'sev-low', 'assess-risk');             // overall_risk_level badge
  assertContains(html, 'ai-table', 'assess-risk');            // risk_matrix as table
  assertContains(html, 'ai-tag', 'assess-risk');              // escalation_triggers as pills
});

expect('exec-brief unwraps inner `brief`', () => {
  const html = runCase('exec-brief', execBriefPayload);
  assertContains(html, 'OPERATIONAL READINESS: 73%', 'exec-brief');         // headline promoted
  assertContains(html, 'Fleet composition', 'exec-brief');                  // operational_picture as prose
  assertContains(html, 'ai-prose', 'exec-brief');                           // prose styling
  assertContains(html, 'ai-table', 'exec-brief');                           // top_risks / active_operations as table
  assertContains(html, 'ai-section', 'exec-brief');
});

expect('summary containing JSON gets rescued, not dumped', () => {
  const html = runCase('plan-mission', summaryWithJson);
  // headline from inner JSON should now show
  assertContains(html, 'Hidden by parser', 'rescue');
  // No <pre> JSON dump
  if (html.includes('"scores":')) throw new Error('inner JSON keys leaked as text');
});

expect('null result renders nothing', () => {
  const el = React.createElement(AIResultDisplay, { result: null, feature: 'x', title: 'x' });
  const html = renderToStaticMarkup(el);
  if (html.length > 0) throw new Error('expected empty output');
});

expect('loading state shows spinner', () => {
  const el = React.createElement(AIResultDisplay, { loading: true, feature: 'x', title: 'AI · X' });
  const html = renderToStaticMarkup(el);
  assertContains(html, 'spinner', 'loading');
  assertContains(html, 'UNCLASSIFIED // TABLETOP', 'loading');
});

expect('error state shows ai-error', () => {
  const el = React.createElement(AIResultDisplay, { error: 'Network error', feature: 'x', title: 'AI · X' });
  const html = renderToStaticMarkup(el);
  assertContains(html, 'ai-error', 'error');
  assertContains(html, 'Network error', 'error');
});

if (!ok) process.exit(1);
console.log('\nAll AIResultDisplay assertions passed.');
