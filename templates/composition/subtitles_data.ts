// Placeholder subtitle chunks — overwritten automatically by `whatif_cli.py sync-subtitles`!
export type SubWord = { text: string; fStart: number; fEnd: number; tone?: "normal" | "purple" | "gold" };
export type SubChunk = { fStart: number; fEnd: number; words: SubWord[] };

export const SUBTITLE_CHUNKS: SubChunk[] = [
  {
    fStart: 0,
    fEnd: 90,
    words: [
      { text: "VOIDMETRIC", fStart: 0, fEnd: 45, tone: "purple" },
      { text: "READY", fStart: 45, fEnd: 90, tone: "gold" },
    ],
  },
];
