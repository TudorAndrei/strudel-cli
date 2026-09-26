import { readFileSync, writeFileSync } from 'node:fs';

const index = new URL('../dist/site/index.html', import.meta.url);
const html = readFileSync(index, 'utf8');
const rootLink = 'href="/llms.txt"';
if (!html.includes(rootLink)) throw new Error('AgentMarkup llms.txt discovery link was not found.');
writeFileSync(index, html.replace(rootLink, 'href="./llms.txt"'));
