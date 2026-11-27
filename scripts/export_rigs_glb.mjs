// Cross-Platform Portable .glb Exporter for Voidmetric 3D Anime Rigs (Windows + Debian 12 Linux!)
// Usage:
//   node scripts/export_rigs_glb.mjs \
//     --remotion-root ./workspace-remotion \
//     --slug gojo-limitless \
//     --rigs mc:rig3d_mc.ts:buildMCRig3D:wake_orb,guest:rig3d_guest.ts:buildGuestRig3D:power_point
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[k] = v;
    }
  }
  return out;
}

function findBrowser(remotionRoot, override) {
  if (override && fs.existsSync(override)) return override;
  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    );
  } else {
    for (const cmd of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"]) {
      try {
        const p = execSync(`which ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
        if (p) candidates.push(p);
      } catch {}
    }
  }
  // Check Remotion's bundled chrome-headless-shell inside node_modules/.remotion
  const remotionDir = path.join(remotionRoot, "node_modules", ".remotion");
  if (fs.existsSync(remotionDir)) {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/^(chrome|chrome-headless-shell)(\.exe)?$/i.test(entry.name)) candidates.push(full);
      }
    };
    walk(remotionDir);
  }
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  throw new Error("No Chromium/Chrome executable found. Install chromium or run `npx remotion browser ensure`.");
}

async function main() {
  const args = parseArgs(process.argv);
  const remotionRoot = path.resolve(args["remotion-root"] || ".");
  const slug = args.slug;
  if (!slug) {
    console.error("ERROR: --slug is required (e.g. --slug gojo-limitless)");
    process.exit(1);
  }

  const rigSpecsRaw = args.rigs || "mc:rig3d_mc.ts:buildMCRig3D:wake_orb,guest:rig3d_guest.ts:buildGuestRig3D:idle";
  const rigSpecs = rigSpecsRaw.split(",").map((item) => {
    const [outName, file, fnName, pose = "idle"] = item.split(":");
    return { outName, file, fnName, pose };
  });

  const outDir = path.resolve(args["out-dir"] || path.join(remotionRoot, "projects", slug, "rigs3d"));
  fs.mkdirSync(outDir, { recursive: true });

  // Resolve esbuild from the target Remotion project's node_modules
  const req = createRequire(path.join(remotionRoot, "package.json"));
  const esbuild = req("esbuild");

  const srcBase = path.join(remotionRoot, "src", "videos", slug).replace(/\\/g, "/");
  const imports = rigSpecs
    .map((r, i) => `import { ${r.fnName} as buildRig_${i} } from "${srcBase}/${r.file}";`)
    .join("\n");
  const listEntries = rigSpecs
    .map((r, i) => `["${r.outName}_3d_rig.glb", buildRig_${i}(), "${r.pose}"]`)
    .join(",\n    ");

  const entrySrc = `
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
${imports}

function toExportableScene(rigRoot) {
  rigRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.name.endsWith("_ink")) {
      obj.material = new THREE.MeshBasicMaterial({ color: "#13091d", side: THREE.BackSide });
      return;
    }
    const m = obj.material;
    if (m && m.uniforms && m.uniforms.uBaseColor) {
      obj.material = new THREE.MeshStandardMaterial({
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
    }
  });
  return rigRoot;
}

async function run() {
  const exporter = new GLTFExporter();
  const rigs = [
    ${listEntries}
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
  await fetch("/error", { method: "POST", body: String((err && err.stack) || err) });
});
`;

  const built = await esbuild.build({
    stdin: { contents: entrySrc, resolveDir: remotionRoot, loader: "ts" },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
  });
  const html = `<!doctype html><html><body><script>${built.outputFiles[0].text}</script></body></html>`;

  const chromeBin = findBrowser(remotionRoot, args.chrome);
  const prof = path.join(os.tmpdir(), `voidmetric-glb-profile-${Date.now()}`);
  fs.mkdirSync(prof, { recursive: true });

  let chromeProc = null;
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
        fs.writeFileSync(path.join(outDir, name), buf);
        console.log(`EXPORTED ${name} (${(buf.length / 1024).toFixed(1)} KB) -> ${outDir}`);
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
        setTimeout(() => {
          try {
            fs.rmSync(prof, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          } catch {}
          server.close();
          process.exit(0);
        }, 250);
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
        try {
          fs.rmSync(prof, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch {}
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
    chromeProc = spawn(
      chromeBin,
      ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", `--user-data-dir=${prof}`, url],
      { stdio: "ignore" }
    );
  });
}

main().catch((err) => {
  console.error("GLB EXPORT FAILED:", err);
  process.exit(1);
});
