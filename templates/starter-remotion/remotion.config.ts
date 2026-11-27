import { Config } from "@remotion/cli/config";

// Automatically selects CPU software WebGL ("swangle") on Linux cloud sandboxes (e.g. Gemini Tasks)
// and GPU "angle" on Windows/macOS workstations. Override anytime via REMOTION_GL=angle|swangle.
const gl =
  (process.env.REMOTION_GL as "angle" | "swangle" | "swiftshader" | undefined) ??
  (process.platform === "linux" ? "swangle" : "angle");

Config.setChromiumOpenGlRenderer(gl);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
