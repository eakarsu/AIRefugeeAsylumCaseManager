// End-to-end preview: hits the live backend, runs an AI feature, then
// renders the result through AIResultDisplay and writes the HTML to disk.

const babel = require('@babel/core');
const fs = require('fs');
const Module = require('module');
const http = require('http');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const origCompile = Module.prototype._compile;
Module.prototype._compile = function (content, filename) {
  if (filename.includes('/src/')) {
    const out = babel.transformSync(content, {
      filename,
      presets: [['@babel/preset-env', { targets: { node: 'current' } }],
                ['@babel/preset-react', { runtime: 'classic' }]],
      babelrc: false, configFile: false,
    });
    return origCompile.call(this, out.code, filename);
  }
  return origCompile.call(this, content, filename);
};

const AIResultDisplay = require('./src/components/AIResultDisplay').default;

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost', port: 3011, path, method,
      headers: { 'Content-Type': 'application/json',
                 ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
                 ...headers },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(new Error('bad json: ' + buf.slice(0, 200))); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const { token } = await req('POST', '/api/auth/login', { email: 'commander@defense.mil', password: 'secure123' });
  const auth = { Authorization: `Bearer ${token}` };

  const cases = [
    { feature: 'assess-risk', title: 'AI · Assess Risk',
      body: { scenario: 'Forward-deploy a Carrier Strike Group to Eastern Med within 96 hours.',
              context: { notes: 'Hezbollah rocket threat; Suez uncertain.' } } },
    { feature: 'exec-brief', title: 'AI · Executive Brief',
      body: { notes: 'Focus on INDOPACOM.' } },
  ];

  const sections = [];
  for (const c of cases) {
    const result = await req('POST', '/api/ai/' + c.feature, c.body, auth);
    const html = renderToStaticMarkup(
      React.createElement(AIResultDisplay, { result, feature: c.feature, title: c.title })
    );

    // Quick sanity: no raw JSON-key strings in output
    const leaks = ['"risk_matrix":', '"force_readiness":', '"phases":', '"snapshot":'];
    const found = leaks.filter((s) => html.includes(s));
    console.log(`[${c.feature}] HTML length=${html.length}  leaks=${found.length === 0 ? 'none ✓' : found.join(', ')}`);
    sections.push(`<h1 style="color:#94a3b8;font-family:system-ui;padding:24px 32px 0;letter-spacing:1px;text-transform:uppercase;font-size:13px;">${c.title}</h1>\n<div style="padding:0 32px 32px;">${html}</div>`);
  }

  // Pull CSS so the preview is properly styled
  const css = fs.readFileSync('./src/App.css', 'utf8') + '\n' + fs.readFileSync('./src/index.css', 'utf8');
  const page = `<!doctype html><html><head><meta charset="utf-8"><title>AI Display Preview</title>
<style>${css}</style>
</head><body>
${sections.join('\n')}
</body></html>`;
  fs.writeFileSync('/tmp/ai_display_preview.html', page);
  console.log('\nWrote /tmp/ai_display_preview.html (open it in a browser to compare).');
})().catch((e) => { console.error(e); process.exit(1); });
