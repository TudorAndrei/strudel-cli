import { AbsoluteFill } from 'remotion';
import { BrandMark, Rise, useEnter, useGlobalFrame, Wordmark } from '../components';
import { data } from '../data';
import { color, font } from '../theme';

export const Intro: React.FC = () => {
  const globalFrame = useGlobalFrame('intro');
  // One bar grows on each kick drum hit (every 15 frames).
  const grow = [useEnter(0, 12), useEnter(15, 12), useEnter(30, 12), useEnter(45, 12)];
  return (
    <AbsoluteFill style={{ background: color.night, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
        <BrandMark size={190} globalFrame={globalFrame} grow={grow} />
        <Rise delay={38}>
          <Wordmark size={170} dark />
        </Rise>
      </div>
      <Rise delay={56} style={{ marginTop: 64 }}>
        <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 44, color: color.nightMuted }}>
          Strudel, without the browser. <span style={{ fontFamily: font.mono, fontSize: 34, color: color.codeFn }}>v{data.version}</span>
        </div>
      </Rise>
    </AbsoluteFill>
  );
};
