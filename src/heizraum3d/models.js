import {TransformNode,MeshBuilder,Mesh,Vector3} from '@babylonjs/core';
export function createModel(scene,shadows,m,d){const root=new TransformNode(d.id,scene),meshes=[],flows=[],shaft=[],flames=[];let front;
 function add(a,mat,title,text='Schematisches Lernmodell, kein Herstellernachbau.'){a.parent=root;a.material=mat;a.metadata={title,text};meshes.push(a);shadows.addShadowCaster(a);return a}
 function box(n,x,y,z,w,h,depth,mat,title=n,text){const a=MeshBuilder.CreateBox(n,{width:w,height:h,depth},scene);a.position.set(x,y,z);return add(a,mat,title,text)}
 function cyl(n,x,y,z,diameter,height,mat,title=n,text){const a=MeshBuilder.CreateCylinder(n,{diameter,height,tessellation:24},scene);a.position.set(x,y,z);return add(a,mat,title,text)}
 function tube(n,path,r,mat,title=n,text){return add(MeshBuilder.CreateTube(n,{path:path.map(p=>new Vector3(...p)),radius:r,tessellation:20,cap:Mesh.CAP_ALL},scene),mat,title,text)}
 function flow(n,path,mat){const a=tube(n,path,.018,mat,n,'Farblinie ist ein Prinzipschema, keine reale Leitung oder berechnete Strömung.');a.isPickable=false;a.setEnabled(false);flows.push(a)}
 function flame(x,y,z){const a=MeshBuilder.CreateSphere('Flamme',{diameter:d.kind==='OIL'?.13:.055,segments:10},scene);a.position.set(x,y,z);add(a,d.kind==='OIL'?m.oilFlame:m.flame,'Flamme','Nur Betriebsanimation.');a.isPickable=false;a.setEnabled(false);flames.push(a)}
 const paint=d.fuel==='Flüssiggas'?m.lpg:m.blue;
 if(d.kind==='A'){box('Unterbau',0,.42,-1.5,1,.84,.7,m.steel);box('Kochfeld',0,.88,-1.5,1.08,.06,.78,m.dark);for(const x of [-.27,.27])for(const z of [-1.72,-1.28]){cyl('Kochbrenner',x,.94,z,.24,.04,m.steel);flame(x,1.02,z)}flow('Raumluft',[[-1.2,1,-1.2],[0,1,-1.5]],m.air);flow('Verbrennungsprodukte in den Raum',[[0,1.03,-1.5],[0,2,-1.5],[.7,2.2,-1.2]],m.exhaust)}else{
 const closed=!d.roomAir,w=closed?.95:1.25,h=closed?1.4:1.6,y=closed?1.35:.94,zFront=closed?-1.12:-1.02;
 box('Rückblech',0,y,-1.85,w,h,.05,paint);for(const x of [-w/2,w/2])box('Seitenblech',x,y,-1.5,.05,h,.75,paint);front=box('Gerätefront',0,y,zFront,w,h-.2,.06,paint,'Verkleidung','Öffnen ist nur eine Darstellungsfunktion, keine reale Arbeitsanweisung.');
 const hit=box('Gerätekollision',0,y,-1.5,w,h,.75,paint);hit.isVisible=false;hit.isPickable=false;hit.checkCollisions=true;
 box('Steuerung',0,y+h/2-.12,zFront+.05,w,.18,.08,m.dark);box('Display',-.15,y+h/2-.12,zFront+.1,.3,.08,.008,m.screen);
 for(let i=0;i<12;i++)box('Wärmetauscherlamelle',0,y+.15+i*.025,-1.49,w*.8,.014,.5,m.copper,'Wärmetauscher','Einzelne Lamellen als Lerngeometrie.');
 if(d.kind==='OIL'){const a=cyl('Öl-Gebläsebrenner',0,.5,-.85,.38,.4,m.oil);a.rotation.x=Math.PI/2;flame(0,.58,-1.23);tube('Ölversorgung',[[-1.1,.3,-1.7],[-.5,.3,-.9],[0,.4,-.8]],.018,m.copper)}else if(d.hood){for(let i=0;i<5;i++){box('Atmosphärisches Brennerrohr',-.4+i*.2,.49,-1.45,.12,.1,.5,m.steel);for(let j=0;j<3;j++)flame(-.4+i*.2,.6,-1.62+j*.16)}}else{cyl('Gebläse vor Brenner',0,.95,-1.48,.28,.15,m.dark,'Gebläse','Für C63/C93 bezeichnet die zweite Ziffer 3 das Gebläse vor dem Brenner.');box('Brennkammer-Lernansicht',0,1.4,-1.18,.6,.6,.025,m.glass,'Geschlossener Verbrennungskreislauf','Transparenz dient nur der Lernansicht.');for(let i=0;i<5;i++)flame(-.16+i*.08,1.2,-1.16)}
 if(d.hood){cyl('Abgasaustritt',0,1.82,-1.5,.25,.2,m.steel);const a=MeshBuilder.CreateCylinder('Strömungssicherung',{diameterBottom:.6,diameterTop:.25,height:.22,tessellation:28},scene);a.position.set(0,2.05,-1.5);add(a,m.steel,'Strömungssicherung','Art-B11-Prinzip, noch keine funktionale Rückstauprüfung.');}
 if(d.route==='chimney'){const yy=d.hood?2.53:2.35;tube('Abgasanschluss',[[0,d.hood?2.16:1.75,-1.5],[0,yy,-1.5],[1.7,yy,-1.5],[1.7,4.1,-1.5]],.11,m.steel);flow('Raumluft zum Brenner',[[-2.15,.62,-3.2],[-1.4,.6,-2],[0,.5,-1.2]],m.air);flow('Abgas nach oben',[[0,.7,-1.5],[0,yy,-1.5],[1.7,yy,-1.5],[1.7,4.1,-1.5]],m.exhaust)}
 else if(d.route==='shaft'){
  const path=[[0,2.08,-1.5],[0,2.35,-1.5],[1.6,2.35,-1.5],[1.6,4.1,-1.5]];tube('Einzelne Abgasleitung im Schacht',path,.065,m.steel);tube('Konzentrische Verbindung zum Schacht',path.slice(0,3),.14,m.airShell);
  for(const p of [[1.6,2.2,-1.8,.7,3.4,.1],[1.3,2.2,-1.5,.1,3.4,.6],[1.9,2.2,-1.5,.1,3.4,.6],[1.6,2.2,-1.2,.7,3.4,.1]])shaft.push(box('Schachtwand',...p,m.dark,'Schacht / freier Querschnitt','C9: Verbrennungsluft von oben durch den freien Schachtquerschnitt; nicht bloß Hinterlüftung.'));
  flow('Abgas aufwärts',path,m.exhaust);flow('Verbrennungsluft im Schacht abwärts',[[1.78,4,-1.5],[1.78,2.35,-1.5],[.12,2.35,-1.5],[.12,2.08,-1.5]],m.air);
 }else{
  const path=d.route==='wall'?[[0,2.08,-1.5],[0,2.4,-1.5],[0,2.4,-3.85]]:[[0,2.08,-1.5],[0,2.4,-1.5],[.8,2.4,-1.5],[.8,4.1,-1.5]];
  tube('Innerer Abgasweg',path,.065,m.steel);tube('Äußerer Luftweg',path,.14,m.airShell,'Außenluftführung',d.route==='independent-example'?'Nur ein C6-Geometriebeispiel. C63 legt keinen einzelnen Rohrverlauf fest.':'Luft-/Abgasprinzip ohne Zulässigkeits- oder Dimensionierungsnachweis.');flow('Abgas nach außen',path,m.exhaust);flow('Außenluft zum Gerät',path.slice().reverse().map(p=>[p[0]+.11,p[1],p[2]]),m.air);
  if(d.route==='independent-example')box('Nachweisplakette C6',.7,1.6,-1.05,.35,.25,.02,m.brass,'C6-Nachweise','Separates System bedeutet nicht ungeprüft oder beliebig austauschbar. Herstellerangaben, Eignung, Schnittstellen und Funktionsnachweis prüfen.');
 }
 const port=cyl('Messöffnung',.15,2.2,-1.35,.065,.1,m.brass,'Messstelle','Schematische Position, keine universelle Herstellervorgabe.');port.rotation.x=Math.PI/2;
 }
 let siphon;
 if(d.condensing){siphon=box('Kondensatsiphon',.32,.5,-1.1,.16,.2,.14,m.glass,'Siphon','Siphon / Ablauf prüfen; leer, verstopft oder undicht ist kein unauffälliger Befund.');tube('Kondensatablauf',[[.32,.4,-1.1],[.32,.28,-1.1],[.7,.28,-1.1]],.018,m.steel)}
 return {root,hasCover:!!front,setCover(open){if(front)front.setEnabled(!open)},setPower(on){flames.forEach(a=>a.setEnabled(on))},setFlows(on){flows.forEach(a=>a.setEnabled(on));shaft.forEach(a=>a.visibility=on?.15:1)},setSiphonFault(fault){if(siphon)siphon.material=fault==='ok'?m.glass:m.warning},tick(t,on){if(on)flames.forEach((a,i)=>a.scaling.y=1.6+.15*Math.sin(t*.005+i))},dispose(){meshes.forEach(a=>shadows.removeShadowCaster(a));root.dispose(false,false)}};
}