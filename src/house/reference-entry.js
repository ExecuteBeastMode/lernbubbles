import './main.js';
import {EngineStore,Vector3,Matrix} from '@babylonjs/core';
import {installGraphics} from './reference-graphics.js';
import {createTestNavigation} from './reference-navigation.js';
const getScene=()=>EngineStore.LastCreatedScene;
const scene=getScene();let layoutReady=false;
if(scene){
 installGraphics(scene);
 // Move the reference kitchen radiator out of the cabinet zone, in normal operation too.
 const token=scene.onAfterRenderObservable.add(()=>{const parts=scene.meshes.filter(m=>m.name==='radiator:kitchen'||m.name.startsWith('radiator:kitchen:'));if(parts.length!==14)return;for(const mesh of parts){mesh.position.x+=2;mesh.computeWorldMatrix(true)}layoutReady=true;scene.onAfterRenderObservable.remove(token)});
}
if(new URLSearchParams(location.search).get('test')==='1'){
 let capturePaused=false;
 const navigation=createTestNavigation(getScene(),Vector3,Matrix);
 window.__referenceTest={
  ready(){return !!getScene()?.metadata?.referenceGraphicsReady&&layoutReady},
  pauseCapture(){const s=getScene();if(!s)return false;if(!capturePaused){s.getEngine().stopRenderLoop();capturePaused=true}return true},
  resumeCapture(){if(capturePaused){capturePaused=false;const s=getScene();s.getEngine().runRenderLoop(()=>s.render())}},
  focus:navigation.focus,
  project:navigation.project,
  meshes(){return getScene().meshes.filter(m=>m.geometry).length}
 };
}