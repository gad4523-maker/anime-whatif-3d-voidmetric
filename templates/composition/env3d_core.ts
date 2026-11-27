// Voidmetric v3.0 Modular Cel-Shaded 3D Anime Environment Builder!
// Instantly builds rich, inked `twoTone` anime sets (Modern Room, Tokyo Street, Crater Battlefield,
// Forest Grove, Cosmic Mindscape, Cel Clouds, Starfield) so episodes NEVER look like empty flat boxes!
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";

const cel = (color: string) => twoTone(new THREE.MeshLambertMaterial({ color }));

/** 1. Detailed Modern Anime Bedroom / Kitchen / Lab Interior (Window + Sunlight + Desk/Counter + Shelving!) */
export function buildModernRoom(
  originX = 0,
  opts: { wallColor?: string; floorColor?: string; accentColor?: string; windowGlow?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const mFloor = cel(opts.floorColor ?? "#c79e72");
  const mWall = cel(opts.wallColor ?? "#efe7db");
  const mTrim = cel("#5c4434");
  const mCounter = cel(opts.accentColor ?? "#424a5e");

  // Warm plank floor + back & side walls
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 10), mFloor);
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 4.6, 0.35), mWall);
  backWall.position.set(0, 2.3, -3.2);
  backWall.receiveShadow = true;
  g.add(backWall);

  const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.6, 10), mWall);
  sideWallL.position.set(-4.8, 2.3, 0);
  g.add(sideWallL);

  // Baseboard trim
  const trim = new THREE.Mesh(new THREE.BoxGeometry(10, 0.16, 0.08), mTrim);
  trim.position.set(0, 0.08, -3.0);
  g.add(trim);

  // Framed anime window with glowing morning/night backdrop
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.75, 0.12), mTrim);
  winFrame.position.set(0.2, 2.25, -3.0);
  g.add(winFrame);
  const winPane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.26, 1.52),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.windowGlow ?? "#d8eeff").multiplyScalar(1.35) })
  );
  winPane.position.set(0.2, 2.25, -2.93);
  winPane.layers.set(NOINK);
  g.add(winPane);
  const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.58, 0.14), mTrim);
  mullionV.position.set(0.2, 2.25, -2.96);
  g.add(mullionV);

  // Sleek counter / study table in background
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.92, 0.95), mCounter);
  counter.position.set(-1.35, 0.46, -2.4);
  counter.castShadow = true;
  counter.receiveShadow = true;
  g.add(counter);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.32, 0.08, 1.04), cel("#e6dfd4"));
  counterTop.position.set(-1.35, 0.94, -2.4);
  g.add(counterTop);

  // Wall shelf + books
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.34), mTrim);
  shelf.position.set(-2.4, 2.35, -2.84);
  g.add(shelf);
  const bookCols = ["#d64550", "#3a78c8", "#e8b43c", "#42a872", "#6848a8"];
  bookCols.forEach((c, i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28 + (i % 3) * 0.05, 0.22), cel(c));
    b.position.set(-2.95 + i * 0.14, 2.53, -2.84);
    g.add(b);
  });

  return g;
}

/** 2. Stylized Tokyo / Shonen City Street (Asphalt + Crosswalk + Sidewalks + Buildings + Glowing Windows + Streetlights!) */
export function buildCityStreet(
  originX = 0,
  opts: { roadColor?: string; nightWindows?: boolean; accentGlow?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const road = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 28), cel(opts.roadColor ?? "#3a3e4d"));
  road.position.set(0, -0.2, -4);
  road.receiveShadow = true;
  g.add(road);

  // Crisp crosswalk stripes
  const mStripe = cel("#ece9df");
  for (let i = -3; i <= 3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 2.2), mStripe);
    s.position.set(i * 0.95, 0.01, -1.6);
    g.add(s);
  }

  // Sidewalks
  const mWalk = cel("#969aa6");
  for (const sx of [-6.2, 6.2]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 28), mWalk);
    w.position.set(sx, 0.06, -4);
    w.receiveShadow = true;
    g.add(w);
  }

  // Stylized cel anime buildings lining both sides + skyline backdrop
  const bSpecs: [number, number, number, number, number, string][] = [
    [-7.2, -4.5, 4.4, 11.5, 5.2, "#c8beb4"],
    [-7.6, -11.5, 4.8, 15.0, 5.8, "#8e99ad"],
    [7.2, -4.8, 4.6, 12.8, 5.2, "#b4bcc8"],
    [7.6, -12.0, 5.0, 17.0, 5.6, "#7b8298"],
    [-2.4, -17.0, 4.6, 19.0, 4.6, "#667088"],
    [2.8, -18.5, 5.2, 22.0, 4.8, "#58627a"],
  ];
  const winMat = opts.nightWindows
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.accentGlow ?? "#ffda82").multiplyScalar(1.5) })
    : cel("#86b8e0");

  bSpecs.forEach(([x, z, bw, bh, bd, col]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), cel(col));
    m.position.set(x, bh * 0.5, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    // Window band strips
    for (let wy = 2.0; wy < bh - 1.2; wy += 2.0) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.78, 0.65, bd + 0.06), winMat);
      strip.position.set(x, wy, z);
      if (opts.nightWindows) strip.layers.set(NOINK);
      g.add(strip);
    }
  });

  // Streetlight poles
  const mPole = cel("#2c303a");
  const mLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff0c4").multiplyScalar(2.2) });
  for (const [px, pz] of [[-4.3, -2.8], [4.3, -6.2], [-4.3, -10.0]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.6, 10), mPole);
    pole.position.set(px, 2.3, pz);
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), mPole);
    arm.position.set(px + (px < 0 ? 0.5 : -0.5), 4.55, pz);
    g.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mLamp);
    lamp.position.set(px + (px < 0 ? 0.95 : -0.95), 4.46, pz);
    lamp.layers.set(NOINK);
    g.add(lamp);
  }
  return g;
}

/** 3. Shattered Anime Battlefield / Wasteland Crater (Jagged Rock Pillars + Uplifted Slabs + Rubble!) */
export function buildBattlefieldCrater(
  originX = 0,
  opts: { groundColor?: string; rockColor?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.4, 32), cel(opts.groundColor ?? "#8a7868"));
  ground.position.set(0, -0.2, -2);
  ground.receiveShadow = true;
  g.add(ground);

  const mRock = cel(opts.rockColor ?? "#645850");
  // Dramatic background jagged anime mesa pillars (framing left/right edges while leaving center sky clean!)
  const pillars: [number, number, number, number, number][] = [
    [-6.2, -9.5, 1.8, 7.2, 0.14],
    [-3.6, -12.5, 1.5, 9.4, -0.10],
    [4.2, -11.5, 1.7, 8.6, 0.12],
    [6.8, -8.8, 2.0, 6.4, -0.15],
  ];
  for (const [px, pz, pr, ph, tilt] of pillars) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(pr, ph, 7), mRock);
    p.position.set(px, ph * 0.45, pz);
    p.rotation.z = tilt;
    p.castShadow = true;
    g.add(p);
  }

  // Ring of upturned fractured ground boulders framing the combat stage
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rad = 4.2 + (i % 3) * 1.4;
    if (Math.sin(a) > 0.65) continue; // keep foreground camera lane unobstructed!
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + (i % 4) * 0.22, 0), mRock);
    b.position.set(Math.cos(a) * rad, 0.22, Math.sin(a) * rad - 1.5);
    b.scale.set(1.3, 0.75, 1.0);
    b.rotation.set(i * 0.5, i * 1.1, i * 0.3);
    b.castShadow = true;
    g.add(b);
  }
  return g;
}

/** 4. Lush Cel-Shaded Anime Forest / Stone-World Grove (Trees, Layered Canopies, Boulders, Grass Clearing!) */
export function buildForestGrove(
  originX = 0,
  opts: { grassColor?: string; foliageA?: string; foliageB?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const grass = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.4, 32), cel(opts.grassColor ?? "#6da856"));
  grass.position.set(0, -0.2, -2);
  grass.receiveShadow = true;
  g.add(grass);

  const mTrunk = cel("#6e4c34");
  const mLeafA = cel(opts.foliageA ?? "#3e8c4c");
  const mLeafB = cel(opts.foliageB ?? "#5ab45e");

  const trees: [number, number, number][] = [
    [-4.6, -4.8, 1.1], [-2.8, -8.5, 1.35], [0.4, -10.5, 1.4],
    [3.4, -8.2, 1.25], [4.9, -4.6, 1.05], [-6.8, -7.2, 1.3], [6.6, -7.5, 1.25],
  ];
  trees.forEach(([tx, tz, sc], i) => {
    const tr = new THREE.Group();
    tr.position.set(tx, 0, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * sc, 0.30 * sc, 3.4 * sc, 9), mTrunk);
    trunk.position.y = 1.7 * sc;
    trunk.castShadow = true;
    tr.add(trunk);
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35 * sc, 1), i % 2 ? mLeafA : mLeafB);
    c1.position.set(0, 3.8 * sc, 0);
    c1.scale.set(1.15, 0.92, 1.15);
    c1.castShadow = true;
    tr.add(c1);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95 * sc, 1), i % 2 ? mLeafB : mLeafA);
    c2.position.set(0.65 * sc, 3.2 * sc, 0.35 * sc);
    tr.add(c2);
    g.add(tr);
  });
  return g;
}

/** 5. Dramatic Anime Cosmic Void / Mindscape / Domain Realm (Glowing Grid + Floating Monolith Shards!) */
export function buildCosmicRealm(
  originX = 0,
  opts: { floorColor?: string; gridColor?: string; accentHex?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 0.4, 36), cel(opts.floorColor ?? "#140c28"));
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const grid = new THREE.GridHelper(32, 32, opts.accentHex ?? "#7832e8", opts.gridColor ?? "#26144a");
  grid.position.y = 0.02;
  grid.layers.set(NOINK);
  g.add(grid);

  const mObsidian = cel("#1e1634");
  const mGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.accentHex ?? "#8c38ff").multiplyScalar(2.4) });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 1.45 - Math.PI * 1.22;
    const rr = 6.5 + (i % 3) * 2.2;
    const h = 3.2 + (i % 4) * 1.8;
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.85, h, 0.85), mObsidian);
    mon.position.set(Math.cos(a) * rr, h * 0.45 + (i % 2) * 0.9, Math.sin(a) * rr);
    mon.rotation.set(0.08 * (i % 3 - 1), a, 0.12 * (i % 2 ? 1 : -1));
    g.add(mon);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), mGlow);
    band.position.copy(mon.position);
    band.rotation.copy(mon.rotation);
    band.layers.set(NOINK);
    g.add(band);
  }
  return g;
}

/** 6. Cel-Shaded Layered Anime Sky Clouds (for crisp Makoto Shinkai / Ghibli sky depth!) */
export function buildCelClouds(originX = 0, count = 8, color = "#fff9f4"): THREE.Group {
  const g = new THREE.Group();
  g.position.set(originX, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < count; i++) {
    const cl = new THREE.Group();
    const ang = -Math.PI * 0.82 + (i / Math.max(1, count - 1)) * Math.PI * 0.64;
    const dist = 36 + (i % 3) * 14;
    cl.position.set(Math.cos(ang) * dist, 10 + (i % 4) * 3.5, Math.sin(ang) * dist);
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(2.0 + (k === 1 ? 1.1 : 0.2), 12, 10), mat);
      puff.position.set((k - 1.5) * 1.8, (k % 2) * 0.6, (k % 3 - 1) * 0.5);
      puff.scale.set(1.4, 0.72, 0.9);
      puff.layers.set(NOINK);
      cl.add(puff);
    }
    g.add(cl);
  }
  return g;
}

/** 7. Crisp HDR Starfield Dome (for Space / Night / Cosmic Void realms!) */
export function buildStarfield(originX = 0, count = 320, radius = 95): THREE.Points {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const h = (k: number) => {
      const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const u = h(1) * Math.PI * 2;
    const v = Math.acos(2 * h(2) - 1);
    const r = radius * (0.75 + h(3) * 0.35);
    pos[i * 3] = Math.sin(v) * Math.cos(u) * r;
    pos[i * 3 + 1] = Math.abs(Math.cos(v) * r) + 4;
    pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: new THREE.Color(1.8, 1.9, 2.4), size: 0.65, sizeAttenuation: true })
  );
  pts.position.set(originX, 0, 0);
  pts.layers.set(NOINK);
  return pts;
}
