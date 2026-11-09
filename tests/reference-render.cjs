const {captureScene} = require('./capture-scene.cjs');
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const app = path.join(root, 'app');
const out = path.join(root, 'build', 'reference-screenshots');
fs.mkdirSync(out, {recursive: true});

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let file;
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    file = path.resolve(app, '.' + decodeURIComponent(url.pathname));
  } catch (error) {
    res.writeHead(400);
    return res.end();
  }
  if (!file.startsWith(app + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  let browser;
  const checks = [];
  const errors = [];
  const external = [];
  const diagnostics = [];

  try {
    const origin = 'http://127.0.0.1:' + server.address().port;

    browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
    });

    const context = await browser.newContext({
      viewport: {width: 1600, height: 1000},
      deviceScaleFactor: 1
    });

    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) {
        return route.continue();
      }
      external.push(url);
      return route.abort();
    });

    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));

    const shot = name => captureScene(page, path.join(out, name + '.png'));
    const hint = () => page.locator('#hint').innerText();

    // ---------- Heizraum-Simulation ----------
    await page.goto(origin + '/heizraum3d.html');
    await page.waitForFunction(() => document.querySelector('#device')?.options.length === 11);
    await page.selectOption('#device', 'c93x');
    await page.click('#enter');
    await page.click('#enter');
    await page.locator('details').filter({has: page.locator('#fault')}).evaluate(e => { e.open = true; });
    await page.selectOption('#fault', 'empty');
    await page.click('#siphon');
    await page.click('#power');
    assert.match(await page.locator('#status').innerText(), /Übungssperre/);
    checks.push('C93x-Siphonfehler sperrt Start');
    await shot('01-fault');

    await page.selectOption('#fault', 'ok');
    await page.click('#siphon');
    await page.click('#power');
    await page.waitForFunction(() => document.querySelector('#power').textContent.includes('ausschalten'));
    await page.click('#service');
    await page.selectOption('#speed', '10');
    for (let i = 0; i < 3; i++) {
      await page.locator('#v' + i).fill('0');
      await page.locator('#v' + i).dispatchEvent('input');
    }
    await page.waitForFunction(() => parseFloat(document.querySelector('#temp').textContent) > 30);
    checks.push('Vorlauf reagiert bei geschlossenen Heizflächen');

    await page.click('#power');
    await page.waitForFunction(() => document.querySelector('#service').textContent === 'Simulations-Messbetrieb');
    checks.push('Ausschalten beendet den Simulations-Messbetrieb');

    // ---------- Haus-Viewer ----------
    async function openHouse() {
      await page.goto(origin + '/house/index.html?test=1');
      await page.waitForFunction(() => window.__referenceTest?.ready());
      await page.waitForTimeout(1500);
    }

    async function focus(name, variant = 0) {
      const result = await page.evaluate(([n, v]) => window.__referenceTest.focus(n, v), [name, variant]);
      diagnostics.push(result);
      console.log('focus ' + JSON.stringify(result));
      return result;
    }

    async function click(name) {
      await focus(name);
      const p = await page.evaluate(n => window.__referenceTest.project(n), name);
      assert(p.insideCanvas, '3D-Ziel nicht im Bild: ' + JSON.stringify(p));
      assert(p.hitNames.includes(name), '3D-Ziel verdeckt oder falsch getroffen: ' + JSON.stringify(p));
      console.log('click ' + JSON.stringify(p));
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(250);
    }

    await openHouse();
    assert(await page.evaluate(() => window.__referenceTest.meshes()) > 218);
    await shot('02-room');
    checks.push('Haus mit Grafikdetails und lokalem Licht gestartet');

    await click('siphon:body');
    assert.match(await hint(), /Siphon/);
    await shot('03-siphon');
    await click('control:power');
    assert.match(await hint(), /Kessel eingeschaltet/);
    await shot('04-controls');
    checks.push('Siphon und Kesselknopf tatsächlich in 3D angeklickt');

    await click('control:mode');
    assert.match(await hint(), /Messbetrieb aktiv/);
    await click('control:power');
    assert.match(await hint(), /Kessel ausgeschaltet/);
    await click('control:power');
    assert.match(await hint(), /Kessel eingeschaltet/);
    await click('control:mode');
    assert.match(await hint(), /Messbetrieb aktiv/);
    await click('control:mode');
    assert.match(await hint(), /Messbetrieb beendet/);
    checks.push('3D-Neustart übernimmt keinen alten Messbetrieb');

    await click('radiator:kitchen:valve');
    assert.match(await hint(), /0 %/);
    checks.push('Heizkörperventil tatsächlich in 3D angeklickt');

    await focus('appliance:casing');
    await shot('05-reference-boiler');

    // ---------- Standflächen A, B, D ----------
    // Mindestens eine Ansicht muss die Standfläche zuerst treffen. Alle Versuche werden protokolliert.
    const workplaces = [
      ['Standfläche A', 'ground', '06-stand-a'],
      ['Standfläche B', 'ground', '07-stand-b'],
      ['Standfläche D', 'basement', '08-stand-d']
    ];

    for (const [name, floor, screenshot] of workplaces) {
      const attempts = [];
      let found = null;

      for (let variant = 0; ; variant++) {
        let p;
        try {
          p = await focus(name, variant);
        } catch (error) {
          if (/Keine weitere Ansicht/.test(error.message)) break;
          throw error;
        }
        attempts.push({variant, camera: p.camera, insideCanvas: p.insideCanvas, depth: p.z, hitNames: p.hitNames});
        if (p.floor === floor && p.insideCanvas && p.z > 0 && p.z < 1 && p.hitNames.includes(name)) {
          found = p;
          break;
        }
      }

      assert(found, name + ' aus keiner Ansicht frei sichtbar: ' + JSON.stringify(attempts));
      await shot(screenshot);
      checks.push(name + ' sichtbar und vom Pick-Strahl zuerst getroffen (Ansicht ' + found.variant + ')');
    }

    // ---------- Kehrmission über die Oberfläche ----------
    const tx = selector => page.locator(selector).innerText();
    const press = selector => page.click(selector);
    const doneTours = () => page.locator('#m-circles .tour:not(.measure).done').count();

    async function prepareRouteA() {
      await press('#m-brief');
      await press('#m-enter');
      await press('#m-enter');
      await press('#m-A');
      await press('#m-access');
      await press('[data-tool="mirror"]');
      await press('[data-tool="light"]');
      await press('[data-tool="rope"]');
    }

    await openHouse();
    assert.equal(await doneTours(), 1, 'K1 sollte zu Beginn erledigt sein');
    await press('#m-A');
    assert.match(await tx('#m-hint'), /Auftrag/, 'Weg ohne Auftrag muss abgelehnt werden');

    await prepareRouteA();
    await press('#m-inspect');
    for (let i = 0; i < 4; i++) await press('#m-sweep');
    assert.match(await tx('#m-state'), /oben 100 %/);
    await press('#m-D');
    assert.match(await tx('#m-hint'), /vorbereiten/, 'Rußentnahme ohne Behälter muss scheitern');
    await page.check('#m-container');
    await page.check('#m-dust');
    await press('#m-D');
    await press('#m-post');
    await press('#m-close');
    await press('#m-finish');
    assert.match(await tx('#m-state'), /erledigt/);
    assert.equal(await doneTours(), 2, 'K3 sollte erledigt sein');
    assert.equal(await page.locator('#m-circles .tour.measure.done').count(), 0, 'M darf nicht erledigt sein');
    await press('#m-measure');
    assert.match(await tx('#m-hint'), /M bleibt offen/);
    await shot('09-mission-complete');
    checks.push('Kehrmission Weg A bis zum Abschluss; Messauftrag M bleibt offen');

    await openHouse();
    await page.locator('#mission-ui details').first().evaluate(e => { e.open = true; });
    await page.selectOption('#m-scenario', 'wire');
    await prepareRouteA();
    await press('#m-inspect');
    await press('#m-sweep');
    assert.match(await tx('#m-hint'), /gesperrt/);
    assert.match(await tx('#m-state'), /GESPERRT/);
    await press('#m-finish');
    assert.match(await tx('#m-hint'), /nicht vollständig/);
    assert.equal(await doneTours(), 1, 'gesperrte Tour darf nicht erledigt werden');
    checks.push('Leitung im Schornstein sperrt den Kehrabschluss');

    await openHouse();
    await page.locator('#mission-ui details').first().evaluate(e => { e.open = true; });
    await page.check('#m-accessfault');
    await press('#m-brief');
    await press('#m-A');
    await press('#m-access');
    assert.match(await tx('#m-hint'), /nicht freigegeben/);
    await press('#m-B');
    await press('#m-access');
    assert.match(await tx('#m-hint'), /nicht geeignet/);
    checks.push('Zugangsmangel sperrt Weg A und Weg B');

    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);

    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({
      passed: true,
      checks,
      errors,
      external,
      diagnostics,
      limits: [
        'WebGL via SwiftShader, kein installierter Windows-Test.',
        'Grafikqualität muss anhand der Screenshots visuell abgenommen werden.',
        'Testkamera nutzt festgelegte Standorte; echte Gehwege und Treppen separat prüfen.',
        'Kehrmission ist ein Übungsmodell: keine DIN-Abnahme, keine reale Arbeitsfreigabe.'
      ]
    }, null, 2));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({
      passed: false,
      checks,
      errors,
      external,
      diagnostics,
      error: error.stack
    }, null, 2));

    if (browser) {
      for (const context of browser.contexts()) {
        for (const page of context.pages()) {
          try { await captureScene(page, path.join(out, 'failure.png')); } catch (ignore) { /* Screenshot optional */ }
        }
      }
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
