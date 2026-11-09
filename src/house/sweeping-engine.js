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
    this.state = {brief:false,place:'outside',route:null,prepared:{container:false,dust:false},doorDOpen:false,doorBOpen:false,access:false,mirror:false,light:false,pre:false,tool:null,toolPlace:null,coverage:0,upper:0,lower:0,sweeping:false,sweepTarget:0,sweepProgress:0,collected:false,post:false,closed:false,complete:false,blocked:false,cutaway:false};
  }
  log(a, r) { this.events.push({at:new Date().toISOString(), action:a, result:r}); return r; }
  fail(t) { this.log('reject', t); throw new Error(t); }
  brief() { this.state.brief = true; return this.log('brief', 'Auftrag gelesen'); }
  enterHouse() { if (!this.state.brief) this.fail('Zuerst Auftrag lesen'); this.state.place = 'house'; return this.log('enter', 'Im Aufstellraum'); }
  route(route) {
    if (this.state.place !== 'house') this.fail('Zuerst in den Aufstellraum wechseln');
    if (!['A','B'].includes(route)) this.fail('Unbekannter Kehrweg');
    if (this.state.coverage > 0) this.fail('Kehrweg nach begonnenem Reinigungsgang nicht wechseln');
    if (this.blockReason === 'access') { this.state.blocked = false; this.blockReason = null; }
    this.state.route = route; this.state.access = false; this.state.pre = false; this.state.tool = null; this.state.toolPlace = null;
    return this.log('route', route);
  }
  prepareD({container = false, dust = false} = {}) {
    if (this.state.place !== 'D') this.fail('Zuerst zur unteren Reinigungsöffnung D wechseln');
    if (!this.state.route) this.fail('Zuerst Kehrweg wählen');
    if (!container || !dust) this.fail('Behälter und Staubschutz vorbereiten');
    this.state.prepared = {container:true, dust:true};
    this.state.doorDOpen = true;
    return this.log('prepareD', 'Untere Reinigungsöffnung geöffnet, Behälter und Staubschutz bereit');
  }
  goTo(place) {
    if (!['D','A','B'].includes(place)) this.fail('Unbekannter Arbeitsplatz');
    if (place === 'D') { this.state.place = 'D'; return this.log('move', 'An der unteren Reinigungsöffnung'); }
    if (!this.state.route) this.fail('Zuerst Kehrweg wählen');
    if (!this.state.prepared.container || !this.state.prepared.dust) this.fail('Zuerst D vorbereiten: Behälter und Staubschutz');
    if (!this.state.doorDOpen) this.fail('Untere Reinigungsöffnung D öffnen');
    if (place !== this.state.route) this.fail('Arbeitsplatz passt nicht zum gewählten Kehrweg');
    this.state.place = place;
    return this.log('move', 'Am Arbeitsplatz ' + place);
  }
  inspectAccess() {
    const s = this.scenario;
    if (this.state.place !== this.state.route) this.fail('Zuerst zum Arbeitsplatz wechseln');
    if (this.state.route === 'A' && (s.accessA !== 'safe' || s.platformADrop > 1.1)) { this.state.blocked = true; this.blockReason = 'access'; this.fail('Dachzugang / Standfläche A im Übungsfall nicht freigegeben'); }
    if (this.state.route === 'B' && (s.accessB !== 'safe' || s.openingBelowMouth > 5 || s.openingBelowMouth < 0)) { this.state.blocked = true; this.blockReason = 'access'; this.fail('Standfläche B / oberer Reinigungsweg im Übungsfall nicht geeignet'); }
    this.state.access = true;
    return this.log('access', 'Zugang und Standfläche im Übungsfall geprüft');
  }
  equip(tool) {
    if (!['mirror','light','rod','rope'].includes(tool)) this.fail('Werkzeug nicht verfügbar');
    if (tool === 'mirror') this.state.mirror = true;
    else if (tool === 'light') this.state.light = true;
    else {
      if (this.state.place !== this.state.route) this.fail('Kehrwerkzeug nur am zugehörigen Arbeitsplatz verwenden');
      this.state.tool = tool; this.state.toolPlace = this.state.place;
    }
    return this.log('equip', tool);
  }
  inspectFlue() {
    if (this.state.place !== this.state.route) this.fail('Zuerst zum Arbeitsplatz wechseln');
    if (!this.state.access) this.fail('Zuerst Zugang und Standfläche prüfen');
    if (!this.state.mirror || !this.state.light) this.fail('Spiegel und Taschenlampe zur Sichtkontrolle verwenden');
    this.state.pre = true;
    const labels = {'loose-soot':'Lockere Rußablagerungen','wire':'Leitung / elektrischer Fremdkörper im Schornstein','obstruction':'Hindernis im Reinigungsweg','glossy-soot':'Glanzrußverdacht','damage':'Schaden / Rissverdacht'};
    const finding = labels[this.scenario.defect] || 'Unbekannter Befund: fachlich klären';
    this.findings.push(finding);
    if (this.scenario.defect !== 'loose-soot') { this.state.blocked = true; this.blockReason = 'finding'; }
    return this.log('inspect', finding);
  }
  sweep(fraction = .25) {
    if (this.state.blocked) this.fail('Befund oder Zugang gesperrt: kein normaler Kehrabschluss');
    if (!this.state.pre) this.fail('Zuerst Schornstein kontrollieren');
    if (!this.scenario.applianceCold) this.fail('Geeigneten sicheren Anlagenzustand herstellen');
    if (!this.scenario.approvedBrush) this.fail('Werkzeug-/Systemeignung ungeklärt');
    if (this.state.place !== this.state.route) this.fail('Kehren nur am zugehörigen Arbeitsplatz');
    if (!Number.isFinite(fraction) || fraction <= 0 || fraction > .5) this.fail('Ungültiger Reinigungsschritt');
    if (this.state.route === 'A') {
      if (this.state.tool !== 'rope') this.fail('Von A verlangt diese Mission die Kehrleine nach unten');
    } else if (this.state.tool !== 'rod' && this.state.tool !== 'rope') {
      this.fail('Bei B: oberen Abschnitt mit Stoßbesen, unteren Abschnitt mit Kehrleine bearbeiten');
    }
    this.state.sweeping = true;
    this.state.sweepTarget = Math.min(1, this.state.sweepTarget + fraction);
    return this.log('sweep', 'Kehrschritt gestartet');
  }
  updateSweep(progress) {
    const s = this.state;
    if (!s.sweeping) return;
    s.sweepProgress = progress;
    if (s.route === 'A') { s.upper = progress; s.lower = progress; }
    else if (s.tool === 'rod') s.upper = progress;
    else if (s.tool === 'rope') s.lower = progress;
    s.coverage = (s.upper + s.lower) / 2;
    if (progress >= s.sweepTarget - 0.001) s.sweeping = false;
  }
  returnToD() {
    if (this.state.sweeping) this.fail('Kehrbewegung erst abschließen');
    if (this.state.coverage < 1 && !this.state.blocked) this.fail('Reinigung noch nicht abgeschlossen');
    this.state.place = 'D';
    return this.log('move', 'Zurück an der unteren Reinigungsöffnung');
  }
  collectAtD() {
    if (this.state.place !== 'D') this.fail('Zuerst zur unteren Reinigungsöffnung zurückkehren');
    if (this.state.coverage < 1) this.fail('Reinigung noch nicht abgeschlossen');
    if (this.state.blocked) this.fail('Befund gesperrt: keine normale Rußentnahme');
    if (!this.state.doorDOpen) this.fail('Untere Reinigungsöffnung öffnen');
    if (!this.state.prepared.container || !this.state.prepared.dust) this.fail('Behälter und Staubschutz fehlen');
    this.state.collected = true;
    return this.log('D', 'Ruß an der unteren Reinigungsöffnung entnommen');
  }
  inspectAtD() {
    if (this.state.place !== 'D') this.fail('Nachkontrolle nur an D');
    if (!this.state.collected) this.fail('Zuerst Ruß entnehmen');
    if (!this.state.mirror || !this.state.light) this.fail('Spiegel und Taschenlampe zur Nachkontrolle verwenden');
    const postDefect = this.scenario.postDefect || this.scenario.defect;
    if (postDefect !== 'loose-soot') { this.state.blocked = true; this.blockReason = 'finding'; this.findings.push('Auffälligkeit bei Nachkontrolle an D'); this.fail('Auffälliger Innenbefund: kein normaler Abschluss'); }
    this.state.post = true;
    return this.log('post', 'Nachkontrolle unauffällig');
  }
  closeOpenings() { if (!this.state.post) this.fail('Nachkontrolle fehlt'); this.state.doorDOpen = false; this.state.doorBOpen = false; this.state.closed = true; return this.log('close', 'Reinigungsöffnungen im Modell wieder geschlossen'); }
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
