import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Headline, Kicker, Lead, Prompt, Rise, typed, useEnter, Window } from '../components';
import { data } from '../data';
import { color } from '../theme';

const schema = data.describe.result as {
  name: string;
  schemaVersion: number;
  commands: Record<string, unknown>;
  failure: unknown;
  exitCodes: unknown;
};

// The describe output with each command body folded.
const describeLines = [
  '{',
  `  "name": ${JSON.stringify(schema.name)},`,
  `  "schemaVersion": ${schema.schemaVersion},`,
  `  "commands": { ${Object.keys(schema.commands).map((name) => `"${name}": {…}`).join(', ')} },`,
  `  "failure": ${JSON.stringify(schema.failure)},`,
  `  "exitCodes": ${JSON.stringify(schema.exitCodes)},`,
  '  "notes": […]',
  '}',
];

const FIRST = 16;
const LINES_AT = 40;
const SECOND = 86;

export const Agents: React.FC = () => {
  const frame = useCurrentFrame();
  const secondDone = frame > SECOND + data.count.command.length / 1.6 + 4;
  const countEnter = useEnter(SECOND + data.count.command.length / 1.6 + 6, 14);
  return (
    <AbsoluteFill style={{ background: color.paper, flexDirection: 'row', alignItems: 'center', padding: '0 120px', gap: 90 }}>
      <div style={{ flex: '0 0 600px' }}>
        <Rise delay={4}>
          <Kicker>04 · Built for agents</Kicker>
        </Rise>
        <Rise delay={10}>
          <Headline>One JSON object on stdout.</Headline>
        </Rise>
        <Rise delay={18}>
          <Lead>
            <code style={{ color: color.ink }}>describe</code> gives the command schema. A failed command exits with code 1.
          </Lead>
        </Rise>
      </div>
      <Rise delay={6} distance={80} style={{ flex: 1 }}>
        <Window title="zsh">
          <div style={{ padding: '36px 40px', fontSize: 25, lineHeight: 1.65, minHeight: 560, whiteSpace: 'pre' }}>
            <Prompt text={typed(data.describe.command, frame, FIRST)} cursor={frame < LINES_AT} />
            {describeLines.map((line, i) => (
              <div key={i} style={{ color: '#c7d9ea', opacity: frame >= LINES_AT + i * 3 ? 1 : 0 }}>
                {line}
              </div>
            ))}
            {frame >= SECOND && (
              <div style={{ marginTop: 24 }}>
                <Prompt text={typed(data.count.command, frame, SECOND)} cursor={!secondDone} />
              </div>
            )}
            {secondDone && <div style={{ color: color.green, opacity: countEnter, fontSize: 22 }}>{data.count.stdout}</div>}
          </div>
        </Window>
      </Rise>
    </AbsoluteFill>
  );
};
