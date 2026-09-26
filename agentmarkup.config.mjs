import { readFileSync } from 'node:fs';

const site = 'https://tudorandrei.github.io/strudel-cli/';
const source = 'https://github.com/TudorAndrei/strudel-cli';
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default {
  site,
  name: 'strudel-cli',
  description: 'Check Strudel files and inspect pattern events without a browser or audio device.',
  outDir: 'dist/site',
  llmsTxt: {
    whenToUse: [
      'Install a local Strudel check and query command on macOS ARM64 or Linux x64.',
      'Find the JSON result fields and exit codes for an agent workflow.',
      'Inspect generated pattern events in a cycle range without audio.',
    ],
    instructions: 'This site documents a local executable. Run Strudel source files only when you trust them.',
    sections: [
      {
        title: 'Use the CLI',
        entries: [
          { title: 'Overview', url: site, description: 'Install and command examples.' },
          { title: 'Agent guide', url: `${site}agent-guide.md`, description: 'Agent workflow and JSON contract.' },
          { title: 'Command schema', url: `${site}command-schema.json`, description: 'Machine-readable command description.' },
        ],
      },
      {
        title: 'Source and releases',
        entries: [
          { title: 'GitHub repository', url: source, description: 'Source code, issues, and license.' },
          { title: 'Latest release', url: `${source}/releases/latest`, description: 'macOS ARM64 and Linux x64 archives.' },
        ],
      },
    ],
  },
  globalSchemas: [
    { preset: 'webSite', name: 'strudel-cli', url: site },
    {
      '@type': 'SoftwareApplication',
      name: 'strudel-cli',
      description: 'A headless CLI for checking Strudel files and querying pattern events.',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'macOS ARM64, Linux x64',
      softwareVersion: version,
      url: site,
      downloadUrl: `${source}/releases/latest`,
      codeRepository: source,
      license: `${source}/blob/main/LICENSE`,
    },
  ],
};
