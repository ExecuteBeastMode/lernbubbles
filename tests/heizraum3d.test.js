import assert from 'node:assert/strict';
import {NullEngine,Scene,StandardMaterial} from '@babylonjs/core';
import {DEVICES,describe} from '../src/heizraum3d/catalog.js';
import {Thermal} from '../src/heizraum3d/thermal.js';
import {createModel} from '../src/heizraum3d/models.js';
const engine=new NullEngine();
for(const d of DEVICES){const scene=new Scene(engine),casters=new Set(),shadows={addShadowCaster:a=>casters.add(a),removeShadowCaster:a=>casters.delete(a)},m={};for(const key of ['steel','blue','lpg','dark','oil','copper','brass','screen','flame','oilFlame','air','exhaust','airShell','glass','warning'])m[key]=new StandardMaterial(key,scene);const model=createModel(scene,shadows,m,d);assert(scene.meshes.length>5);assert(scene.meshes.some(a=>a.name==='Strömungssicherung')===d.hood);assert(scene.meshes.some(a=>a.name==='Schachtwand')===(d.route==='shaft'));assert(scene.meshes.some(a=>a.name==='Kondensatsiphon')===d.condensing);model.setCover(true);model.setCover(false);model.setFlows(true);model.setPower(true);model.tick(100,true);model.setPower(false);assert(describe(d).length>10);model.dispose();assert.equal(casters.size,0);assert.equal(scene.meshes.length,0);scene.dispose()}
const device=DEVICES.find(d=>d.id==='gas-c3'),bad=new Thermal(device);bad.siphon='empty';bad.on=true;for(let i=0;i<100;i++)bad.step(.1);assert(!bad.burn&&bad.power===0);
const compact=new Thermal(device),classic=new Thermal(DEVICES[0]);for(const t of [compact,classic]){t.on=true;t.service=true;t.valves=[0,0,0]}
for(let i=0;i<6000;i++){compact.step(.1);classic.step(.1);assert(Number.isFinite(compact.tf)&&compact.tf<95)}assert(compact.tf>classic.tf);assert(compact.starts>=1);
engine.dispose();console.log('11 Anlagen: NullEngine-Geometrie mit Schattenlisten-Teststub; Hydraulik: bestanden. Kein WebGL-/Windows-Test.');