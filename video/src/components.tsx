import type { CSSProperties, ReactNode } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { kickPulse } from './data';
import { color, font, sceneStart, SCENES } from './theme';

export const useGlobalFrame = (scene: keyof typeof SCENES): number => useCurrentFrame() + sceneStart(scene);

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const useEnter = (delay: number, damping = 18): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

export const Rise: React.FC<{ delay: number; children: ReactNode; distance?: number; style?: CSSProperties }> = ({
  delay,
  children,
  distance = 40,
  style,
}) => {
  const t = useEnter(delay);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * distance}px)`, ...style }}>{children}</div>;
};

export const typed = (text: string, frame: number, start: number, perFrame = 1.6): string =>
  text.slice(0, Math.max(0, Math.floor((frame - start) * perFrame)));

export const Cursor: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  const frame = useCurrentFrame();
  const on = visible && Math.floor(frame / 12) % 2 === 0;
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.58em',
        height: '1.1em',
        marginLeft: 2,
        verticalAlign: 'text-bottom',
        background: on ? color.orange : 'transparent',
      }}
    />
  );
};

const BAR_HEIGHTS = [0.69, 1, 0.42, 0.77];

export const BrandMark: React.FC<{ size: number; globalFrame: number; grow?: number[] }> = ({
  size,
  globalFrame,
  grow = [1, 1, 1, 1],
}) => {
  const pulse = kickPulse(globalFrame);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: size * 0.115, height: size }}>
      {BAR_HEIGHTS.map((h, i) => (
        <i
          key={i}
          style={{
            display: 'block',
            width: size * 0.19,
            borderRadius: size * 0.077,
            background: i === 1 ? color.orange : color.blue,
            height: size * h * grow[i] * (1 + (i % 2 ? 0.1 : 0.16) * pulse),
          }}
        />
      ))}
    </div>
  );
};

export const Wordmark: React.FC<{ size: number; dark?: boolean }> = ({ size, dark = false }) => (
  <span style={{ fontFamily: font.mono, fontWeight: 700, fontSize: size, letterSpacing: '-0.05em', color: dark ? color.nightText : color.ink }}>
    strudel<span style={{ color: dark ? color.codeFn : color.blue }}>/cli</span>
  </span>
);

export const Kicker: React.FC<{ children: ReactNode; dark?: boolean }> = ({ children, dark = false }) => (
  <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 30, letterSpacing: '0.02em', color: dark ? color.codeFn : color.blue, marginBottom: 28 }}>
    {children}
  </div>
);

export const Headline: React.FC<{ children: ReactNode; dark?: boolean; size?: number }> = ({ children, dark = false, size = 96 }) => (
  <div
    style={{
      fontFamily: font.sans,
      fontWeight: 800,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: '-0.055em',
      color: dark ? color.nightText : color.ink,
    }}
  >
    {children}
  </div>
);

export const Lead: React.FC<{ children: ReactNode; dark?: boolean }> = ({ children, dark = false }) => (
  <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 36, lineHeight: 1.45, color: dark ? color.nightMuted : color.muted, marginTop: 36, maxWidth: 680 }}>
    {children}
  </div>
);

export const Window: React.FC<{ title: string; children: ReactNode; style?: CSSProperties }> = ({ title, children, style }) => (
  <div
    style={{
      background: color.night,
      border: `1px solid #243e58`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 30px 70px rgba(20, 43, 66, 0.28)',
      color: color.nightText,
      fontFamily: font.mono,
      ...style,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '22px 32px',
        borderBottom: `1px solid ${color.nightLine}`,
        color: '#b5cce2',
        fontSize: 24,
      }}
    >
      <span>{title}</span>
      <span style={{ width: 14, height: 14, borderRadius: '50%', background: color.orange }} />
    </div>
    {children}
  </div>
);

export const Prompt: React.FC<{ text: string; cursor?: boolean }> = ({ text, cursor = false }) => (
  <div style={{ whiteSpace: 'pre' }}>
    <span style={{ color: '#76adf3' }}>$ </span>
    {text}
    {cursor && <Cursor />}
  </div>
);

export const ExitBadge: React.FC<{ code: number; enter: number }> = ({ code, enter }) => (
  <span
    style={{
      display: 'inline-block',
      marginLeft: 24,
      padding: '4px 14px',
      borderRadius: 6,
      fontSize: 22,
      fontWeight: 700,
      color: color.night,
      background: code === 0 ? color.green : color.orange,
      opacity: enter,
      transform: `scale(${interpolate(enter, [0, 1], [0.6, 1])})`,
    }}
  >
    exit {code}
  </span>
);

// Small JavaScript highlighter for the pattern file: function names and strings.
export const Highlight: React.FC<{ source: string }> = ({ source }) => {
  const parts: ReactNode[] = [];
  const token = /("[^"]*"?)|([A-Za-z_]\w*)(?=\()/g;
  let last = 0;
  for (const match of source.matchAll(token)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(source.slice(last, index));
    parts.push(
      <span key={index} style={{ color: match[1] ? color.codeString : color.codeFn }}>
        {match[0]}
      </span>,
    );
    last = index + match[0].length;
  }
  parts.push(source.slice(last));
  return <>{parts}</>;
};
