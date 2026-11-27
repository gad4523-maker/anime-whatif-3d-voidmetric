// Clean Rock-Steady Karaoke Subtitles Overlay (Voidmetric Locked Style)
// - Loads bundled OFL `public/fonts/Montserrat-Black.ttf` so typography looks 100% identical on Windows AND Debian 12 Linux!
// - NO black background box behind text
// - NO pop-up / bounce / scale animations (100% steady typography)
// - Crisp dark anime outline + karaoke active-word color highlight (60px baseline scaling cleanly to 1080p & 2K)
import React from "react";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SUBTITLE_CHUNKS } from "./subtitles_data";

const FONT_CSS = `
@font-face {
  font-family: 'VoidmetricBlack';
  src: url('${staticFile("fonts/Montserrat-Black.ttf")}') format('truetype');
  font-weight: 900;
  font-style: normal;
  font-display: block;
}
`;

export const SubtitlesOverlay: React.FC<{ frameOverride?: number }> = ({ frameOverride }) => {
  const curF = useCurrentFrame();
  const f = frameOverride ?? curF;
  const { height } = useVideoConfig();
  const scale = height / 1920; // Scales cleanly from 540p -> 1080p -> 2K 1440x2560

  const chunk = SUBTITLE_CHUNKS.find((c) => f >= c.fStart && f < c.fEnd);
  if (!chunk) return <style>{FONT_CSS}</style>;

  return (
    <>
      <style>{FONT_CSS}</style>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: `${Math.round(height * 0.145)}px`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${Math.round(54 * scale)}px`,
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: `${Math.round(10 * scale)}px ${Math.round(14 * scale)}px`,
            maxWidth: `${Math.round(920 * scale)}px`,
          }}
        >
          {chunk.words.map((w, i) => {
            const isActive = f >= w.fStart && f < w.fEnd;
            const isSpoken = f >= w.fStart;

            let color = isSpoken ? "#ffffff" : "rgba(235, 228, 250, 0.84)";
            let glow = "none";
            if (isActive) {
              if (w.tone === "purple") {
                color = "#ff72ff";
                glow = `0 0 ${Math.round(20 * scale)}px rgba(205, 42, 255, 0.92), 0 0 ${Math.round(36 * scale)}px rgba(140, 20, 255, 0.55)`;
              } else if (w.tone === "gold") {
                color = "#ffe04a";
                glow = `0 0 ${Math.round(18 * scale)}px rgba(255, 194, 28, 0.88), 0 0 ${Math.round(32 * scale)}px rgba(255, 118, 10, 0.50)`;
              } else {
                color = "#ffffff";
                glow = `0 0 ${Math.round(14 * scale)}px rgba(210, 140, 255, 0.65)`;
              }
            } else if (isSpoken) {
              if (w.tone === "purple") color = "#f3b8ff";
              else if (w.tone === "gold") color = "#ffea8a";
            }

            const s1 = Math.max(2, Math.round(5 * scale));
            const s2 = Math.max(2, Math.round(3 * scale));
            const dropY = Math.round(5 * scale);
            const textShadow = [
              `-${s1}px -${s1}px 0 #10061c`,
              `${s1}px -${s1}px 0 #10061c`,
              `-${s1}px ${s1}px 0 #10061c`,
              `${s1}px ${s1}px 0 #10061c`,
              `0 -${s1}px 0 #10061c`,
              `0 ${s1}px 0 #10061c`,
              `-${s1}px 0 0 #10061c`,
              `${s1}px 0 0 #10061c`,
              `-${s2}px ${s1}px 0 #10061c`,
              `${s2}px ${s1}px 0 #10061c`,
              `0 ${dropY}px ${Math.round(14 * scale)}px rgba(0, 0, 0, 0.94)`,
              ...(glow !== "none" ? [glow] : []),
            ].join(", ");

            return (
              <span
                key={i}
                style={{
                  fontFamily: "'VoidmetricBlack', 'Segoe UI Black', 'Arial Black', Impact, sans-serif",
                  fontWeight: 900,
                  fontSize: `${Math.round(60 * scale)}px`,
                  lineHeight: 1.08,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  color,
                  textShadow,
                  display: "inline-block",
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};
