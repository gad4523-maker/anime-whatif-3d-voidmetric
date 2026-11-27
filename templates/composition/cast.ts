// Voidmetric v3.0 3D Cast Controller — Independent Contact Shadows per Actor + Live Expressions + Universal Power Color!
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { blobMaterial } from "../bridge/cardshade";
import { AnimeRig3D } from "./rig3d_core";
import { buildMCRig3D } from "./rig3d_mc";
import { buildGuestRig3D } from "./rig3d_guest";
import { applyAnimeMotion } from "./anim3d_core";
import { EPISODE_POWER_COLOR, FPS, SHOTS, Z_HOME, Z_VOID, clamp01 } from "./story";

const CARD_GEO = new THREE.PlaneGeometry(1, 1);

const contactBlobTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 58);
  gr.addColorStop(0, "rgba(72, 58, 92, 0.95)");
  gr.addColorStop(0.65, "rgba(150, 140, 170, 0.45)");
  gr.addColorStop(1, "rgba(255, 255, 255, 0.0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

function makeActorBlob(parent: THREE.Object3D): THREE.Mesh {
  const m = new THREE.Mesh(CARD_GEO, blobMaterial(contactBlobTex));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 0.5;
  m.layers.set(NOINK);
  m.visible = false;
  parent.add(m);
  return m;
}

export class EpisodeCast {
  readonly mc: AnimeRig3D;
  readonly guest: AnimeRig3D;
  private blobs: Map<AnimeRig3D, THREE.Mesh>;

  constructor(parent: THREE.Object3D) {
    this.mc = buildMCRig3D({ powerEyes: true, powerColor: EPISODE_POWER_COLOR });
    this.guest = buildGuestRig3D({ intense: false });
    this.mc.root.visible = false;
    this.guest.root.visible = false;
    parent.add(this.mc.root);
    parent.add(this.guest.root);

    // Every actor gets its own independent grounded contact shadow blob (works cleanly when multiple actors share a shot!)
    this.blobs = new Map<AnimeRig3D, THREE.Mesh>([
      [this.mc, makeActorBlob(parent)],
      [this.guest, makeActorBlob(parent)],
    ]);
  }

  private place(rig: AnimeRig3D, x: number, y: number, z: number, yaw: number, scale: number, blob = true) {
    rig.root.visible = true;
    rig.root.position.set(x, y, z);
    rig.root.rotation.set(0, yaw, 0);
    rig.root.scale.setScalar(scale);
    const b = this.blobs.get(rig);
    if (b && blob) {
      b.visible = true;
      b.position.set(x, y + 0.015, z);
      b.scale.set(0.95 * scale, 0.62 * scale, 1);
    }
  }

  update(shotId: number, f: number, _cam: THREE.PerspectiveCamera, _actorShadow: boolean) {
    const t = f / FPS;
    const sDef = SHOTS[shotId - 1];
    const p = clamp01((f - sDef.a) / Math.max(1, sDef.b - sDef.a));

    this.mc.root.visible = false;
    this.guest.root.visible = false;
    for (const b of this.blobs.values()) b.visible = false;

    if (shotId === 1) {
      this.mc.setAction?.("wake_discover", p, t);
      this.place(this.mc, Z_HOME, 0, 0, 0.14, 1.0, true);
    } else {
      applyAnimeMotion(this.guest, "power_charge", p, t, 0.99);
      // Keep talk=false (omit 3rd arg!) during off-screen narrator voiceover — only pass true if THIS character is speaking!
      this.guest.setExpr?.(p > 0.55 ? "shout" : "smirk", t);
      this.guest.setGaze?.(0, 0.1);
      this.place(this.guest, Z_VOID, 0.0, 0, -0.1 + p * 0.2, 1.02, true);
    }
  }
}
