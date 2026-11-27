// Voidmetric v4.0 Pure 3D Hand-Bone Socket Attachment Primitives (ZERO Hardcoded Prop Presets!)
// Sculpt 100% custom anime-accurate props/weapons/tools per episode and socket them directly into any `Hand3D`!
import * as THREE from "three";
import { Hand3D } from "./rig3d_core";

/** Attach ANY custom 3D prop directly to a character's `Hand3D` palm/grip socket. */
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

/** Attach a gripped prop (handle/hilt/shaft) through the closed palm axis at exact `gripY` offset. */
export function attachThroughGrip(
  hand: Hand3D,
  prop: THREE.Object3D,
  opts: { gripY?: number; pos?: [number, number, number]; rot?: [number, number, number]; scale?: number } = {}
): THREE.Group {
  const socket = attachToHand(hand, new THREE.Group(), opts);
  const holder = socket.children[0] as THREE.Group;
  prop.position.y -= opts.gripY ?? 0;
  holder.add(prop);
  return socket;
}
