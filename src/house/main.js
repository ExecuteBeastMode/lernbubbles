import {
  Engine,
  Scene,
  SceneLoader,
  UniversalCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  HighlightLayer,
  PointerEventTypes,
  DynamicTexture,
  StandardMaterial,
  MeshBuilder,
  Mesh
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';

import {Thermal} from '../heizraum3d/thermal.js';
import {installMissionFlow} from './mission-flow.js';

const $ = id => document.getElementById(id);
const thermal = new Thermal({water:true,condensing:true});
const state = {
  siphon:false,
  level:'ground',
  tool:null
};

const say = text => {
  $('hint').textContent = text;
};

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && parent !== window) {
    event.preventDefault();
    parent.postMessage({type:'lb-house-close'}, '*');
  }

  if (event.key === 'Tab') {
    event.preventDefault();
    $('checklist').hidden = !$('checklist').hidden;
  }
}, true);

start().catch(error => {
  say('Startfehler: ' + error.message);
  console.error(error);
});

async function start() {
  const engine = new Engine($('view'), true, {stencil:true});
  const scene = new Scene(engine);

  scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(.12,.15,.19,1);
  scene.collisionsEnabled = true;

  const camera = new UniversalCamera('Besucher', new Vector3(0,4.55,6.5), scene);
  camera.setTarget(new Vector3(0,4.4,4));
  camera.minZ = .03;
  camera.speed = .065;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(.23,.75,.23);
  camera.ellipsoidOffset = new Vector3(0,-.8,0);
  camera.attachControl($('view'), true);

  camera.keysUp = [87,38];
  camera.keysDown = [83,40];
  camera.keysLeft = [65,37];
  camera.keysRight = [68,39];
  camera.inputs.attached.mouse.buttons = [2];

  $('view').oncontextmenu = event => event.preventDefault();

  new HemisphericLight('Raumlicht', new Vector3(0,1,0), scene).intensity = .7;
  new DirectionalLight('Fensterlicht', new Vector3(-.4,-1,-.3), scene).intensity = .8;

  for (const [name,y] of [['Keller',2.5],['Erdgeschoss',5.4]]) {
    const light = new PointLight(name, new Vector3(-2,y,-2), scene);
    light.intensity = .65;
    light.range = 10;
  }

  const response = await fetch('interactions.json');

  if (!response.ok) {
    throw new Error('Interaktionsdatei fehlt');
  }

  const registry = await response.json();
  const actions = new Map(registry.interactions.map(item => [item.name,item]));

  await SceneLoader.ImportMeshAsync(null, './', 'house.glb', scene);

  const find = name =>
    scene.getMeshByName(name) || scene.getTransformNodeByName(name);

  for (const action of registry.interactions.filter(item => item.type === 'doorHandle')) {
    const handle = find(action.name);
    const door = find(action.door);

    if (handle && door) {
      handle.setParent(door);
    }
  }

  for (const mesh of scene.meshes) {
    mesh.checkCollisions =
      /^(ground:|basement:|house:|door:)/.test(mesh.name) &&
      !mesh.name.includes(':handle:');

    mesh.receiveShadows = true;
  }

  const highlight = new HighlightLayer('Prüfpunkt', scene);
  highlight.blurHorizontalSize = .3;
  highlight.blurVerticalSize = .3;

  let hovered = null;

  const actionFor = mesh => {
    for (let node = mesh; node; node = node.parent) {
      if (actions.has(node.name)) {
        return actions.get(node.name);
      }
    }

    return null;
  };

  const texture = new DynamicTexture('Kesseldisplay', {
    width:512,
    height:192
  }, scene, false);

  const displayMaterial = new StandardMaterial('Anzeige', scene);
  displayMaterial.diffuseTexture = texture;
  displayMaterial.emissiveColor = new Color3(.7,.9,.8);

  const display = MeshBuilder.CreatePlane('Live-Anzeige', {
    width:.16,
    height:.055,
    sideOrientation:Mesh.DOUBLESIDE
  }, scene);

  display.position.set(-3.24,1.29,-4.424);
  display.material = displayMaterial;

  const checklist = [
    'Betreiber / Auftrag',
    'Zugang / Raum',
    'Anlage identifiziert',
    'Raumlüftung beurteilt',
    'Herstellerbedienung zugeordnet',
    'Wärmeabnahme geprüft',
    'Kondensatweg geprüft',
    'Messbetrieb beendet'
  ];

  $('checks').innerHTML = checklist.map((item,index) =>
    `<label><input type="checkbox" id="check${index}">${item}</label>`
  ).join('');

  function use(action) {
    if (action.type === 'door' || action.type === 'doorHandle') {
      const name = action.type === 'door' ? action.name : action.door;
      const door = find(name);

      if (!door) return;

      door.rotationQuaternion = null;
      door.rotation.y = door.rotation.y ? 0 : 1.4;

      say('Tür ' + (door.rotation.y ? 'geöffnet.' : 'geschlossen.'));
      return;
    }

    if (action.type === 'button') {
      if (action.action === 'power') {
        if (!state.siphon) {
          say('Zuerst den Kondensat-Prüfpunkt ansehen. Das ist noch keine vollständige Siphonprüfung.');
          return;
        }

        if (thermal.on) {
          thermal.stop();
        } else {
          thermal.on = true;
        }

        say(thermal.on
          ? 'Kessel eingeschaltet. Wärmeabnahme beobachten.'
          : 'Kessel ausgeschaltet.');
      }

      if (action.action === 'mode') {
        if (!thermal.on) {
          say('Erst geeigneten Anlagenbetrieb herstellen.');
          return;
        }

        thermal.service = !thermal.service;

        say('Simulierter Messbetrieb ' +
          (thermal.service ? 'aktiv.' : 'beendet.'));
      }

      if (action.action === 'plus') {
        thermal.set = Math.min(75, thermal.set + 2);
      }

      if (action.action === 'minus') {
        thermal.set = Math.max(45, thermal.set - 2);
      }

      return;
    }

    if (action.type === 'display') {
      camera.position.set(-3.2,1.65,-3.8);
      camera.setTarget(new Vector3(-3.2,1.29,-4.42));

      say('Bedienfeld-Nahansicht. Knöpfe direkt anklicken; keine reale Hersteller-Tastenfolge.');
      return;
    }

    if (action.type === 'valve') {
      const index = ['living','kitchen','hall'].indexOf(action.room);

      if (index < 0) return;

      thermal.valves[index] = thermal.valves[index] === 1 ? 0 :
        thermal.valves[index] === 0 ? .5 : 1;

      const knob = find(action.name);

      if (knob) {
        knob.rotationQuaternion = null;
        knob.rotation.z = thermal.valves[index] * Math.PI / 2;
      }

      say('Heizkörper ' + action.room + ': ' +
        Math.round(thermal.valves[index] * 100) + ' % geöffnet.');

      return;
    }

    if (action.type === 'siphon') {
      state.siphon = true;

      say('Siphon als Prüfpunkt erkannt. Wasserstand und Fehlerfälle sind hier noch nicht dargestellt. Keine Freigabe eines realen Geräts.');
      return;
    }

    if (action.type === 'tool') {
      state.tool = action.tool;

      say('Werkzeug ausgewählt: ' + action.tool +
        '. Noch keine funktionale Rückstau-/Abgasmessung.');

      return;
    }

    if (action.type === 'vent') {
      say('Raumlüftung ansehen. Beispielmodell, keine vollständige Anlagen-/Aufstellungsauslegung.');
      return;
    }

    say(action.text || 'Bauteil erkannt.');
  }

  scene.onPointerObservable.add(event => {
    if (event.type === PointerEventTypes.POINTERMOVE) {
      const mesh = event.pickInfo?.pickedMesh;
      const action = actionFor(mesh);

      if (hovered && hovered !== mesh) {
        highlight.removeMesh(hovered);
        hovered = null;
      }

      if (action && mesh && hovered !== mesh) {
        highlight.addMesh(mesh, new Color3(.25,.8,.65));
        hovered = mesh;
        $('target').textContent = action.name;
      }
    }

    if (event.type === PointerEventTypes.POINTERPICK && event.event.button === 0) {
      const action = actionFor(event.pickInfo?.pickedMesh);

      if (action) {
        use(action);
      } else if (event.pickInfo?.pickedMesh === display) {
        use({type:'display'});
      }
    }
  });

  let elapsed = 0;

  scene.onBeforeRenderObservable.add(() => {
    const deltaTime = Math.min(.1, engine.getDeltaTime() / 1000);

    camera.position.x = Math.max(-5.7, Math.min(5.7, camera.position.x));
    camera.position.z = Math.max(-4.7, Math.min(7, camera.position.z));

    let floor = state.level === 'ground' ? 2.9 : 0;

    if (
      camera.position.x >= 3.25 &&
      camera.position.x <= 4.45 &&
      camera.position.z >= -.3 &&
      camera.position.z <= 4
    ) {
      floor = (camera.position.z + .3) / 4.3 * 2.9;

      if (floor < .05) state.level = 'basement';
      if (floor > 2.85) state.level = 'ground';
    }

    camera.position.y = floor + 1.65;
    thermal.step(deltaTime);

    elapsed += deltaTime;

    if (elapsed > .25) {
      elapsed = 0;

      const context = texture.getContext();

      context.fillStyle = '#153127';
      context.fillRect(0,0,512,192);

      context.fillStyle = '#b8f2d5';
      context.font = 'bold 46px monospace';
      context.fillText('VL ' + thermal.tf.toFixed(1) + ' °C', 20,70);

      context.font = '30px monospace';
      context.fillText(
        'Soll ' + thermal.set + ' / ' + (thermal.on ? 'EIN' : 'AUS'),
        20,125
      );

      texture.update();

      $('state').textContent =
        'Vorlauf ' + thermal.tf.toFixed(1) + ' °C · Heizkörper ' +
        thermal.valves.map(value => Math.round(value * 100) + '%').join(' / ');
    }
  });

  installMissionFlow(scene, camera);

  engine.runRenderLoop(() => scene.render());

  window.addEventListener('resize', () => engine.resize());

  window.addEventListener('pagehide', () => {
    scene.dispose();
    engine.dispose();
  }, {once:true});

  say('Haus geladen. Türgriff anklicken; rechts ziehen zum Umschauen. Treppen-/Kollisionsverhalten ist noch nicht abgenommen.');
}
