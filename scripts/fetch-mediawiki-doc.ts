#!/usr/bin/env bun
// Fetch a MediaWiki page and print cleaned content to stdout
//
// Modes:
//   bun scripts/fetch-mediawiki-doc.ts <wiki-url> [search-term]
//     Fetches via markdown.new, optionally extracts section around search-term
//
//   bun scripts/fetch-mediawiki-doc.ts --raw <wiki-base-url> <Module:Name> [search-term]
//     Fetches raw wikitext via MediaWiki API (good for Lua module source)
//     Example: bun scripts/fetch-mediawiki-doc.ts --raw https://commons.wikimedia.org "Module:Countries" "function"

export {};

const UA = 'Mozilla/5.0 (compatible; fetch-mediawiki-doc/1.0; User:DaxServer)';

function extractSection(text: string, searchTerm: string): string {
	const lines = text.split('\n');
	const startIdx = lines.findIndex((l) => l.toLowerCase().includes(searchTerm.toLowerCase()));
	if (startIdx === -1) {
		console.error(`Term "${searchTerm}" not found`);
		process.exit(1);
	}
	const headingMatch = lines[startIdx].match(/^(#{1,4})\s/);
	const level = headingMatch ? headingMatch[1].length : 0;
	const endIdx = lines.findIndex((l, i) => {
		if (i <= startIdx) return false;
		if (level === 0) return i > startIdx + 60;
		const m = l.match(/^(#{1,4})\s/);
		return m && m[1].length <= level;
	});
	return lines.slice(startIdx, endIdx === -1 ? startIdx + 80 : endIdx).join('\n');
}

async function fetchMarkdown(url: string, searchTerm?: string) {
	const res = await fetch(`https://markdown.new/${url}`, {
		headers: { 'User-Agent': UA, Accept: 'text/markdown, text/plain, */*' },
	});
	if (!res.ok) { console.error(`HTTP ${res.status}: ${res.statusText}`); process.exit(1); }
	const text = await res.text();
	if (!searchTerm) { process.stdout.write(text); return; }
	console.log(extractSection(text, searchTerm));
}

async function fetchRaw(baseUrl: string, title: string, searchTerm?: string) {
	const apiUrl = new URL('/w/api.php', baseUrl);
	apiUrl.searchParams.set('action', 'query');
	apiUrl.searchParams.set('titles', title);
	apiUrl.searchParams.set('prop', 'revisions');
	apiUrl.searchParams.set('rvprop', 'content');
	apiUrl.searchParams.set('rvslots', 'main');
	apiUrl.searchParams.set('format', 'json');
	apiUrl.searchParams.set('formatversion', '2');

	const res = await fetch(apiUrl.toString(), { headers: { 'User-Agent': UA } });
	if (!res.ok) { console.error(`HTTP ${res.status}: ${res.statusText}`); process.exit(1); }

	const data = await res.json();
	const page = data.query.pages[0];
	if (page.missing) { console.error(`Page "${title}" not found`); process.exit(1); }

	const content: string = page.revisions[0].slots.main.content;
	if (!searchTerm) { process.stdout.write(content); return; }
	console.log(extractSection(content, searchTerm));
}

const args = process.argv.slice(2);

if (args[0] === '--raw') {
	const [, baseUrl, title, searchTerm] = args;
	if (!baseUrl || !title) {
		console.error('Usage: fetch-mediawiki-doc.ts --raw <base-url> <Page:Title> [search-term]');
		process.exit(1);
	}
	await fetchRaw(baseUrl, title, searchTerm);
} else {
	const [url, searchTerm] = args;
	if (!url) {
		console.error('Usage: fetch-mediawiki-doc.ts <wiki-url> [search-term]');
		process.exit(1);
	}
	await fetchMarkdown(url, searchTerm);
}
