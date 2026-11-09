const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const REPO='ExecuteBeastMode/lernbubbles',TAG='v0.0.0-reference-room',TITLE='Referenz-Heizraum — automatischer Prüfbericht, kein Installer';
function scrub(value){return String(value).replace(/\x1b\[[0-9;]*m/g,'').replace(/\b(?:ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+)\b/g,'[REDACTED]').replace(/(authorization:\s*(?:bearer|token)\s+)\S+/gi,'$1[REDACTED]').replace(/([?&](?:token|secret|key)=)[^&\s]+/gi,'$1[REDACTED]')}
function prepare(root,sha){
 const dir=path.join(root,'build','reference-screenshots');fs.mkdirSync(dir,{recursive:true});let report;
 try{report=JSON.parse(fs.readFileSync(path.join(dir,'result.json'),'utf8'));if(!report||typeof report!=='object'||Array.isArray(report))throw Error('Berichtsformat ungültig')}catch(e){report={passed:false,error:'Kein gültiger Browserbericht vorhanden; möglicherweise Abbruch vor dem Browsertest.'}}
 const safe={commit:sha,passed:report.passed===true,checks:Array.isArray(report.checks)?report.checks:[],errors:report.errors||[],external:report.external||[],error:report.error||null,limits:['Automatisierter Entwicklungsbericht, keine Freigabe der Grafikqualität.','Screenshots visuell prüfen; installierter Windows-/Electron-Test bleibt separat.']};
 const assetsDir=path.join(root,'build','reference-report-assets');fs.mkdirSync(assetsDir,{recursive:true});const assets=[];
 for(const name of fs.readdirSync(dir).filter(n=>/^(?:[0-9]{2}-[a-z0-9-]+|failure)\.png$/i.test(n))){const target=path.join(assetsDir,sha.slice(0,8)+'-'+name);fs.copyFileSync(path.join(dir,name),target);assets.push(target)}
 const json=path.join(assetsDir,sha.slice(0,8)+'-result.json');fs.writeFileSync(json,scrub(JSON.stringify(safe,null,2)));assets.push(json);
 const lines=['# Referenz-Heizraum: Entwicklungsbericht','',safe.passed?'Browserbericht meldet: BESTANDEN.':'Browserbericht meldet: NICHT BESTANDEN / NICHT VOLLSTÄNDIG.','','Commit: '+sha,'','Kein Installer und keine fertige Simulation.','','```json',scrub(JSON.stringify(safe,null,2)),'```','','## Zugehörige Dateien'];
 for(const file of assets){const name=path.basename(file);lines.push('- ['+name+'](https://github.com/'+REPO+'/releases/download/'+TAG+'/'+encodeURIComponent(name)+')')}
 for(const log of ['build.log','browser.log']){const file=path.join(dir,log);if(fs.existsSync(file))lines.push('','## '+log+' — letzter Ausschnitt','```text',scrub(fs.readFileSync(file,'utf8').slice(-6000)).replace(/```/g,'[code fence removed]'),'```')}
 const notes=path.join(dir,'publish-notes.md');fs.writeFileSync(notes,lines.join('\n'));return {notes,assets,safe};
}
function publish(options={}){
 const root=options.root||path.join(__dirname,'..'),sha=options.sha||process.env.GITHUB_SHA;if(!/^[a-f0-9]{40}$/i.test(sha||''))throw Error('Gültige Commit-SHA fehlt');
 const run=options.run||((args)=>spawnSync('gh',args,{encoding:'utf8',env:process.env})),prepared=prepare(root,sha);
 function checked(args){const r=run(args);if(r.status!==0)throw Error(scrub(r.stderr||r.stdout||'GitHub CLI fehlgeschlagen'));return r}
 const existing=run(['release','view',TAG,'--repo',REPO,'--json','tagName,isPrerelease']);
 if(existing.status===0){const meta=JSON.parse(existing.stdout);if(!meta.isPrerelease)throw Error('Bestehende normale Veröffentlichung wird nicht überschrieben');checked(['release','edit',TAG,'--repo',REPO,'--prerelease','--title',TITLE,'--notes-file',prepared.notes])}
 else checked(['release','create',TAG,'--repo',REPO,'--target',sha,'--prerelease','--title',TITLE,'--notes-file',prepared.notes]);
 checked(['release','upload',TAG,'--repo',REPO,...prepared.assets,'--clobber']);return prepared.safe;
}
module.exports={prepare,publish,scrub};if(require.main===module){try{const r=publish();console.log('Diagnose-Vorabbericht aktualisiert. Browser bestanden:',r.passed)}catch(e){console.error(e.message);process.exitCode=1}}
