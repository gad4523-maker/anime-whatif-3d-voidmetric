// Exports Lord Beerus, Channel MC, and Whis 3D Anime Rigs to standard binary .glb files
// WITH full embedded 1024x1024 painted Canvas2D face/costume/hair PNG textures & full bone hierarchy!
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import esbuild from "esbuild";

const ROOT = "F:/burgess/remotion-shorts";
const OUT_DIR = path.join(ROOT, "projects/beerus-hakai/rigs3d");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const ENTRY_SRC = `
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildBeerusRig3D } from "${ROOT}/src/videos/beerus/rig3d_beerus.ts";
import { buildMCRig3D } from "${ROOT}/src/videos/beerus/rig3d_mc.ts";
import { buildWhisRig3D } from "${ROOT}/src/videos/beerus/rig3d_whis.ts";

function toExportableScene(rigRoot) {
  const clone = rigRoot;
  clone.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.name.endsWith("_ink")) {
      obj.material = new THREE.MeshBasicMaterial({ color: "#13091d", side: THREE.BackSide });
      return;
    }
    const m = obj.material;
    if (m && m.uniforms && m.uniforms.uBaseColor) {
      const std = new THREE.MeshStandardMaterial({
        color: m.uniforms.uBaseColor.value.clone(),
        map: m.uniforms.uMap.value || null,
        metalness: m.uniforms.uMetalness.value * 0.85,
        roughness: 1.0 - m.uniforms.uMetalness.value * 0.65,
        emissive: m.uniforms.uEmissive.value.clone(),
        emissiveIntensity: m.uniforms.uEmissiveIntensity.value,
        transparent: m.transparent,
        opacity: m.uniforms.uOpacity.value,
        side: m.side,
      });
      obj.material = std;
    }
  });
  return clone;
}

async function run() {
  const exporter = new GLTFExporter();
  const rigs = [
    ["beerus_3d_rig.glb", buildBeerusRig3D({ snarl: false }), "regal"],
    ["mc_3d_rig.glb", buildMCRig3D({ hakaiEyes: true }), "wake_orb"],
    ["whis_3d_rig.glb", buildWhisRig3D(), "regal_staff"],
  ];
  for (const [filename, rig, pose] of rigs) {
    rig.setPose(pose, 0);
    rig.root.updateMatrixWorld(true);
    toExportableScene(rig.root);
    const glb = await exporter.parseAsync(rig.root, { binary: true });
    await fetch("/save/" + filename, { method: "POST", body: glb });
  }
  await fetch("/done", { method: "POST" });
}
run().catch(async (err) => {
  await fetch("/error", { method: "POST", body: String(err && err.stack || err) });
});
`;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const built = await esbuild.build({
    stdin: { contents: ENTRY_SRC, resolveDir: ROOT, loader: "ts" },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
  });
  const jsBundle = built.outputFiles[0].text;
  const html = `<!doctype html><html><body><script>${jsBundle}</script></body></html>`;

  let chromeProc = null;
  const saved = [];

  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }
    if (req.method === "POST" && req.url.startsWith("/save/")) {
      const name = path.basename(req.url.slice("/save/".length));
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const buf = Buffer.concat(chunks);
        const dest = path.join(OUT_DIR, name);
        fs.writeFileSync(dest, buf);
        saved.push({ name, bytes: buf.length });
        console.log(`EXPORTED ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
        res.writeHead(200);
        res.end("ok");
      });
      return;
    }
    if (req.method === "POST" && req.url === "/done") {
      res.writeHead(200);
      res.end("bye");
      setTimeout(() => {
        if (chromeProc) chromeProc.kill();
        server.close();
        process.exit(0);
      }, 150);
      return;
    }
    if (req.method === "POST" && req.url === "/error") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        console.error("BROWSER ERROR:", Buffer.concat(chunks).toString());
        res.writeHead(500);
        res.end("err");
        if (chromeProc) chromeProc.kill();
        server.close();
        process.exit(1);
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}/`;
    const prof = "F:/remotion-tmp/glb-export-profile";
    fs.mkdirSync(prof, { recursive: true });
    chromeProc = spawn(
      CHROME,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        `--user-data-dir=${prof}`,
        url,
      ],
      { stdio: "ignore" }
    );
  });
}

main();
