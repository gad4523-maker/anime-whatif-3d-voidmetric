import React from "react";
import { Composition } from "remotion";
import { CastSheet3D } from "./videos/{{EPISODE_SLUG}}/CastSheet3D";
import { EpisodeShort, EpisodeThumb, EPISODE_FRAMES } from "./videos/{{EPISODE_SLUG}}/EpisodeShort";
import { LookCheck3D, LOOK_FRAMES } from "./videos/{{EPISODE_SLUG}}/LookCheck3D";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EpisodeCastSheet3D"
        component={CastSheet3D}
        durationInFrames={4}
        fps={30}
        width={1600}
        height={1000}
      />
      <Composition
        id="EpisodeLookCheck3D"
        component={LookCheck3D}
        durationInFrames={LOOK_FRAMES.length}
        fps={30}
        width={540}
        height={960}
      />
      <Composition
        id="EpisodeThumb"
        component={EpisodeThumb}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
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
