import React from "react";
import { Composition } from "remotion";
import { EpisodeShort, EPISODE_FRAMES } from "./videos/{{EPISODE_SLUG}}/EpisodeShort";
import { LookCheck3D, LOOK_FRAMES } from "./videos/{{EPISODE_SLUG}}/LookCheck3D";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EpisodeLookCheck3D"
        component={LookCheck3D}
        durationInFrames={LOOK_FRAMES.length}
        fps={30}
        width={540}
        height={960}
      />
      <Composition
        id="EpisodeShort1080"
        component={EpisodeShort}
        durationInFrames={EPISODE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="EpisodeShort2K"
        component={EpisodeShort}
        durationInFrames={EPISODE_FRAMES}
        fps={30}
        width={1440}
        height={2560}
      />
    </>
  );
};
