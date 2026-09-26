import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, Headline, Kicker, Prompt, Rise, typed, useEnter, useGlobalFrame, Window } from '../components';
import { data, eventJson, fraction, frameToCycle, midi, type StrudelEvent } from '../data';
import { color, font } from '../theme';

const { result, command } = data.query;
const [FROM, TO] = result.range;
const SPAN = TO - FROM;

const TYPE_START = 14;
const PRINT_START = 50;
const PER_EVENT = 2.2;
const LINE_HEIGHT = 29;
const VISIBLE_LINES = 19;

const printFrame = (index: number) => PRINT_START + 4 + index * PER_EVENT;

const lines = [
  `{"valid":${result.valid},"range":${JSON.stringify(result.range)},"eventCount":${result.eventCount},"events":[`,
  ...result.events.map((event, i) => `  ${eventJson(event)}${i < result.events.length - 1 ? ',' : ''}`),
  `],"truncated":${result.truncated}}`,
];

const JsonLine: React.FC<{ text: string }> = ({ text }) => {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(/("[^"]*")(:?)/g)) {
    const index = match.index ?? 0;
    parts.push(text.slice(last, index));
    parts.push(
      <span key={index} style={{ color: match[2] ? color.nightMuted : color.codeString }}>
        {match[1]}
      </span>,
    );
    parts.push(match[2]);
    last = index + match[0].length;
  }
  parts.push(text.slice(last));
  return <div style={{ height: LINE_HEIGHT, whiteSpace: 'pre' }}>{parts}</div>;
};

// Piano roll geometry.
const ROLL_WIDTH = 800;
const DRUMS = ['hh', 'sd', 'bd'];
const DRUM_ROW = 46;
const PITCH_TOP = DRUMS.length * DRUM_ROW + 30;
const PITCH_HEIGHT = 420;
// One row for each different note, highest note at the top.
const noteRows = [...new Set(result.events.filter((e) => e.value.note !== undefined).map((e) => String(e.value.note)))].sort(
  (a, b) => midi(b) - midi(a),
);
const NOTE_ROW = PITCH_HEIGHT / noteRows.length;

const place = (event: StrudelEvent) => {
  const x = ((fraction(event.begin) - FROM) / SPAN) * ROLL_WIDTH;
  const w = ((fraction(event.end) - fraction(event.begin)) / SPAN) * ROLL_WIDTH;
  const { s, note } = event.value;
  if (note !== undefined) {
    const y = PITCH_TOP + noteRows.indexOf(String(note)) * NOTE_ROW + 5;
    return { x, w, y, h: NOTE_ROW - 10, fill: s === 'sawtooth' ? '#2a75c9' : color.orange, label: String(note) };
  }
  const row = DRUMS.indexOf(String(s));
  return { x, w, y: row * DRUM_ROW + 6, h: DRUM_ROW - 12, fill: s === 'bd' ? '#2a75c9' : s === 'sd' ? '#a94b2c' : '#3c5f82', label: String(s) };
};

const Roll: React.FC<{ globalFrame: number }> = ({ globalFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The drop plays the song.strudel patterns in absolute time, so the playhead shows where the audio is.
  const cycle = frameToCycle(globalFrame) % SPAN;
  const head = (cycle / SPAN) * ROLL_WIDTH;
  const ticks = Array.from({ length: SPAN * 4 + 1 }, (_, i) => i / 4);
  return (
    <div style={{ position: 'relative', width: ROLL_WIDTH, height: PITCH_TOP + PITCH_HEIGHT + 60 }}>
      {ticks.map((t) => (
        <div
          key={t}
          style={{
            position: 'absolute',
            left: (t / SPAN) * ROLL_WIDTH,
            top: 0,
            bottom: 40,
            width: 1,
            background: Number.isInteger(t) ? color.nightLine : 'rgba(51, 75, 99, 0.45)',
          }}
        />
      ))}
      {DRUMS.map((name, row) => (
        <div key={name} style={{ position: 'absolute', left: -64, top: row * DRUM_ROW + 12, fontSize: 20, color: color.nightMuted }}>
          {name}
        </div>
      ))}
      {noteRows.map((name, row) => (
        <div key={name} style={{ position: 'absolute', left: -64, top: PITCH_TOP + row * NOTE_ROW + NOTE_ROW / 2 - 12, fontSize: 20, color: color.nightMuted }}>
          {name}
        </div>
      ))}
      {result.events.map((event, i) => {
        const box = place(event);
        const pop = spring({ frame: frame - printFrame(i), fps, config: { damping: 14, stiffness: 180 } });
        const begin = ((fraction(event.begin) - FROM) / SPAN) * ROLL_WIDTH;
        const active = head >= begin && head < begin + box.w;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: box.x + 2,
              top: box.y,
              width: Math.max(box.w - 4, 6),
              height: box.h,
              borderRadius: 5,
              background: active ? '#ffffff' : box.fill,
              color: active ? color.night : '#ffffff',
              fontSize: 17,
              fontWeight: 700,
              padding: '0 8px',
              lineHeight: `${box.h}px`,
              overflow: 'hidden',
              opacity: pop,
              transform: `scale(${interpolate(pop, [0, 1], [0.4, 1])})`,
              boxShadow: active ? `0 0 24px ${box.fill}` : 'none',
            }}
          >
            {box.w > 40 ? box.label : ''}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: head - 1.5, top: -10, bottom: 40, width: 3, background: color.orange, boxShadow: `0 0 18px ${color.orange}` }} />
      {[0, 0.5, 1, 1.5, 2].filter((t) => t <= SPAN).map((t) => (
        <div
          key={t}
          style={{ position: 'absolute', left: (t / SPAN) * ROLL_WIDTH, bottom: 0, transform: 'translateX(-50%)', fontSize: 20, color: color.nightMuted }}
        >
          {Number.isInteger(t) ? t : `${t * 2}/2`}
        </div>
      ))}
    </div>
  );
};

export const Query: React.FC = () => {
  const frame = useCurrentFrame();
  const globalFrame = useGlobalFrame('query');
  const shown = Math.min(lines.length, Math.max(0, Math.floor((frame - PRINT_START) / PER_EVENT) + 1));
  const scroll = Math.max(0, shown - VISIBLE_LINES) * LINE_HEIGHT;
  const typedCommand = typed(command, frame, TYPE_START);
  const doneAt = printFrame(result.events.length) + 6;
  const stats = useEnter(doneAt, 14);
  return (
    <AbsoluteFill style={{ background: color.night, padding: '64px 100px', fontFamily: font.mono }}>
      <Rise delay={2}>
        <Kicker dark>03 · Query it</Kicker>
      </Rise>
      <Rise delay={6}>
        <Headline dark size={80}>
          Every event, as JSON.
        </Headline>
      </Rise>
      <div style={{ display: 'flex', gap: 110, marginTop: 44, alignItems: 'flex-start' }}>
        <Window title="zsh" style={{ width: 800, background: '#0f1f30' }}>
          <div style={{ padding: '26px 32px 0', fontSize: 24 }}>
            <Prompt text={typedCommand} cursor={frame < PRINT_START} />
          </div>
          <div style={{ padding: '14px 24px 20px', fontSize: 16, color: '#c7d9ea' }}>
            <div style={{ height: VISIBLE_LINES * LINE_HEIGHT, overflow: 'hidden' }}>
              <div style={{ transform: `translateY(${-scroll}px)` }}>
                {lines.slice(0, shown).map((line, i) => (
                  <JsonLine key={i} text={line} />
                ))}
              </div>
            </div>
          </div>
        </Window>
        <div style={{ paddingLeft: 64, color: color.nightText }}>
          <div style={{ fontSize: 22, color: color.nightMuted, marginBottom: 26 }}>
            cycles {FROM} → {TO}
          </div>
          <Roll globalFrame={globalFrame} />
          <div
            style={{
              marginTop: 20,
              fontSize: 23,
              opacity: stats,
              transform: `translateY(${interpolate(stats, [0, 1], [20, 0], clamp)}px)`,
            }}
          >
            <span style={{ color: color.codeFn }}>eventCount</span> {result.eventCount}
            <span style={{ color: color.nightMuted }}> · </span>
            <span style={{ color: color.codeFn }}>--limit</span> cuts the list, not the count
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
