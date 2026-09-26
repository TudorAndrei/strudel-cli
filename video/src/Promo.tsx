import { Audio } from '@remotion/media';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { AbsoluteFill, Easing, interpolate, staticFile } from 'remotion';
import { Agents } from './scenes/Agents';
import { Check } from './scenes/Check';
import { Code } from './scenes/Code';
import { Intro } from './scenes/Intro';
import { Outro } from './scenes/Outro';
import { Query } from './scenes/Query';
import { DURATION, FPS, SCENES, TRANSITION } from './theme';

const timing = linearTiming({ durationInFrames: TRANSITION, easing: Easing.inOut(Easing.cubic) });

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENES.intro}>
        <Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: 'from-left' })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={SCENES.code}>
        <Code />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={SCENES.check}>
        <Check />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: 'from-bottom' })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={SCENES.query}>
        <Query />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={SCENES.agents}>
        <Agents />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={SCENES.outro}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Audio
      src={staticFile('soundtrack.wav')}
      volume={(f) =>
        interpolate(f, [0, 6, DURATION - FPS, DURATION], [0, 0.9, 0.9, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    />
  </AbsoluteFill>
);
