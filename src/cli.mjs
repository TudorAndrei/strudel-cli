import { readFile } from 'node:fs/promises';

const usage = `Usage:
  strudel check <file> [--from <cycle>] [--to <cycle>] [--json]
  strudel query <file> [--from <cycle>] [--to <cycle>]
  strudel --help

Cycles are nonnegative numbers. The default range is 0 to 1.
Query writes JSON to standard output. JSON errors also go to standard output.`;

function parseArgs(args) {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') return { help: true };
  const [command, file, ...rest] = args;
  if (!['check', 'query'].includes(command) || !file || file.startsWith('-')) {
    throw new Error('Expected check or query followed by a file path.');
  }
  let from = 0;
  let to = 1;
  let json = command === 'query';
  const seen = new Set();
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (seen.has(flag)) throw new Error(`Repeated option: ${flag}`);
    seen.add(flag);
    if (flag === '--json') {
      json = true;
    } else if (flag === '--from' || flag === '--to') {
      const raw = rest[++i];
      if (raw === undefined || raw.trim() === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0) {
        throw new Error(`${flag} must be a nonnegative finite number.`);
      }
      if (flag === '--from') from = Number(raw);
      else to = Number(raw);
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
  }
  if (to <= from) throw new Error('--to must be greater than --from.');
  return { command, file, from, to, json };
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
      console.log(JSON.stringify({ valid: true, range: [options.from, options.to], events: events.map(eventToJson) }));
    } else {
      console.log(`OK: ${events.length} events in cycles ${options.from} to ${options.to}`);
    }
  } catch (error) {
    const message = error.message ?? String(error);
    if (options?.json || process.argv[2] === 'query' || process.argv.includes('--json')) {
      console.log(JSON.stringify({ valid: false, error: message }));
    } else {
      console.error(`strudel: ${message}`);
    }
    process.exitCode = 1;
  }
}

await main();
