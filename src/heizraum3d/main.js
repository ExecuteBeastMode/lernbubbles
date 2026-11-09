import {Engine,Scene,Vector3,Color3,Color4,UniversalCamera,HemisphericLight,DirectionalLight,ShadowGenerator,StandardMaterial,MeshBuilder,Mesh,DynamicTexture,PointerEventTypes} from '@babylonjs/core';
const $=id=>document.getElementById(id);
function info(title,text){$('title').textContent=title;$('info').textContent=text}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.parent!==window){e.preventDefault();window.parent.postMessage({type:'lb-heizraum3d-close'},'*')}},true);
try{boot()}catch(e){$('status').textContent='3D-Startfehler: '+e.message;console.error(e)}
function boot(){
 const canvas=$('view');if(!Engine.isSupported())throw new Error('WebGL nicht verfügbar');
 const engine=new Engine(canvas,true);engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));
 const world=new Scene(engine);world.clearColor=new Color4(.06,.09,.14,1);world.collisionsEnabled=true;
 const camera=new UniversalCamera('Besucher',new Vector3(2.4,1.65,3.1),world);camera.setTarget(new Vector3(0,1,-1.5));camera.minZ=.05;camera.speed=.075;camera.angularSensibility=2300;camera.checkCollisions=true;camera.ellipsoid=new Vector3(.25,.75,.25);camera.attachControl(canvas,true);camera.keysUp=[87,38];camera.keysDown=[83,40];camera.keysLeft=[65,37];camera.keysRight=[68,39];camera.inputs.attached.mouse.buttons=[2];canvas.oncontextmenu=e=>e.preventDefault();
 new HemisphericLight('Raumlicht',new Vector3(0,1,0),world).intensity=.8;
 const light=new DirectionalLight('Werkstattlicht',new Vector3(-.4,-1,-.3),world);light.position=new Vector3(2,5,2);light.intensity=.8;
 const shadows=new ShadowGenerator(1024,light);shadows.useBlurExponentialShadowMap=true;
 function material(name,color){const m=new StandardMaterial(name,world);m.diffuseColor=Color3.FromHexString(color);m.specularPower=64;return m}
 const steel=material('Stahl','#a2b0ba'),blue=material('Lack','#235377'),dark=material('Dunkelmetall','#20313f'),copper=material('Kupfer','#b2724c'),wall=material('Wand','#c6c4b5'),floor=material('Boden','#626f7a'),brass=material('Messing','#c8a85e'),dustMat=material('Staub','#88745d');
 function tag(mesh,title,text){mesh.metadata={title,text};return mesh}
 function box(name,x,y,z,w,h,d,mat,solid=false){const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},world);m.position.set(x,y,z);m.material=mat;m.checkCollisions=solid;shadows.addShadowCaster(m);return m}
 function tube(name,points,r,mat){const m=MeshBuilder.CreateTube(name,{path:points.map(p=>new Vector3(...p)),radius:r,tessellation:20,cap:Mesh.CAP_ALL},world);m.material=mat;shadows.addShadowCaster(m);return m}
 function cylinder(name,x,y,z,d,h,mat){const m=MeshBuilder.CreateCylinder(name,{diameter:d,height:h,tessellation:24},world);m.position.set(x,y,z);m.material=mat;shadows.addShadowCaster(m);return m}
 function label(text,x,y,z,w=1.2){const texture=new DynamicTexture(text,{width:768,height:128},world,false);texture.drawText(text,null,88,'bold 45px sans-serif','#edf6ff','#142538',true);const mat=new StandardMaterial(text,world);mat.diffuseTexture=texture;mat.emissiveColor=new Color3(.5,.5,.5);const m=MeshBuilder.CreatePlane(text,{width:w,height:.2,sideOrientation:Mesh.DOUBLESIDE},world);m.position.set(x,y,z);m.material=mat;m.isPickable=false}
 const ground=box('Boden',0,-.07,0,7,.14,7,floor,true);ground.receiveShadows=true;
 box('Rückwand',0,1.65,-3.5,7,3.3,.16,wall,true);box('Linke Wand',-3.5,1.65,0,.16,3.3,7,wall,true);box('Rechte Wand',3.5,1.65,0,.16,3.3,7,wall,true);box('Vordere Wand',0,1.65,3.5,7,3.3,.16,wall,true);
 for(let n=-3;n<=3;n++)for(const points of [[[n,.006,-3.4],[n,.006,3.4]],[[-3.4,.006,n],[3.4,.006,n]]]){const m=MeshBuilder.CreateLines('Bodenfuge',{points:points.map(p=>new Vector3(...p))},world);m.color=new Color3(.3,.35,.4);m.isPickable=false}
 box('Sockel',0,.09,-1.5,1.55,.18,1.1,dark,true);
 const collision=box('Kessel-Kollision',0,.94,-1.5,1.3,1.6,.9,blue,true);collision.isVisible=false;collision.isPickable=false;
 for(const x of [-.63,.63])tag(box('Seitenblech',x,.94,-1.5,.06,1.6,.9,blue),'Feuerstätte','Schematischer Gasheizkessel, kein Herstellernachbau.');
 box('Rückblech',0,.94,-1.93,1.3,1.6,.05,blue);box('Bodenblech',0,.19,-1.5,1.3,.05,.9,dark);
 const front=tag(box('Verkleidung',0,.86,-1.02,1.22,1.33,.07,blue),'Verkleidung','Ansicht über den Button öffnen; keine reale Arbeitsanweisung.');
 tag(box('Steuerung',0,1.57,-.985,1.23,.24,.09,dark),'Steuerung','Kessel über die Seitenleiste schalten. Temperatur ist ein vereinfachtes Lernmodell.');
 const screen=material('Display','#a4e2c9');screen.emissiveColor=new Color3(.12,.3,.2);box('Anzeige',-.23,1.58,-.929,.5,.12,.008,screen);
 for(let i=0;i<2;i++){const knob=cylinder('Knopf',.23+i*.2,1.58,-.92,.1,.045,dark);knob.rotation.x=Math.PI/2}
 for(let i=0;i<4;i++){const screw=cylinder('Schraube',i%2?-.55:.55,i<2?.28:1.37,-.972,.025,.015,steel);screw.rotation.x=Math.PI/2}
 const flameMat=material('Flamme','#3aa9ef');flameMat.emissiveColor=new Color3(.12,.4,.95);const flames=[];
 for(let i=0;i<5;i++){tag(box('Brennerrohr',-.42+i*.21,.49,-1.43,.12,.1,.55,steel),'Brenner','Schematische Darstellung; das Flammenbild ist noch keine Diagnosefunktion.');for(let j=0;j<4;j++){const m=MeshBuilder.CreateSphere('Flamme',{diameter:.065,segments:8},world);m.position.set(-.42+i*.21,.6,-1.64+j*.14);m.material=flameMat;m.isPickable=false;m.setEnabled(false);flames.push(m)}}
 for(let i=0;i<15;i++)tag(box('Wärmetauscherlamelle',0,1.02+i*.027,-1.49,1,.015,.62,copper),'Wärmetauscher','Getrennte Bauteile; noch keine herstellerspezifische Geometrie oder Verschmutzungssimulation.');
 tube('Wärmetauscherbogen',[[-.45,.95,-1.25],[-.45,1.4,-1.25],[.45,1.4,-1.25],[.45,.95,-1.25]],.04,copper);
 cylinder('Abgasaustritt',0,1.81,-1.5,.25,.18,steel);
 const hood=MeshBuilder.CreateCylinder('Strömungssicherung',{diameterBottom:.6,diameterTop:.25,height:.22,tessellation:32},world);hood.position.set(0,2.05,-1.5);hood.material=steel;tag(hood,'Strömungssicherung','Späterer Prüfbereich. Aktuell keine funktionierende Rückstauprüfung.');shadows.addShadowCaster(hood);
 tag(tube('Abgasrohr',[[0,2.16,-1.5],[0,2.4,-1.5],[.08,2.49,-1.5],[.2,2.53,-1.5],[1.6,2.53,-1.5],[1.72,2.57,-1.5],[1.8,2.7,-1.5],[1.8,3.25,-1.5]],.11,steel),'Abgasleitung','Anklickbare Geometrie, noch keine Strömungsberechnung.');
 for(const x of [.3,1.35]){const collar=cylinder('Rohrschelle',x,2.53,-1.5,.25,.035,dark);collar.rotation.z=Math.PI/2}
 const port=cylinder('Messöffnung',.75,2.53,-1.365,.065,.09,brass);port.rotation.x=Math.PI/2;tag(port,'Messöffnung','Hier wird später die Sonde eingeführt. Noch keine Messwertaufnahme.');
 tube('Vorlauf',[[-.84,.3,-1.8],[-.84,2.8,-1.8],[-2.5,2.8,-1.8]],.035,copper);tube('Rücklauf',[[.85,.3,-1.8],[.85,2.9,-1.8],[2.7,2.9,-1.8]],.035,steel);
 tag(box('Lüftungsrahmen',-2.15,.62,-3.38,.9,.65,.08,steel),'Lüftung','Zustand über die Seitenleiste ändern; keine Querschnittsbemessung.');box('Luftkanal',-2.15,.62,-3.32,.81,.56,.02,dark);
 for(let i=0;i<8;i++)tag(box('Lüftungslamelle',-2.15,.37+i*.07,-3.28,.8,.025,.04,steel),'Lüftung','Sichtbare Lamellen einer schematischen Verbrennungsluftöffnung.');
 const dust=tag(box('Verschmutzung',-2.15,.62,-3.24,.77,.49,.025,dustMat),'Verschmutzung','Ablagerungen sichtbar.');dust.setEnabled(false);
 const plate=tag(box('Verschluss',-2.15,.62,-3.2,.83,.58,.04,dark),'Verschlossene Öffnung','Im späteren Prüfablauf zu beurteilen.');plate.setEnabled(false);label('Verbrennungsluft',-2.15,1.1,-3.24);
 box('Werkbank',2.45,.85,.5,1.6,.1,.65,dark,true);for(const x of [1.8,3.1])box('Werkbankbein',x,.42,.5,.08,.8,.5,steel,true);
 tag(box('Abgasmessgerät',2.1,1.04,.5,.3,.28,.14,blue),'Abgasmessgerät','Ansichtsmodell, keine Messfunktion.');box('Gerätedisplay',2.1,1.07,.578,.2,.12,.01,screen);
 tag(box('Rückstaumelder',2.65,.94,.48,.08,.07,.3,dark),'Rückstaumelder','Ansichtsmodell auf der Werkbank, keine Feuchte- oder Rückstausimulation.');
 tube('Sonde auf Werkbank',[[2.8,.94,.55],[3.1,.94,.55]],.012,steel);label('Lernbubbles · Übungsheizraum',0,2.95,-3.38,2.5);
 let open=false,on=false,temp=20,active=true;
 function preset(near){camera.position.copyFrom(near?new Vector3(.8,1.65,.65):new Vector3(2.4,1.65,3.1));camera.setTarget(new Vector3(0,near?1.15:1,-1.5));camera.cameraDirection.setAll(0);camera.cameraRotation.setAll(0);canvas.focus()}
 $('home').onclick=()=>preset(false);$('near').onclick=()=>preset(true);$('cover').onclick=()=>{open=!open;front.setEnabled(!open);$('cover').textContent=open?'Verkleidung schließen':'Verkleidung öffnen'};
 $('power').onclick=()=>{on=!on;flames.forEach(m=>m.setEnabled(on));$('power').textContent=on?'Kessel ausschalten':'Kessel einschalten'};
 $('ventState').onchange=()=>{dust.setEnabled($('ventState').value==='1');plate.setEnabled($('ventState').value==='2');info('Lüftungsszenario',['Öffnung frei.','Verschmutzung sichtbar.','Öffnung verschlossen.'][+$('ventState').value])};
 world.onPointerObservable.add(e=>{if(e.type!==PointerEventTypes.POINTERPICK||e.event.button!==0)return;const m=e.pickInfo?.pickedMesh;if(m?.metadata)info(m.metadata.title,m.metadata.text)});
 world.onBeforeRenderObservable.add(()=>{camera.position.y=1.65;const dt=Math.min(engine.getDeltaTime()/1000,.1);temp+=((on?70:20)-temp)*dt/(on?65:180);$('temp').textContent=temp.toFixed(1).replace('.',',')+' °C';flames.forEach((m,i)=>{if(on)m.scaling.y=1.8+.15*Math.sin(performance.now()*.005+i)})});
 engine.runRenderLoop(()=>{if(active)world.render()});window.addEventListener('resize',()=>engine.resize());window.addEventListener('pagehide',()=>{active=false;engine.stopRenderLoop();world.dispose();engine.dispose()},{once:true});$('status').textContent='3D-Szene bereit. Raum-/Bedienprototyp, noch keine Messprüfung.';
}