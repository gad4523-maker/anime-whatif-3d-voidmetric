// Ambient TypeScript declarations for untyped MIT/CC0 Voidmetric v4.3 dependencies
declare module "n8ao" {
  import * as THREE from "three";
  import { Pass } from "postprocessing";
  export class N8AOPostPass extends Pass {
    constructor(scene: THREE.Scene, camera: THREE.Camera, width?: number, height?: number);
    configuration: {
      aoRadius: number;
      distanceFalloff: number;
      intensity: number;
      color: THREE.Color;
      halfRes: boolean;
      denoiseSamples: number;
      denoiseRadius: number;
      aoSamples: number;
      [key: string]: unknown;
    };
    setQualityMode?(mode: "Performance" | "Low" | "Medium" | "High" | "Ultra"): void;
  }
}

declare module "troika-three-text" {
  import * as THREE from "three";
  export class Text extends THREE.Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    maxWidth: number;
    lineHeight: number;
    letterSpacing: number;
    textAlign: "left" | "right" | "center" | "justify";
    anchorX: number | "left" | "center" | "right";
    anchorY: number | "top" | "top-baseline" | "middle" | "bottom-baseline" | "bottom";
    color: THREE.ColorRepresentation;
    outlineWidth: number | string;
    outlineColor: THREE.ColorRepresentation;
    outlineOpacity: number;
    outlineBlur: number | string;
    strokeWidth: number | string;
    strokeColor: THREE.ColorRepresentation;
    fillOpacity: number;
    sdfGlyphSize: number;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
