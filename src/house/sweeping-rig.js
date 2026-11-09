import {
  TransformNode,
  MeshBuilder,
  Mesh,
  Vector3,
  Color3,
  StandardMaterial,
  MirrorTexture,
  Plane,
  SpotLight
} from '@babylonjs/core';

export function createSweepingRig(scene, position = new Vector3(-1.8, 0, -2.8)) {
  const origin = position.clone();
  const root = new TransformNode('Festbrennstoff-Kehrschornstein', scene);
  root.position.copyFrom(origin);

  const mirrorSurfaces = [];

  const material = (name, hex, shine = 16) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularPower = shine;
    return m;
  };

  const brick = material('Mauerwerk', '#9a7860');
  const metal = material('Stahl', '#8c9ba6', 72);
  const plastic = material('Kunststoff', '#1d2830');
  const glassFiber = material('Glasfaserstab', '#c77f35');
  const soot = material('Lockerer Ruß', '#25201c', 1);
  const gloss = material('Glanzruß', '#191715', 120);
  const clay = material('Innenfläche', '#846951');
  const textile = material('Kehrleine', '#9f8f6d');

  function attach(mesh, mat) {
    mesh.parent = root;
    mesh.material = mat;
    return mesh;
  }

  function box(name, x, y, z, w, h, d, mat, action) {
    const mesh = MeshBuilder.CreateBox(name, {width: w, height: h, depth: d}, scene);
    mesh.position.set(x, y, z);
    if (action) mesh.metadata = {missionAction: action};
    return attach(mesh, mat);
  }

  function tube(name, a, b, radius, mat) {
    const mesh = MeshBuilder.CreateTube(name, {
      path: [new Vector3(...a), new Vector3(...b)],
      radius,
      tessellation: 12,
      cap: Mesh.CAP_ALL
    }, scene);
    return attach(mesh, mat);
  }

  function makeBrush(name) {
    const node = new TransformNode(name, scene);
    node.parent = root;

    const core = MeshBuilder.CreateCylinder(name + ' Kern', {diameter: 0.022, height: 0.16}, scene);
    core.parent = node;
    core.material = metal;

    const lines = [];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        lines.push([
          new Vector3(Math.cos(angle) * 0.012, -0.06 + row * 0.04, Math.sin(angle) * 0.012),
          new Vector3(Math.cos(angle) * 0.12, -0.075 + row * 0.04, Math.sin(angle) * 0.12)
        ]);
      }
    }

    const bristles = MeshBuilder.CreateLineSystem(name + ' Borsten', {lines}, scene);
    bristles.parent = node;
    bristles.color = new Color3(0.14, 0.17, 0.18);
    bristles.isPickable = false;

    return node;
  }

  function verticalLine(name, diameter, mat) {
    const mesh = MeshBuilder.CreateCylinder(name, {diameter, height: 1, tessellation: 8}, scene);
    mesh.parent = root;
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }

  function stretch(mesh, x, z, yFrom, yTo) {
    const length = Math.max(0.001, Math.abs(yTo - yFrom));
    mesh.position.set(x, (yFrom + yTo) / 2, z);
    mesh.scaling.y = length;
  }

  // Schornsteinkörper mit Lücken für die Reinigungsöffnungen
  for (const [x, z, w, d] of [[-0.215, 0, 0.12, 0.55], [0.215, 0, 0.12, 0.55], [0, -0.215, 0.31, 0.12]]) {
    box('Schornsteinwand', x, 4.175, z, w, 8.35, d, brick, 'inspect-chimney');
  }

  for (const [low, high] of [[0, 0.6], [1, 6.3], [6.7, 8.35]]) {
    box('Schornstein-Front', 0, (low + high) / 2, 0.215, 0.31, high - low, 0.12, brick, 'inspect-chimney');
  }

  for (const [x, z, w, d] of [[-0.154, 0, 0.008, 0.3], [0.154, 0, 0.008, 0.3], [0, -0.154, 0.3, 0.008]]) {
    mirrorSurfaces.push(box('Innenfläche', x, 4.1, z, w, 8.2, d, clay));
  }

  const sootPanel = box('Rußstruktur', 0, 4.1, -0.147, 0.28, 8.1, 0.003, soot);
  sootPanel.isPickable = false;

  const doorD = box('Reinigungsöffnung D', 0, 0.8, 0.3, 0.32, 0.4, 0.045, metal, 'open-D');
  const doorB = box('Reinigungsöffnung B', 0, 6.5, 0.3, 0.32, 0.4, 0.045, metal, 'open-B');

  // Arbeitsplätze
  box('Standfläche D', 0, 0.015, 0.95, 1.2, 0.03, 1.2, metal, 'stand-D');
  box('Standfläche B', 0.7, 5.785, 0.65, 1.2, 0.03, 1.2, metal, 'stand-B');
  box('Standfläche A', 0.8, 7.335, 0, 0.6, 0.03, 0.6, metal, 'stand-A');

  for (const z of [-0.32, 0.32]) {
    tube('Geländerstütze A', [1.1, 7.35, z], [1.1, 8.35, z], 0.018, metal);
  }
  tube('Geländerholm A', [1.1, 8.35, -0.32], [1.1, 8.35, 0.32], 0.02, metal);

  // Dachleiter
  const ladderStart = new Vector3(1.4, 6.05, 1.5);
  const ladderEnd = new Vector3(0.8, 7.35, 0);

  for (const dx of [-0.22, 0.22]) {
    tube('Leiterholm',
      [ladderStart.x + dx, ladderStart.y, ladderStart.z],
      [ladderEnd.x + dx, ladderEnd.y, ladderEnd.z],
      0.022, metal);
  }

  for (let i = 0; i <= 8; i++) {
    const p = Vector3.Lerp(ladderStart, ladderEnd, i / 8);
    tube('Leitersprosse', [p.x - 0.22, p.y, p.z], [p.x + 0.22, p.y, p.z], 0.016, metal);
  }

  for (let i = 0; i < 4; i++) {
    box('Trittfläche', 1.35 - i * 0.18, 6.05 + i * 0.32, 1.6 - i * 0.38, 0.5, 0.035, 0.28, metal, 'inspect-roof-way');
  }

  // Fehlerobjekte
  const obstruction = box('Hindernis im Zug', 0, 5.4, 0, 0.28, 0.12, 0.26, plastic);
  const wire = tube('Leitung im Schornstein', [-0.15, 5, 0], [0.15, 5.1, 0], 0.013, plastic);
  const crack = MeshBuilder.CreateLines('Rissverdacht', {
    points: [
      new Vector3(-0.1, 2, -0.14),
      new Vector3(0.02, 2.15, -0.14),
      new Vector3(-0.02, 2.35, -0.14),
      new Vector3(0.09, 2.5, -0.14)
    ]
  }, scene);
  crack.parent = root;
  crack.color = Color3.Black();
  for (const defect of [obstruction, wire, crack]) {
    defect.setEnabled(false);
    defect.isPickable = false;
  }

  // Kehrwerkzeuge: je ein Besen, eine Leine, eine Stange
  const ropeBrush = makeBrush('Kehrbesen an Leine');
  const rodBrush = makeBrush('Stoßbesen');
  ropeBrush.position.set(0, 8.1, 0);
  rodBrush.position.set(0, 6.5, 0);

  const weight = MeshBuilder.CreateSphere('Kehrgewicht', {diameter: 0.09, segments: 16}, scene);
  weight.parent = ropeBrush;
  weight.position.y = -0.22;
  weight.material = metal;

  const rope = verticalLine('Kehrleine', 0.012, textile);
  const rod = verticalLine('Stoßstange', 0.016, glassFiber);

  ropeBrush.setEnabled(false);
  rope.setEnabled(false);
  rodBrush.setEnabled(false);
  rod.setEnabled(false);

  // Leinen- und Stabwicklung als statische Deko
  for (const [name, radius, y, mat] of [
    ['Leinenwicklung', 0.16, 7.45, textile],
    ['Stabwicklung', 0.23, 5.95, glassFiber]
  ]) {
    const path = [];
    for (let i = 0; i <= 240; i++) {
      const angle = (i / 240) * 14 * Math.PI;
      path.push(new Vector3(
        0.8 + Math.cos(angle) * radius,
        y + i * 0.00015,
        0.55 + Math.sin(angle) * radius
      ));
    }
    attach(MeshBuilder.CreateTube(name, {path, radius: 0.004, tessellation: 8}, scene), mat);
  }

  // Rußbehälter
  const bucket = MeshBuilder.CreateCylinder('Rußbehälter', {
    diameter: 0.3,
    height: 0.35,
    cap: Mesh.NO_CAP,
    tessellation: 24,
    sideOrientation: Mesh.DOUBLESIDE
  }, scene);
  attach(bucket, plastic);
  bucket.position.set(0.5, 0.2, 1);
  bucket.metadata = {missionAction: 'soot-container'};
  box('Behälterboden', 0.5, 0.025, 1, 0.24, 0.02, 0.24, plastic);

  // Kontrollspiegel
  const mirrorHolder = new TransformNode('Kontrollspiegel', scene);
  mirrorHolder.parent = root;
  mirrorHolder.position.set(0, 0.8, 0.7);

  const mirrorFrame = MeshBuilder.CreateBox('Spiegelrahmen', {width: 0.12, height: 0.08, depth: 0.012}, scene);
  mirrorFrame.parent = mirrorHolder;
  mirrorFrame.material = metal;

  const mirror = MeshBuilder.CreatePlane('Spiegelfläche', {
    width: 0.105,
    height: 0.065,
    sideOrientation: Mesh.DOUBLESIDE
  }, scene);
  mirror.parent = mirrorHolder;
  mirror.position.z = -0.009;

  const mirrorMaterial = new StandardMaterial('Spiegel', scene);
  const mirrorTexture = new MirrorTexture('Inspektionsreflexion', 256, scene, true);
  mirrorTexture.renderList = mirrorSurfaces;
  mirrorMaterial.reflectionTexture = mirrorTexture;
  mirrorMaterial.diffuseColor = Color3.Black();
  mirror.material = mirrorMaterial;

  // Taschenlampe
  const flash = new TransformNode('Taschenlampe', scene);
  flash.parent = root;
  flash.position.set(0.1, 0.8, 0.6);

  const flashBody = MeshBuilder.CreateCylinder('Lampenkörper', {diameter: 0.035, height: 0.18, tessellation: 20}, scene);
  flashBody.parent = flash;
  flashBody.rotation.x = Math.PI / 2;
  flashBody.material = plastic;

  const lamp = new SpotLight('Prüflicht', new Vector3(0, 0, -0.1), new Vector3(0, 0, -1), Math.PI / 5, 2, scene);
  lamp.parent = flash;
  lamp.intensity = 3;
  lamp.range = 10;
  lamp.setEnabled(false);

  const mirrorUpdate = scene.onBeforeRenderObservable.add(() => {
    mirror.computeWorldMatrix(true);
    const normal = Vector3.TransformNormal(new Vector3(0, 0, -1), mirror.getWorldMatrix()).normalize();
    mirrorTexture.mirrorPlane = Plane.FromPositionAndNormal(mirror.getAbsolutePosition(), normal);
  });

  return {
    root,

    anchors: {
      A: origin.add(new Vector3(0.8, 7.335, 0)),
      B: origin.add(new Vector3(0.7, 5.785, 0.65)),
      D: origin.add(new Vector3(0, 0.015, 0.95))
    },

    setDefect(defect) {
      sootPanel.material = defect === 'glossy-soot' ? gloss : soot;
      obstruction.setEnabled(defect === 'obstruction');
      wire.setEnabled(defect === 'wire');
      crack.setEnabled(defect === 'damage');
    },

    setLight(enabled) {
      lamp.setEnabled(Boolean(enabled));
    },

    setMirrorPose(pos, yaw = 0, pitch = 0) {
      mirrorHolder.position.copyFrom(pos);
      mirrorHolder.rotation.set(pitch, yaw, 0);
    },

    setFlashPose(pos, yaw = 0, pitch = 0) {
      flash.position.copyFrom(pos);
      flash.rotation.set(pitch, yaw, 0);
    },

    open(which, opened) {
      (which === 'D' ? doorD : doorB).setEnabled(!opened);
    },

    update(state) {
      const useRod = state.tool === 'rod';
      const useRope = state.tool === 'rope';

      rodBrush.setEnabled(useRod);
      rod.setEnabled(useRod);
      ropeBrush.setEnabled(useRope);
      rope.setEnabled(useRope);

      const upper = state.upper || 0;
      const lower = state.lower || 0;

      const rodY = 6.5 + 1.6 * upper;
      rodBrush.position.y = rodY;
      stretch(rod, 0, 0, 6.5, rodY);

      const ropeTop = state.route === 'A' ? 8.4 : 6.5;
      const ropeY = state.route === 'A' ? 8.1 - 7.4 * lower : 6.4 - 5.7 * lower;
      ropeBrush.position.y = ropeY;
      stretch(rope, 0, 0, ropeTop, ropeY + 0.08);

      sootPanel.visibility = Math.max(0.15, 1 - (state.coverage || 0) * 0.8);
    },

    dispose() {
      scene.onBeforeRenderObservable.remove(mirrorUpdate);
      mirrorTexture.dispose();
      lamp.dispose();
      root.dispose(false, true);
    }
  };
}
