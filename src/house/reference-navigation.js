const BASEMENT = {name:'basement', height:0, eye:1.65, landingZ:-.299};
const GROUND = {name:'ground', height:2.9, eye:4.55, landingZ:3.999};

// Standflächen des Kehrschornsteins. "back" ist der Abstand der Kamera vor dem Ziel.
// Die Kamera bleibt auf Augenhöhe des Stockwerks, weil main.js die Höhe pro Frame festlegt.
export const WORKPLACES = {
 'Standfläche A': {floor:GROUND, back:3},
 'Standfläche B': {floor:GROUND, back:3},
 'Standfläche D': {floor:BASEMENT, back:1.6}
};

export function floorForTarget(name){
 if(/^radiator:(living|kitchen|hall):valve$/.test(name))return {...GROUND};
 if(/^(siphon:body|control:(power|mode|plus|minus)|controller:display|appliance:casing)$/.test(name))return {...BASEMENT};
 if(WORKPLACES[name])return {...WORKPLACES[name].floor};
 throw Error('Keine geprüfte Stockwerkszuordnung für '+name);
}

// Reine Planung ohne Szene: wohin die Kamera muss, damit "center" angesehen wird.
export function viewPlan(name, center){
 const floor=floorForTarget(name),back=WORKPLACES[name]?.back??.8;
 return {
  floor,
  landing:{x:3.85, y:floor.eye, z:floor.landingZ},
  camera:{x:center.x, y:floor.eye, z:center.z+back},
  look:{x:center.x, y:center.y, z:center.z}
 };
}

export function createTestNavigation(scene,Vector3,Matrix,timeout=20000){
 const camera=()=>scene.activeCamera;
 const coordinates=v=>({x:v.x,y:v.y,z:v.z});
 function target(name){const m=scene.getMeshByName(name);if(!m)throw Error('Mesh fehlt: '+name);m.computeWorldMatrix(true);return m}
 function clearInput(){camera().cameraDirection.setAll(0);camera().cameraRotation.setAll(0)}
 function frames(phase,predicate){return new Promise((resolve,reject)=>{let count=0,token,done=false;function finish(error){if(done)return;done=true;clearTimeout(timer);if(token)scene.onAfterRenderObservable.remove(token);error?reject(error):resolve()}const timer=setTimeout(()=>finish(Error('Keine stabile gerenderte Kameraposition: '+JSON.stringify({phase,frames:count,camera:coordinates(camera().position)}))),timeout);token=scene.onAfterRenderObservable.add(()=>{count++;try{if(count>=2&&predicate())finish()}catch(error){finish(error)}})})}
 function project(name){const m=target(name),p=m.getBoundingInfo().boundingBox.centerWorld,engine=scene.getEngine(),rect=engine.getRenderingCanvas().getBoundingClientRect(),projected=Vector3.Project(p,Matrix.Identity(),scene.getTransformMatrix(),camera().viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight())),x=rect.left+projected.x*rect.width/engine.getRenderWidth(),y=rect.top+projected.y*rect.height/engine.getRenderHeight();const insideCanvas=Number.isFinite(x)&&Number.isFinite(y)&&x>rect.left&&x<rect.left+rect.width&&y>rect.top&&y<rect.top+rect.height;const hit=insideCanvas?scene.pick(x-rect.left,y-rect.top):null,hitNames=[];for(let node=hit?.pickedMesh;node;node=node.parent)hitNames.push(node.name);return {name,floor:floorForTarget(name).name,x,y,z:projected.z,insideCanvas,hitNames,camera:coordinates(camera().position),target:coordinates(p),canvas:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}}
 async function focus(name){
  const first=viewPlan(name,{x:0,y:0,z:0});
  target(name);
  camera().position.set(first.landing.x,first.landing.y,first.landing.z);
  camera().setTarget(new Vector3(first.landing.x,first.landing.y,first.landing.z-1));
  clearInput();
  await frames('landing '+first.floor.name,()=>Math.abs(camera().position.y-first.floor.eye)<.03);
  const c=target(name).getBoundingInfo().boundingBox.centerWorld,plan=viewPlan(name,c);
  camera().position.set(plan.camera.x,plan.camera.y,plan.camera.z);
  camera().setTarget(new Vector3(plan.look.x,plan.look.y,plan.look.z));
  clearInput();
  await frames('focus '+name,()=>Math.abs(camera().position.y-plan.floor.eye)<.03);
  return project(name);
 }
 return {focus,project};
}
