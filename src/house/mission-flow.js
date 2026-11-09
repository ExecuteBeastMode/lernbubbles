import {Vector3} from '@babylonjs/core';
import {createSweepingRig} from './sweeping-rig.js';
import {SweepingMission, DEMO_JOB, KUEO_SOLID, validateJob} from './sweeping-engine.js';

const STYLE = `
#mission-ui{position:fixed;left:16px;top:16px;z-index:9;width:370px;max-height:95vh;overflow:auto;padding:14px;color:#eef5f8;background:#101e2ddd;border:1px solid #688093;border-radius:14px;font:13px system-ui;backdrop-filter:blur(9px)}
#mission-ui button,#mission-ui select{color:inherit;background:#263d52;border:1px solid #8093a1;border-radius:8px;padding:7px;margin:3px;cursor:pointer}
#mission-ui button.on{outline:2px solid #7ed1c2}
#mission-ui .tour{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;margin:2px;border-radius:50%;border:2px solid #16232c;color:#111;background:#eef0e7;font-weight:bold}
#mission-ui .tour.done{background:#10151b;color:#fff}
#mission-ui .tour.active{outline:3px solid #76c9c5}
#mission-ui .tour.measure{border-color:#de741e;color:#c9570b}
#mission-ui .tour.measure.done{background:#de741e;color:#fff}
#mission-ui .status{padding:10px;background:#091521;border-radius:8px;min-height:38px}
#mission-ui .fault{color:#ffc8a2}
#mission-ui label{display:block;margin:5px}
#mission-ui pre{white-space:pre-wrap;max-height:150px;overflow:auto}
#mission-ui small{color:#c4d1db}`;

const HTML = `
<style>${STYLE}</style>
<small>FIKTIVER ÜBUNGSAUFTRAG · vor Hauszutritt</small>
<h2>Kehrmission</h2>
<p><b id="m-address"></b><br><span id="m-owner"></span></p>
<div id="m-circles"></div>
<small id="m-frequency"></small>
<details>
  <summary>Auftrag / Szenario</summary>
  <p>Festbrennstoff-Schornstein als separater Zug. Messung M bleibt eigener Auftrag.</p>
  <label>KÜO-Kategorie
    <select id="m-cat">
      <option value="1.1">1.1 · 4/Jahr</option>
      <option value="1.2">1.2 · 3/Jahr</option>
      <option value="1.3">1.3 · Pellets · 2/Jahr</option>
      <option value="1.6" selected>1.6 · 2/Jahr</option>
      <option value="1.7">1.7 · 1/Jahr</option>
    </select>
  </label>
  <label>Aktive Tour
    <select id="m-tour"></select>
  </label>
  <label>Innenbefund
    <select id="m-scenario">
      <option value="loose-soot">Lockerer Ruß</option>
      <option value="wire">Leitung im Zug</option>
      <option value="obstruction">Hindernis</option>
      <option value="glossy-soot">Glanzrußverdacht</option>
      <option value="damage">Schaden / Rissverdacht</option>
    </select>
  </label>
  <label><input id="m-accessfault" type="checkbox"> Zugang A/B mangelhaft</label>
  <small>Kategorien sind reduzierte Übungsfälle. Häufigkeit immer am echten Feuerstättenbescheid prüfen. K1–K4 sind betriebliche Tourcodes.</small>
</details>
<p id="m-state"></p>
<p id="m-hint" class="status">Auftrag lesen.</p>
<button id="m-brief">Auftrag lesen</button>
<button id="m-enter">Haus betreten / Heizraum</button>
<button id="m-A">A · Dach / nach unten</button>
<button id="m-B">B · oben stoßen + unten kehren</button>
<button id="m-access">Zugang prüfen</button>
<div>
  <button data-tool="mirror">Spiegel</button>
  <button data-tool="light">Taschenlampe</button>
  <button data-tool="rod">Stoßbesen ↑</button>
  <button data-tool="rope">Kehrleine ↓</button>
</div>
<button id="m-inspect">Zug vorab kontrollieren</button>
<button id="m-sweep">Kehrschritt</button>
<label><input id="m-container" type="checkbox"> Behälter vorbereitet</label>
<label><input id="m-dust" type="checkbox"> Staubschutz vorbereitet</label>
<button id="m-D">Ruß an D entnehmen</button>
<button id="m-post">D innen nachkontrollieren</button>
<button id="m-close">Öffnungen schließen</button>
<button id="m-finish">K-Tour abschließen</button>
<button id="m-measure">Messmodul / M</button>
<p id="m-finding" class="fault"></p>
<details>
  <summary>Protokoll</summary>
  <pre id="m-log"></pre>
  <button id="m-export">JSON-Protokoll speichern</button>
</details>
<small>Keine DIN-Abnahme und keine reale Arbeitsfreigabe. Hindernis, Leitung, Glanzruß oder Schaden sperren den Normalabschluss.</small>`;

export function installMissionFlow(scene, camera) {
  const $ = id => document.getElementById(id);
  const rig = createSweepingRig(scene, new Vector3(-1.8, 0, -2.8));

  const ui = document.createElement('aside');
  ui.id = 'mission-ui';
  ui.innerHTML = HTML;
  document.body.append(ui);

  const job = JSON.parse(JSON.stringify(DEMO_JOB));
  job.kueo = '1.6';
  job.tours = ['K1', 'K3'];
  job.completed = ['K1'];
  job.activeTour = 'K3';

  let scenario = 'loose-soot';
  let mission = null;
  let stage = 0;

  function fillTours() {
    $('m-tour').innerHTML = job.tours
      .map(tour => `<option value="${tour}">${tour}</option>`)
      .join('');
    $('m-tour').value = job.activeTour;
  }

  function reset() {
    mission = new SweepingMission(job, {
      accessA: $('m-accessfault').checked ? 'unsafe' : 'safe',
      accessB: $('m-accessfault').checked ? 'unsafe' : 'safe',
      openingBelowMouth: 1.85,
      platformADrop: 1,
      applianceCold: true,
      defect: scenario,
      approvedBrush: true
    });

    rig.setDefect(scenario);
    rig.setLight(false);
    rig.open('D', false);
    rig.open('B', false);

    draw();
  }

  function say(text, fault = false) {
    $('m-hint').textContent = text;
    $('m-hint').className = 'status' + (fault ? ' fault' : '');
  }

  function draw() {
    const j = mission.job;
    const rule = validateJob(j);
    const s = mission.state;

    $('m-address').textContent = j.address;
    $('m-owner').textContent = j.owner;
    $('m-frequency').textContent =
      rule.count + ' Kehrungen/Jahr · Übungskategorie ' + j.kueo;

    $('m-circles').innerHTML =
      j.tours.map(tour =>
        `<span class="tour ${j.completed.includes(tour) ? 'done' : ''} ${tour === j.activeTour ? 'active' : ''}">${tour}</span>`
      ).join('') +
      `<span class="tour measure ${j.measurements.length ? 'done' : ''}">M</span>`;

    $('m-state').textContent =
      (stage < 2 ? 'Außerhalb / Zugang' : 'Im Haus / Heizraum') +
      ' · Weg ' + (s.route || 'offen') +
      ' · oben ' + Math.round(s.upper * 100) + ' %' +
      ' · unten ' + Math.round(s.lower * 100) + ' %' +
      ' · ' + (s.blocked ? 'GESPERRT' : s.complete ? 'erledigt' : 'offen');

    $('m-log').textContent = mission.events
      .map(event => event.action + ': ' + event.result)
      .join('\n');

    $('m-finding').textContent = mission.findings.join(' · ');

    document.querySelectorAll('[data-tool]').forEach(button => {
      const tool = button.dataset.tool;
      const active =
        (tool === 'mirror' && s.mirror) ||
        (tool === 'light' && s.light) ||
        s.tool === tool;
      button.classList.toggle('on', active);
    });

    rig.setLight(s.light);
    rig.update({...s});
  }

  function act(action) {
    try {
      const result = action();
      say(typeof result === 'string' ? result : 'Aktion protokolliert.');
    } catch (error) {
      say(error.message, true);
    }
    draw();
  }

  function lookAt(position, offset) {
    camera.position.copyFrom(position.add(offset));
    camera.setTarget(position);
  }

  $('m-cat').onchange = () => {
    const key = $('m-cat').value;
    const rule = KUEO_SOLID[key];
    if (!rule) return;

    job.kueo = key;
    job.tours = ['K1', 'K2', 'K3', 'K4'].slice(0, rule.count);
    job.completed = [];
    job.activeTour = job.tours[0];

    fillTours();
    reset();
  };

  $('m-tour').onchange = () => {
    if (mission.state.coverage > 0) {
      $('m-tour').value = job.activeTour;
      return say('Tour nicht wechseln, solange der Reinigungsgang läuft.', true);
    }
    job.activeTour = $('m-tour').value;
    reset();
  };

  $('m-scenario').onchange = () => {
    scenario = $('m-scenario').value;
    reset();
  };

  $('m-accessfault').onchange = reset;

  $('m-brief').onclick = () => act(() => mission.brief());

  $('m-enter').onclick = () => {
    if (!mission.state.brief) {
      return say('Lies zuerst den Auftrag.', true);
    }

    stage = Math.min(2, stage + 1);

    if (stage === 1) {
      camera.position.set(0, 1.65, 6.2);
      camera.setTarget(new Vector3(0, 1.5, 3));
      say('Vor dem Haus: Auftrag und Zugang klären.');
    } else {
      camera.position.set(-1.8, 1.65, 0.7);
      camera.setTarget(new Vector3(-1.8, 1, -2.8));
      say('Im Aufstellraum: Der Festbrennstoffzug ist von der Heizungsanlage getrennt.');
    }

    draw();
  };

  $('m-A').onclick = () => act(() => mission.route('A'));
  $('m-B').onclick = () => act(() => mission.route('B'));

  $('m-access').onclick = () => {
    act(() => mission.inspectAccess());

    if (mission.state.access) {
      lookAt(rig.anchors[mission.state.route], new Vector3(0, 0.8, 1.2));
    }
  };

  document.querySelectorAll('[data-tool]').forEach(button => {
    button.onclick = () => {
      const tool = button.dataset.tool;

      act(() => mission.equip(tool));

      if (tool === 'mirror') rig.setMirrorPose(new Vector3(-1.8, 1.5, -1));
      if (tool === 'light') rig.setFlashPose(new Vector3(-1.7, 1.5, -1));
    };
  });

  $('m-inspect').onclick = () => act(() => mission.inspectFlue());
  $('m-sweep').onclick = () => act(() => mission.sweep(0.25));

  $('m-D').onclick = () => act(() => mission.collectAtD({
    container: $('m-container').checked,
    dustProtection: $('m-dust').checked
  }));

  $('m-post').onclick = () => {
    act(() => mission.inspectAtD());

    if (mission.state.post) {
      rig.open('D', true);
      lookAt(rig.anchors.D, new Vector3(0, 1.2, 1.2));
    }
  };

  $('m-close').onclick = () => {
    act(() => mission.closeOpenings());

    if (mission.state.closed) {
      rig.open('D', false);
      rig.open('B', false);
    }
  };

  $('m-finish').onclick = () => act(() => mission.finish());

  $('m-measure').onclick = () => say(
    'M bleibt offen: Der Messauftrag braucht ein gültiges Protokoll aus dem Messmodul.'
  );

  $('m-export').onclick = () => {
    const url = URL.createObjectURL(new Blob(
      [JSON.stringify(mission.report(), null, 2)],
      {type: 'application/json'}
    ));

    const link = document.createElement('a');
    link.href = url;
    link.download = 'kehrmission-protokoll.json';
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  $('m-cat').value = job.kueo;
  fillTours();
  reset();

  return {
    reset,
    rig,
    get mission() { return mission; },
    dispose() {
      rig.dispose();
      ui.remove();
    }
  };
}
