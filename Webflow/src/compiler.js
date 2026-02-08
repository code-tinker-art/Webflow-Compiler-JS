import path from 'node:path';
import fs from 'node:fs';
import { Parser } from './parser.js';

export function convertToHTML(code, baseDir = process.cwd(), components = new Map()) {
    const p = new Parser(code);
    const tree = p.parse();

    // 1. Compile imports
    for (const imp of p.imports) {
        const fullPath = path.resolve(baseDir, imp.path);

        if (components.has(imp.name)) continue;

        if (!fs.existsSync(fullPath))
            throw new Error(`Import file not found: ${fullPath}`);

        const importedCode = fs.readFileSync(fullPath, 'utf8');
        const compiled = convertToHTML(importedCode, path.dirname(fullPath), components);

        components.set(imp.name, compiled);
    }

    // 2. Compile elements
    return tree.map(e => convertElementToHTML(e, components)).join('\n');
}

function convertElementToHTML(e, components) {
    // Replace with custom component if exists
    if (components.has(e.tagName)) return components.get(e.tagName);

    let html = `<${e.tagName}${attrs(e)}>`;
    if (e.content) html += e.content;
    if (e.children.length) html += e.children.map(c => convertElementToHTML(c, components)).join('');
    if (!e.closed || e.children.length > 0 || e.content) html += `</${e.tagName}>`;

    return html;
}

function attrs(e) {
    return styles(e.style) + data(e.datasets) + ids(e.ids) + classes(e.classes) + props(e.props);
}

function styles(a) { return a.length ? ` style="${a.map(x => `${x.key}:${x.value}`).join(';')}"` : ''; }
function data(a) { return a.map(x => ` data-${x.key}="${x.value}"`).join(''); }
function classes(a) { return a.length ? ` class="${a.join(' ')}"` : ''; }
function ids(a) { return a.length ? ` id="${a.join(' ')}"` : ''; }
function props(a) { return a.map(x => ` ${x.key}="${x.value}"`).join(''); }
