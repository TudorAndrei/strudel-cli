import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Cursor, Headline, Highlight, Kicker, Lead, Rise, typed, Window } from '../components';
import { data } from '../data';
import { color } from '../theme';

const TYPE_START = 22;

export const Code: React.FC = () => {
  const frame = useCurrentFrame();
  const source = typed(data.files.song, frame, TYPE_START, 1.5);
  const done = source.length === data.files.song.length;
  return (
    <AbsoluteFill style={{ background: color.paper, flexDirection: 'row', alignItems: 'center', padding: '0 100px', gap: 80 }}>
      <div style={{ flex: '0 0 540px' }}>
        <Rise delay={4}>
          <Kicker>01 · Write a pattern</Kicker>
        </Rise>
        <Rise delay={10}>
          <Headline size={84}>Inspect a pattern before playback.</Headline>
        </Rise>
        <Rise delay={18}>
          <Lead>Any Strudel file. Mini notation, tonal functions, and the transpiler are included.</Lead>
        </Rise>
      </div>
      <Rise delay={8} distance={80} style={{ flex: 1 }}>
        <Window title="song.strudel">
          <pre style={{ margin: 0, padding: '44px 44px 56px', fontSize: 29, lineHeight: 1.7, minHeight: 380, whiteSpace: 'pre' }}>
            <Highlight source={source} />
            <Cursor visible={!done || frame % 24 < 12} />
          </pre>
        </Window>
      </Rise>
    </AbsoluteFill>
  );
};
