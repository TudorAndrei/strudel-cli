import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ExitBadge, Headline, Kicker, Lead, Prompt, Rise, typed, useEnter, useGlobalFrame, Window } from '../components';
import { data, eventFrames } from '../data';
import { color } from '../theme';

const FIRST = 20;
// The error appears at frame 345, on the glitch event in soundtrack.strudel (cycle 23/4).
const SECOND = 95;

export const Check: React.FC = () => {
  const frame = useCurrentFrame();
  const first = typed(data.check.command, frame, FIRST);
  const second = typed(data.broken.command, frame, SECOND);
  const firstDone = frame > FIRST + data.check.command.length / 1.6 + 6;
  const secondDone = frame > SECOND + data.broken.command.length / 1.6 + 6;
  const okEnter = useEnter(FIRST + data.check.command.length / 1.6 + 8, 12);
  const failEnter = useEnter(SECOND + data.broken.command.length / 1.6 + 8, 12);
  // The window shakes while the soundtrack stutters.
  const globalFrame = useGlobalFrame('check');
  const [glitchStart, glitchEnd] = eventFrames('glitch');
  const glitching = globalFrame >= glitchStart && globalFrame < glitchEnd;
  const jitter = glitching ? (((globalFrame * 7919) % 23) - 11) * 2.4 : 0;
  return (
    <AbsoluteFill style={{ background: color.paper, flexDirection: 'row', alignItems: 'center', padding: '0 120px', gap: 100 }}>
      <div style={{ flex: '0 0 600px' }}>
        <Rise delay={4}>
          <Kicker>02 · Check it</Kicker>
        </Rise>
        <Rise delay={10}>
          <Headline>No browser. No audio device.</Headline>
        </Rise>
        <Rise delay={18}>
          <Lead>
            <code style={{ color: color.ink }}>check</code> evaluates the file and queries one cycle. Exit code 0 or 1.
          </Lead>
        </Rise>
      </div>
      <Rise delay={6} distance={80} style={{ flex: 1 }}>
        <Window
          title="zsh"
          style={{
            transform: `translateX(${jitter}px) skewX(${jitter / 8}deg)`,
            filter: glitching ? `drop-shadow(${jitter / 2}px 0 0 ${color.orange}) drop-shadow(${-jitter / 2}px 0 0 ${color.codeFn})` : undefined,
          }}
        >
          <div style={{ padding: '40px 44px', fontSize: 32, lineHeight: 1.7, minHeight: 440 }}>
            <Prompt text={first} cursor={!firstDone} />
            {firstDone && (
              <div style={{ color: color.green, opacity: okEnter }}>
                {data.check.stdout}
                <ExitBadge code={data.check.exitCode} enter={okEnter} />
              </div>
            )}
            {frame >= SECOND && (
              <div style={{ marginTop: 36 }}>
                <div style={{ color: color.nightMuted, fontSize: 26 }}># broken.strudel: {data.files.broken}</div>
                <Prompt text={second} cursor={!secondDone} />
              </div>
            )}
            {secondDone && (
              <div style={{ color: color.orange, opacity: failEnter }}>
                {data.broken.stderr}
                <ExitBadge code={data.broken.exitCode} enter={failEnter} />
              </div>
            )}
          </div>
        </Window>
      </Rise>
    </AbsoluteFill>
  );
};
