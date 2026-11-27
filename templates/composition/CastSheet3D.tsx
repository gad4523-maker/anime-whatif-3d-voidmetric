// Stage 4 Mandatory 3D Character Rig Studio Showcase (1600x1000, 6 plates: frames 0..5)
//   f0: Guest Character 4-Panel Turnaround + Action Pose + X-Ray Skeleton
//   f1: Guest Character Dual Extreme Face & 3/4 Profile Close-Ups
//   f2: Locked Channel MC 4-Panel Turnaround + X-Ray Skeleton
//   f3: Full Cast Canon Scale Lineup (Guest + Locked Channel MC side-by-side!)
//   f4: Guest Live Facial Expressions Sheet A (SMIRK | GRIN | SHOUT | SHOCK)
//   f5: Guest Live Facial Expressions Sheet B (INTENSE | SNARL | PAIN | SMUG CLOSED)
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { NOINK } from "../bridge/ink";
import { ANIME_LIGHT } from "./rig3d_core";
import { buildGuestRig3D } from "./rig3d_guest";
import { buildMCRig3D } from "./rig3d_mc";

const STUDIO_MSAA = {{MSAA_SAMPLES}};

const makeStudioBloom = () =>
  new BloomEffect({
    blendFunction: BlendFunction.ADD,
    intensity: 0.52,
    luminanceThreshold: 1.0,
    luminanceSmoothing: 0.2,
    mipmapBlur: true,
    levels: 6,
    radius: 0.6,
  });

function makePedestal(radius = 0.62, ringColor = "#9d2cff"): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.08, 0.08, 36),
    new THREE.MeshStandardMaterial({ color: "#191426", roughness: 0.35, metalness: 0.35 })
  );
  base.position.y = -0.04;
  base.receiveShadow = true;
  base.layers.set(NOINK);
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.96, 0.011, 10, 44),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(ringColor).multiplyScalar(2.2) })
  );
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = 0.004;
  ring.layers.set(NOINK);
  g.add(ring);
  return g;
}

const StudioScene: React.FC = () => {
  const f = useCurrentFrame();
  const { camera } = useThree();

  const world = useMemo(() => {
    const root = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 36),
      new THREE.MeshStandardMaterial({ color: "#120d1f", roughness: 0.65, metalness: 0.25 })
    );
    floor.rotation.x = -Math.PI * 0.5;
    floor.position.y = -0.08;
    floor.receiveShadow = true;
    floor.layers.set(NOINK);
    root.add(floor);

    const grid = new THREE.GridHelper(24, 24, "#3e2668", "#23153c");
    grid.position.y = -0.075;
    grid.layers.set(NOINK);
    root.add(grid);

    root.add(new THREE.HemisphereLight("#e8deff", "#26183a", 0.95));
    const key = new THREE.DirectionalLight("#fff8ee", 2.2);
    key.position.set(4, 7, 6);
    key.castShadow = true;
    root.add(key);

    const stages: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const sg = new THREE.Group();
      sg.visible = false;
      root.add(sg);
      stages.push(sg);
    }

    // Stage 0: Guest Character 4-Panel Turnaround
    {
      const s = stages[0];
      const xs = [-1.95, -0.65, 0.65, 1.95];
      xs.forEach((x) => {
        const p = makePedestal(0.54, "#b438ff");
        p.position.x = x;
        s.add(p);
      });
      const g1 = buildGuestRig3D({ intense: false });
      g1.setPose("idle", 0);
      g1.root.position.set(xs[0], 0, 0);
      g1.root.rotation.y = 0.08;
      s.add(g1.root);

      const g2 = buildGuestRig3D({ intense: true });
      g2.setPose("power_point", 0.2);
      g2.root.position.set(xs[1], 0, 0);
      g2.root.rotation.y = -0.32;
      s.add(g2.root);

      const g3 = buildGuestRig3D({ intense: false });
      g3.setPose("idle", 0);
      g3.root.position.set(xs[2], 0, 0);
      g3.root.rotation.y = Math.PI * 0.78;
      s.add(g3.root);

      const g4 = buildGuestRig3D({ intense: false });
      g4.setPose("a_pose", 0);
      g4.setXRayRig(true);
      g4.root.position.set(xs[3], 0, 0);
      g4.root.rotation.y = -0.22;
      s.add(g4.root);
    }

    // Stage 1: Guest Dual Extreme Face Close-Ups (Front-3/4 Expression + Crisp Side-3/4 Profile verifying V-Jaw, 3D Nose & Ears!)
    {
      const s = stages[1];
      const gL = buildGuestRig3D({ intense: false });
      gL.setPose("idle", 0);
      gL.root.position.set(-0.42, 0, 0);
      gL.root.rotation.y = 0.18;
      s.add(gL.root);

      const gR = buildGuestRig3D({ intense: true });
      gR.setPose("idle", 0.1);
      gR.root.position.set(0.42, 0, 0);
      gR.root.rotation.y = -0.78; // 3/4 profile to showcase sharp upswept jawline, 3D nose & sculpted ear!
      s.add(gR.root);
    }

    // Stage 2: Locked Channel MC 4-Panel Turnaround
    {
      const s = stages[2];
      const xs = [-1.95, -0.65, 0.65, 1.95];
      xs.forEach((x) => {
        const p = makePedestal(0.54, "#c840ff");
        p.position.x = x;
        s.add(p);
      });
      const m1 = buildMCRig3D({ hakaiEyes: true });
      m1.setPose("wake_orb", 0);
      m1.root.position.set(xs[0], 0, 0);
      m1.root.rotation.y = 0.08;
      s.add(m1.root);

      const m2 = buildMCRig3D({ hakaiEyes: true });
      m2.setPose("hakai_aura", 0);
      m2.root.position.set(xs[1], 0, 0);
      m2.root.rotation.y = -0.32;
      s.add(m2.root);

      const m3 = buildMCRig3D({ hakaiEyes: false });
      m3.setPose("a_pose", 0);
      m3.root.position.set(xs[2], 0, 0);
      m3.root.rotation.y = Math.PI * 0.78;
      s.add(m3.root);

      const m4 = buildMCRig3D({ hakaiEyes: false });
      m4.setPose("a_pose", 0);
      m4.setXRayRig(true);
      m4.root.position.set(xs[3], 0, 0);
      m4.root.rotation.y = -0.24;
      s.add(m4.root);
    }

    // Stage 3: Full Cast Canon Height Lineup (Guest + Locked Channel MC)
    {
      const s = stages[3];
      s.add(makePedestal(1.75, "#b438ff"));
      const guest = buildGuestRig3D({ intense: false });
      guest.setPose("power_point", 0.2);
      guest.root.position.set(-0.62, 0, 0.05);
      guest.root.rotation.y = 0.18;
      s.add(guest.root);

      const mc = buildMCRig3D({ hakaiEyes: true });
      mc.setPose("wake_orb", 0.1);
      mc.root.position.set(0.68, 0, 0.05);
      mc.root.rotation.y = -0.22;
      s.add(mc.root);
    }

    // Stage 4 & Stage 5: Guest Live 8-Expression Facial Showcase Sheets (verifying live `setExpr` swaps!)
    const exprGroups: [string[], number][] = [
      [["smirk", "grin", "shout", "shock"], 4],
      [["intense", "snarl", "pain", "smug_closed"], 5],
    ];
    for (const [exprs, stIdx] of exprGroups) {
      const s = stages[stIdx];
      const xs = [-0.90, -0.30, 0.30, 0.90];
      exprs.forEach((ex, i) => {
        const g = buildGuestRig3D({ intense: false });
        g.setPose("idle", 0);
        g.setExpr?.(ex, -1, false);
        g.root.position.set(xs[i], 0, 0);
        g.root.rotation.y = i < 2 ? 0.10 : -0.10;
        s.add(g.root);
      });
    }

    return { root, stages };
  }, []);

  const idx = Math.max(0, Math.min(5, f));
  world.stages.forEach((sg, i) => {
    sg.visible = i === idx;
  });

  ANIME_LIGHT.uLightDir.value.set(0.45, 0.72, 0.62).normalize();
  ANIME_LIGHT.uRimBoost.value = idx === 1 || idx >= 4 ? 1.15 : 1.0;

  const cam = camera as THREE.PerspectiveCamera;
  cam.up.set(0, 1, 0);
  if (idx === 0 || idx === 2) {
    cam.position.set(0, 1.12, 4.95);
    cam.fov = 34;
    cam.lookAt(0, 1.04, 0);
  } else if (idx === 1) {
    cam.position.set(0, 1.72, 1.55);
    cam.fov = 30;
    cam.lookAt(0, 1.69, 0.04);
  } else if (idx === 4 || idx === 5) {
    cam.position.set(0, 1.70, 2.58);
    cam.fov = 30;
    cam.lookAt(0, 1.66, 0.04);
  } else {
    cam.position.set(0, 1.18, 4.35);
    cam.fov = 35;
    cam.lookAt(0, 1.08, 0);
  }
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  cam.layers.enable(NOINK);

  const fx = useMemo(
    () => ({
      bloom: makeStudioBloom(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    }),
    []
  );
  const passes = useMemo(
    () => [<primitive key="bloom" object={fx.bloom} />, <primitive key="tone" object={fx.tone} />],
    [fx]
  );

  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={STUDIO_MSAA}>{passes}</EffectComposer>
    </>
  );
};

const LABELS: { title: string; cols: string[] }[] = [
  {
    title: "GUEST CHARACTER — 3D ANIME RIG TURNAROUND & X-RAY SKELETON",
    cols: ["FRONT POSE", "3/4 ACTION POSE", "BACK 3/4 TURNAROUND", "3D SKELETON RIG"],
  },
  {
    title: "GUEST CHARACTER — EXTREME FACE, 3D NOSE, EARS & PROFILE JAWLINE CLOSE-UPS",
    cols: ["FRONT 3/4 PORTRAIT (EYES & V-CHIN)", "SIDE 3/4 PROFILE (3D NOSE, EAR & UPSWEPT JAW)"],
  },
  {
    title: "LOCKED CHANNEL MC — 3D ANIME RIG (SHARP V-JAWLINE + 24 BONES)",
    cols: ["FRONT HERO", "3/4 AURA STANCE", "BACK 3/4 TURNAROUND", "3D SKELETON RIG"],
  },
  {
    title: "FULL CAST CANON HEIGHT & STYLE LINEUP",
    cols: ["GUEST ANIME CHARACTER", "LOCKED CHANNEL MC (~1.74m)"],
  },
  {
    title: "GUEST CHARACTER — LIVE FACIAL EXPRESSIONS (SET A)",
    cols: ["SMIRK", "GRIN", "SHOUT (BATTLE CRY)", "SHOCK"],
  },
  {
    title: "GUEST CHARACTER — LIVE FACIAL EXPRESSIONS (SET B)",
    cols: ["INTENSE", "SNARL", "PAIN (WINCE)", "SMUG CLOSED (^ ^)"],
  },
];

export const CastSheet3D: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const meta = LABELS[Math.max(0, Math.min(LABELS.length - 1, f))];
  return (
    <AbsoluteFill style={{ background: "#0b0716" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 34, near: 0.1, far: 150 }}
      >
        <StudioScene />
      </ThreeCanvas>
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 28,
          right: 28,
          fontFamily: "sans-serif",
          fontSize: 22,
          fontWeight: 800,
          color: "#f4ecff",
          textShadow: "0 2px 10px rgba(0,0,0,0.85)",
          pointerEvents: "none",
        }}
      >
        {meta.title}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 28,
          right: 28,
          display: "grid",
          gridTemplateColumns: `repeat(${meta.cols.length}, 1fr)`,
          gap: 12,
          fontFamily: "sans-serif",
          pointerEvents: "none",
        }}
      >
        {meta.cols.map((c, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 15,
              fontWeight: 700,
              color: "#e2d4ff",
              background: "rgba(14, 9, 26, 0.72)",
              border: "1px solid rgba(190, 130, 255, 0.35)",
              borderRadius: 8,
              padding: "6px 10px",
            }}
          >
            {c}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
