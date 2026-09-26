import { readFile } from 'node:fs/promises';

const usage = `Usage:
  strudel check <file> [--from <cycle>] [--to <cycle>] [--json] [--limit <count>]
  strudel query <file> [--from <cycle>] [--to <cycle>] [--limit <count>]
  strudel describe
  strudel --help

Cycles are nonnegative numbers. The default range is 0 to 1.
Query writes JSON to standard output. JSON errors also go to standard output.`;

const description = {
  name: 'strudel',
  schemaVersion: 1,
  commands: {
    check: {
      purpose: 'Evaluate a trusted Strudel file and query a cycle range.',
      required: { file: 'Path to a Strudel source file.' },
      options: { from: 'Nonnegative cycle number, default 0.', to: 'Cycle number greater than from, default 1.', json: 'Write JSON instead of text.', limit: 'Maximum events in JSON, default all. Requires --json.' },
      success: { valid: true, range: [0, 1], eventCount: 2, events: [{ begin: '0', end: '1/2', value: { s: 'bd' } }], truncated: true },
    },
    query: {
      purpose: 'Evaluate a trusted Strudel file and return JSON events.',
      required: { file: 'Path to a Strudel source file.' },
      options: { from: 'Nonnegative cycle number, default 0.', to: 'Cycle number greater than from, default 1.', limit: 'Maximum events in JSON, default all.' },
      success: { valid: true, range: [0, 1], eventCount: 2, events: [{ begin: '0', end: '1/2', value: { s: 'bd' } }], truncated: true },
    },
  },
  failure: { valid: false, error: 'Error message.' },
  exitCodes: { success: 0, failure: 1 },
  notes: ['Source files run as JavaScript. Use trusted files.', 'Check covers only the selected cycle range.', 'No audio output or sample check.'],
};

function parseArgs(args) {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') return { help: true };
  if (args[0] === 'describe') {
    if (args.length !== 1) throw new Error('describe does not take options.');
    return { describe: true };
  }
  const [command, file, ...rest] = args;
  if (!['check', 'query'].includes(command) || !file || file.startsWith('-')) {
    throw new Error('Expected check or query followed by a file path.');
  }
  if (/[\x00-\x1f\x7f]/.test(file)) throw new Error('File path contains a control character.');
  let from = 0;
  let to = 1;
  let json = command === 'query';
  let limit;
  const seen = new Set();
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (seen.has(flag)) throw new Error(`Repeated option: ${flag}`);
    seen.add(flag);
    if (flag === '--json') {
      json = true;
    } else if (flag === '--from' || flag === '--to') {
      const raw = rest[++i];
      if (raw === undefined || !/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) || !Number.isFinite(Number(raw))) {
        throw new Error(`${flag} must be a nonnegative finite number.`);
      }
      if (flag === '--from') from = Number(raw);
      else to = Number(raw);
    } else if (flag === '--limit') {
      const raw = rest[++i];
      if (raw === undefined || !/^(?:0|[1-9]\d*)$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
        throw new Error('--limit must be a nonnegative integer.');
      }
      limit = Number(raw);
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
  }
  if (to <= from) throw new Error('--to must be greater than --from.');
  if (limit !== undefined && !json) throw new Error('--limit requires --json for check.');
  return { command, file, from, to, json, limit };
}

function eventToJson(hap) {
  const span = hap.whole ?? hap.part;
  return {
    begin: span.begin.toFraction(),
    end: span.end.toFraction(),
    value: hap.value,
  };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage);
      return;
    }
    if (options.describe) {
      console.log(JSON.stringify(description));
      return;
    }
    const source = await readFile(options.file, 'utf8');
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = () => {};
    console.warn = () => {};
    let events;
    try {
      const [core, mini, tonal, { transpiler }] = await Promise.all([
        import('@strudel/core'),
        import('@strudel/mini'),
        import('@strudel/tonal'),
        import('@strudel/transpiler'),
      ]);
      console.log = (...args) => console.error(...args);
      console.warn = originalWarn;
      await core.evalScope(core, mini, tonal);
      const { pattern } = await core.evaluate(source, transpiler);
      if (!pattern || typeof pattern.queryArc !== 'function') {
        throw new Error('The file must return a Strudel pattern.');
      }
      events = pattern.queryArc(options.from, options.to);
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }
    events.sort((a, b) => Number((a.whole ?? a.part).begin) - Number((b.whole ?? b.part).begin));
    if (options.json) {
      const selected = options.limit === undefined ? events : events.slice(0, options.limit);
      console.log(JSON.stringify({ valid: true, range: [options.from, options.to], eventCount: events.length, events: selected.map(eventToJson), truncated: selected.length < events.length }));
    } else {
      console.log(`OK: ${events.length} events in cycles ${options.from} to ${options.to}`);
    }
  } catch (error) {
    const message = error.message ?? String(error);
    if (options?.json || ['query', 'describe'].includes(process.argv[2]) || process.argv.includes('--json')) {
      console.log(JSON.stringify({ valid: false, error: message }));
    } else {
      console.error(`strudel: ${message}`);
    }
    process.exitCode = 1;
  }
}

await main();
