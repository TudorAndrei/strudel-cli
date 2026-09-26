import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { BrandMark, clamp, Rise, useGlobalFrame, Wordmark } from '../components';
import { data } from '../data';
import { color, font, SCENES } from '../theme';

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const globalFrame = useGlobalFrame('outro');
  const fadeOut = interpolate(frame, [SCENES.outro - 18, SCENES.outro], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: color.night, justifyContent: 'center', alignItems: 'center', opacity: fadeOut }}>
      <Rise delay={4}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <BrandMark size={110} globalFrame={globalFrame} />
          <Wordmark size={104} dark />
        </div>
      </Rise>
      <Rise delay={14} style={{ marginTop: 72 }}>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 40,
            color: color.nightText,
            background: '#0f1f30',
            border: `1px solid ${color.nightLine}`,
            borderLeft: `5px solid ${color.orange}`,
            borderRadius: 10,
            padding: '26px 40px',
          }}
        >
          <span style={{ color: '#76adf3' }}>$ </span>mise use -g github:TudorAndrei/strudel-cli@{data.version}
        </div>
      </Rise>
      <Rise delay={24} style={{ marginTop: 40 }}>
        <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 32, color: color.nightMuted, textAlign: 'center', lineHeight: 1.6 }}>
          Standalone binaries for macOS ARM64 and Linux x64.
          <br />
          <span style={{ color: color.codeFn, fontWeight: 700 }}>tudorandrei.github.io/strudel-cli</span>
        </div>
      </Rise>
    </AbsoluteFill>
  );
};
