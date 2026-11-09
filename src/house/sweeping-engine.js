export const KUEO_SOLID = {
  '1.1': {count:4, label:'Ganzjährig regelmäßig benutzt'},
  '1.2': {count:3, label:'Regelmäßig in der üblichen Heizperiode'},
  '1.3': {count:2, label:'Holzpellet-Feuerstätte'},
  '1.5': {count:2, label:'Nach § 15 1. BImSchV wiederkehrend zu überwachen'},
  '1.6': {count:2, label:'Mehr als gelegentlich, aber nicht regelmäßig'},
  '1.7': {count:1, label:'Gelegentlich benutzt'}
};
export const DEMO_JOB = {id:'demo-haus-01',year:2026,address:'Beispielweg 12, Beispielort',owner:'Musterfamilie — fiktiver Übungsauftrag',appliance:'Festbrennstoff-Schornstein, getrennt vom Gas-Brennwertgerät',kueo:'1.6',tours:['K1','K3'],completed:['K1'],activeTour:'K3',measurementDue:true,measurements:[],source:'https://www.gesetze-im-internet.de/k_o/anlage_1.html'};
export function validateJob(job) {
  const rule = KUEO_SOLID[job.kueo];
  if (!rule) throw new Error('KÜO-Zuordnung nicht im Prüfbestand');
  if (new Set(job.tours).size !== job.tours.length) throw new Error('Touren enthalten Duplikate');
  if (job.tours.some(t => !/^K[1-4]$/.test(t))) throw new Error('Touren ungültig');
  if (job.tours.length !== rule.count) throw new Error('Tourenzahl passt nicht zur gewählten KÜO-Kategorie');
  if (!job.tours.includes(job.activeTour)) throw new Error('Aktive Tour fehlt');
  return rule;
}
export class SweepingMission {
  constructor(job = DEMO_JOB, scenario = {}) {
    this.job = JSON.parse(JSON.stringify(job)); validateJob(this.job);
    this.scenario = {accessA:'safe',accessB:'safe',openingBelowMouth:1.85,platformADrop:1,applianceCold:true,defect:'loose-soot',approvedBrush:true,...scenario};
    this.events = []; this.findings = []; this.blockReason = null;
    this.state = {brief:false,route:null,access:false,mirror:false,light:false,pre:false,tool:null,coverage:0,upper:0,lower:0,collected:false,post:false,closed:false,complete:false,blocked:false};
  }
  log(a, r) { this.events.push({at:new Date().toISOString(), action:a, result:r}); return r; }
  fail(t) { this.log('reject', t); throw new Error(t); }
  brief() { this.state.brief = true; return this.log('brief', 'Auftrag gelesen'); }
  route(route) {
    if (!this.state.brief) this.fail('Zuerst Auftrag lesen');
    if (!['A','B'].includes(route)) this.fail('Unbekannter Kehrweg');
    if (this.state.coverage > 0) this.fail('Kehrweg nach begonnenem Reinigungsgang nicht wechseln');
    if (this.blockReason === 'access') { this.state.blocked = false; this.blockReason = null; }
    this.state.route = route; this.state.access = false; this.state.pre = false;
    return this.log('route', route);
  }
  inspectAccess() {
    const s = this.scenario;
    if (!this.state.route) this.fail('Kehrweg wählen');
    if (this.state.route === 'A' && (s.accessA !== 'safe' || s.platformADrop > 1.1)) { this.state.blocked = true; this.blockReason = 'access'; this.fail('Dachzugang / Standfläche A im Übungsfall nicht freigegeben'); }
    if (this.state.route === 'B' && (s.accessB !== 'safe' || s.openingBelowMouth > 5 || s.openingBelowMouth < 0)) { this.state.blocked = true; this.blockReason = 'access'; this.fail('Standfläche B / oberer Reinigungsweg im Übungsfall nicht geeignet'); }
    this.state.access = true;
    return this.log('access', 'Sichtprüfung im Modell erfolgt; keine reale DIN-Zertifizierung');
  }
  equip(tool) {
    if (!['mirror','light','rod','rope'].includes(tool)) this.fail('Werkzeug nicht verfügbar');
    if (tool === 'mirror') this.state.mirror = true; else if (tool === 'light') this.state.light = true; else this.state.tool = tool;
    return this.log('equip', tool);
  }
  inspectFlue() {
    if (!this.state.access) this.fail('Zuerst Verkehrsweg und Standfläche prüfen');
    if (!this.state.mirror || !this.state.light) this.fail('Spiegel und Taschenlampe zur Sichtkontrolle verwenden');
    this.state.pre = true;
    const labels = {'loose-soot':'Lockere Rußablagerungen','wire':'Leitung / elektrischer Fremdkörper im Schornstein','obstruction':'Hindernis im Reinigungsweg','glossy-soot':'Glanzrußverdacht','damage':'Schaden / Rissverdacht'};
    const finding = labels[this.scenario.defect] || 'Unbekannter Befund: fachlich klären';
    this.findings.push(finding);
    if (this.scenario.defect !== 'loose-soot') { this.state.blocked = true; this.blockReason = 'finding'; }
    return this.log('inspect', finding);
  }
  sweep(fraction = .25) {
    if (this.state.blocked) this.fail('Befund / Zugang gesperrt: kein normaler Kehrabschluss');
    if (!this.state.pre) this.fail('Vorher Schornstein kontrollieren');
    if (!this.scenario.applianceCold) this.fail('Geeigneten sicheren Anlagenzustand herstellen');
    if (!this.scenario.approvedBrush) this.fail('Werkzeug-/Systemeignung ungeklärt');
    if (!Number.isFinite(fraction) || fraction <= 0 || fraction > .5) this.fail('Ungültiger Reinigungsschritt');
    if (this.state.route === 'A') {
      if (this.state.tool !== 'rope') this.fail('Von A verlangt diese Mission die Kehrleine nach unten');
      this.state.upper = Math.min(1, this.state.upper + fraction); this.state.lower = this.state.upper;
    } else {
      if (this.state.tool === 'rod') this.state.upper = Math.min(1, this.state.upper + fraction);
      else if (this.state.tool === 'rope') this.state.lower = Math.min(1, this.state.lower + fraction);
      else this.fail('Bei B: oberen Abschnitt mit Stoßbesen, unteren Abschnitt mit Kehrleine bearbeiten');
    }
    this.state.coverage = (this.state.upper + this.state.lower) / 2;
    return this.log('sweep', this.state.coverage);
  }
  collectAtD({container = false, dustProtection = false} = {}) {
    if (this.state.coverage < 1 || this.state.blocked) this.fail('Reinigung noch nicht abgeschlossen oder gesperrt');
    if (!container || !dustProtection) this.fail('Rußentnahme vorbereiten: Behälter und Staubschutz');
    this.state.collected = true; return this.log('D', 'Ruß an unterer Reinigungsöffnung entnommen');
  }
  inspectAtD() {
    if (!this.state.collected || !this.state.mirror || !this.state.light) this.fail('Rußentnahme sowie Spiegel-/Lichtkontrolle fehlen');
    const postDefect = this.scenario.postDefect || this.scenario.defect;
    if (postDefect !== 'loose-soot') { this.state.blocked = true; this.blockReason = 'finding'; this.findings.push('Auffälligkeit bei Nachkontrolle an D'); this.fail('Auffälliger Innenbefund: kein normaler Abschluss'); }
    this.state.post = true; return this.log('post', 'Untere Sichtkontrolle im Szenario unauffällig');
  }
  closeOpenings() { if (!this.state.post) this.fail('Nachkontrolle fehlt'); this.state.closed = true; return this.log('close', 'Reinigungsöffnungen im Modell wieder geschlossen'); }
  finish() {
    const s = this.state;
    if (s.blocked || !s.closed || !s.post || !s.collected || s.coverage < 1) this.fail('Kehrtour nicht vollständig abgeschlossen');
    s.complete = true; if (!this.job.completed.includes(this.job.activeTour)) this.job.completed.push(this.job.activeTour);
    return this.log('finish', this.job.activeTour);
  }
  recordMeasurement(e) {
    if (!this.job.measurementDue) this.fail('Kein Messauftrag');
    if (!e || e.source !== 'measurement-module' || e.valid !== true || !e.protocolId) this.fail('Gültiges Protokoll aus dem Messmodul erforderlich');
    this.job.measurements.push(e); return this.log('measurement', e.protocolId);
  }
  report() {
    return {notice:'Übungsprotokoll, keine amtliche Bescheinigung oder reale Arbeitsfreigabe', job:this.job, state:this.state, findings:this.findings, events:this.events,
      combinedComplete:this.state.complete && (!this.job.measurementDue || this.job.measurements.length > 0),
      limits:['Nur ausgewählte KÜO-Festbrennstoffkategorien, keine vollständige Bescheid-/Ausnahmenlogik.','Tourennamen sind betriebliche Planung, keine KÜO-Vorgabe.','Zugangsprüfungen sind Szenariobedingungen, keine vollständige DIN-Abnahme.','Keine Glanzruß-Spezialreinigung oder Elektroarbeiten.']};
  }
}
