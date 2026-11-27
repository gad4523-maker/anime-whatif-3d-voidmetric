// Voidmetric v3.0 Hand-Socket Attachment & Cel-Shaded 3D Anime Weapon / Prop Arsenal!
// Drop-in procedural 3D weapons & everyday objects (Katana, Staff, Energy Blade, Science Flask, Mug, Smartphone)
// that lock onto ANY `AnimeRig3D` hand/wrist bone via `attachToHand()`!
import * as THREE from "three";
import { Hand3D, RingSpec, addPart, loftRings, makeAnimeMat } from "./rig3d_core";

export function attachToHand(
  hand: Hand3D,
  prop: THREE.Object3D,
  opts: { pos?: [number, number, number]; rot?: [number, number, number]; scale?: number } = {}
): THREE.Group {
  const socket = new THREE.Group();
  socket.name = "hand_prop_socket";
  socket.position.set(...(opts.pos ?? [0, -0.068, 0.018]));
  socket.rotation.set(...(opts.rot ?? [Math.PI * 0.5, 0, 0]));
  if (opts.scale !== undefined) socket.scale.setScalar(opts.scale);
  socket.add(prop);
  hand.root.add(socket);
  return socket;
}

/** Iconic Curved Cel-Shaded Anime Katana (Steel Blade + Tsuba Guard + Diamond-Wrapped Tsuka + Optional Aura Edge!) */
export function buildKatana3D(
  opts: { length?: number; bladeColor?: string; hiltColor?: string; guardColor?: string; glowEdge?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.name = "katana_3d";
  const len = opts.length ?? 1.02;
  const mSteel = makeAnimeMat({
    color: opts.bladeColor ?? "#e6edf6",
    shadowColor: "#7c8ca4",
    rimColor: opts.glowEdge ?? "#ffffff",
    rimStrength: opts.glowEdge ? 0.95 : 0.55,
    specStrength: 0.72,
    specSize: 0.94,
    metalness: 0.35,
  });
  const mHilt = makeAnimeMat({ color: opts.hiltColor ?? "#1a1824", shadowColor: "#0c0a14", specStrength: 0.05 });
  const mGuard = makeAnimeMat({ color: opts.guardColor ?? "#d4a438", shadowColor: "#745214", specStrength: 0.55, metalness: 0.4 });

  // Hilt (Tsuka) extending along -Y from guard at y=0
  addPart(g, new THREE.CylinderGeometry(0.015, 0.017, 0.26, 12), mHilt, { pos: [0, -0.13, 0], scale: [0.75, 1, 1.15], outline: 0.0024 });
  addPart(g, new THREE.CylinderGeometry(0.019, 0.019, 0.025, 12), mGuard, { pos: [0, -0.26, 0], scale: [0.8, 1, 1.2], outline: 0.0022 });
  // Circular Tsuba hand-guard
  addPart(g, new THREE.CylinderGeometry(0.044, 0.044, 0.010, 20), mGuard, { pos: [0, 0.0, 0], outline: 0.0025 });
  addPart(g, new THREE.BoxGeometry(0.022, 0.032, 0.030), mGuard, { pos: [0, 0.018, 0], outline: 0.0020 });

  // Sleek slightly-curved tapered katana blade extending along +Y
  const bladeRings: RingSpec[] = [
    { y: 0.03, rx: 0.0045, rz: 0.018, zOff: 0.000 },
    { y: len * 0.35, rx: 0.0042, rz: 0.017, zOff: -0.008 },
    { y: len * 0.72, rx: 0.0036, rz: 0.015, zOff: -0.026 },
    { y: len * 0.94, rx: 0.0026, rz: 0.011, zOff: -0.044 },
    { y: len, rx: 0.0010, rz: 0.002, zOff: -0.052 },
  ];
  addPart(g, loftRings(bladeRings, 12), mSteel, { outline: 0.0026, name: "katana_blade" });

  if (opts.glowEdge) {
    const edgeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(opts.glowEdge).multiplyScalar(3.4),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const auraRings = bladeRings.map((r) => ({ ...r, rx: r.rx * 1.9, rz: r.rz * 1.25 }));
    addPart(g, loftRings(auraRings, 10), edgeMat, { outline: 0, castShadow: false });
  }
  return g;
}

/** Cel-Shaded Anime Staff / Bo / Spear with Optional Floating Glowing Crystal Tip! */
export function buildStaff3D(
  opts: { length?: number; shaftColor?: string; accentColor?: string; orbColor?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.name = "staff_3d";
  const len = opts.length ?? 1.85;
  const mShaft = makeAnimeMat({ color: opts.shaftColor ?? "#2c2438", shadowColor: "#14101e", specStrength: 0.25 });
  const mAccent = makeAnimeMat({ color: opts.accentColor ?? "#e2b242", shadowColor: "#7a5616", specStrength: 0.5, metalness: 0.35 });
  addPart(g, new THREE.CylinderGeometry(0.016, 0.018, len, 14), mShaft, { pos: [0, len * 0.18, 0], outline: 0.0026 });
  addPart(g, new THREE.TorusGeometry(0.064, 0.011, 10, 24), mAccent, { pos: [0, len * 0.68 + 0.05, 0], outline: 0.0022 });
  if (opts.orbColor) {
    addPart(
      g,
      new THREE.SphereGeometry(0.036, 16, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.orbColor).multiplyScalar(3.6) }),
      { pos: [0, len * 0.68 + 0.05, 0], outline: 0, castShadow: false }
    );
  }
  return g;
}

/** Blazing Pure-Energy Anime Blade / Lightsaber / Cursed Construct! */
export function buildEnergyBlade3D(
  opts: { length?: number; primary?: string; core?: string } = {}
): THREE.Group {
  const g = new THREE.Group();
  g.name = "energy_blade_3d";
  const len = opts.length ?? 1.05;
  const pCol = new THREE.Color(opts.primary ?? "#ff2454").multiplyScalar(3.2);
  const cCol = new THREE.Color(opts.core ?? "#ffffff").multiplyScalar(4.6);
  const mHilt = makeAnimeMat({ color: "#1c1e2a", shadowColor: "#0c0e14", specStrength: 0.3 });
  addPart(g, new THREE.CylinderGeometry(0.018, 0.020, 0.24, 14), mHilt, { pos: [0, -0.12, 0], outline: 0.0024 });
  addPart(g, new THREE.ConeGeometry(0.016, len, 12), new THREE.MeshBasicMaterial({ color: cCol }), { pos: [0, len * 0.5, 0], outline: 0, castShadow: false });
  addPart(
    g,
    new THREE.ConeGeometry(0.034, len * 1.03, 14),
    new THREE.MeshBasicMaterial({ color: pCol, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending, depthWrite: false }),
    { pos: [0, len * 0.5, 0], outline: 0, castShadow: false }
  );
  return g;
}

/** Anime Science Erlenmeyer Flask with Glowing Bubbling Potion / Chemical Liquid (Ideal for Dr. STONE / Alchemy!) */
export function buildScienceFlask3D(opts: { liquidColor?: string; scale?: number } = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = "science_flask_3d";
  const sc = opts.scale ?? 1.0;
  const mGlass = makeAnimeMat({ color: "#d8f4ff", shadowColor: "#84b8d4", rimColor: "#ffffff", rimStrength: 0.65, specStrength: 0.7, transparent: true, opacity: 0.42 });
  const mLiquid = new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.liquidColor ?? "#46ff96").multiplyScalar(2.4) });
  const flaskRings: RingSpec[] = [
    { y: 0.00, rx: 0.056 * sc, rz: 0.056 * sc },
    { y: 0.02 * sc, rx: 0.062 * sc, rz: 0.062 * sc },
    { y: 0.11 * sc, rx: 0.022 * sc, rz: 0.022 * sc },
    { y: 0.17 * sc, rx: 0.022 * sc, rz: 0.022 * sc },
    { y: 0.18 * sc, rx: 0.028 * sc, rz: 0.028 * sc },
  ];
  addPart(g, loftRings(flaskRings, 20), mGlass, { outline: 0.0022 });
  const liqRings: RingSpec[] = [
    { y: 0.006 * sc, rx: 0.050 * sc, rz: 0.050 * sc },
    { y: 0.022 * sc, rx: 0.054 * sc, rz: 0.054 * sc },
    { y: 0.065 * sc, rx: 0.036 * sc, rz: 0.036 * sc },
  ];
  addPart(g, loftRings(liqRings, 18), mLiquid, { outline: 0, castShadow: false });
  return g;
}

/** Everyday Hook Prop: Cel-Shaded Ceramic Coffee Mug */
export function buildCoffeeMug3D(opts: { color?: string } = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = "coffee_mug_3d";
  const mCup = makeAnimeMat({ color: opts.color ?? "#f0ebe1", shadowColor: "#a89c92", specStrength: 0.25 });
  const mCoffee = makeAnimeMat({ color: "#341e14", shadowColor: "#1a0c06", specStrength: 0.35 });
  addPart(g, new THREE.CylinderGeometry(0.044, 0.040, 0.105, 18), mCup, { pos: [0, 0.052, 0], outline: 0.0024 });
  addPart(g, new THREE.CylinderGeometry(0.039, 0.039, 0.008, 16), mCoffee, { pos: [0, 0.098, 0], outline: 0 });
  addPart(g, new THREE.TorusGeometry(0.026, 0.007, 8, 16, Math.PI), mCup, { pos: [0.044, 0.054, 0], rot: [0, 0, -Math.PI * 0.5], outline: 0.0020 });
  return g;
}

/** Everyday Hook Prop: Glowing Smartphone */
export function buildSmartphone3D(opts: { screenColor?: string } = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = "smartphone_3d";
  const mBody = makeAnimeMat({ color: "#1c202c", shadowColor: "#0a0c12", specStrength: 0.4 });
  const mScreen = new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.screenColor ?? "#6ce0ff").multiplyScalar(1.6) });
  addPart(g, new THREE.BoxGeometry(0.072, 0.145, 0.009), mBody, { outline: 0.0020 });
  addPart(g, new THREE.PlaneGeometry(0.064, 0.132), mScreen, { pos: [0, 0, 0.0052], outline: 0, castShadow: false });
  return g;
}
