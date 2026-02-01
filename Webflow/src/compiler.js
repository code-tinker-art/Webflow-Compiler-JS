/*
    @author Magizhnun
    @version 1.0.0
*/
import {
    LogError
} from './errors.js';

const logger = new LogError();

const tokenType = {};
const tthelper = [
    "Tag", "Colon", "Semicolon", "Props", "Dataset", "Classes", "Ids", "Content", "Style", "Block", "EOF"
];
for (let i = 0; i < tthelper.length; i++) tokenType[tthelper[i]] = i;

class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

function token(type, value) {
    return new Token(type, value);
}

function tokenize(source) {
    if (!source || source.length === 0) logger.emptySourceError("Empty source given to compile.");
    const src = source.split('');
    const tokens = [];
    function currentIndex() { return source.length - src.length; }
    while (src.length > 0) {
        const c = src[0];
        if (c === ':') tokens.push(token(tokenType.Colon, src.shift()));
        else if (c === ';') tokens.push(token(tokenType.Semicolon, src.shift()));
        else if (c === '{') {
            src.shift();
            let value = '';
            while (src.length > 0) {
                if (src[0] === '\\' && src[1] === '{') { value += '{'; src.shift(); src.shift(); }
                else if (src[0] === '\\' && src[1] === '}') { value += '}'; src.shift(); src.shift(); }
                else if (src[0] === '\\' && src[1] === '\\') { value += '\\'; src.shift(); src.shift(); }
                else if (src[0] === '}') break;
                else value += src.shift();
            }
            if (src[0] !== '}') logger.unclosedError(`Unclosed block at position ${currentIndex()}`);
            src.shift();
            tokens.push(token(tokenType.Block, value));
        } else if (src[0] === '-' && src[1] === '-') {
            while (src.length > 0 && src[0] !== '\n') {
                src.shift();
            }
        } else if ((c.toUpperCase() !== c.toLowerCase()) || '0123456789'.includes(c)) {
            let str = '';
            while (src.length > 0 && ((src[0].toUpperCase() !== src[0].toLowerCase()) || '0123456789'.includes(src[0]))) str += src.shift();
            const map = { props: tokenType.Props, content: tokenType.Content, classes: tokenType.Classes, ids: tokenType.Ids, dataset: tokenType.Dataset, styles: tokenType.Style };
            tokens.push(token(map[str] ?? tokenType.Tag, str));
        } else if (' \n\r\t'.includes(c)) src.shift();
        else logger.unexpectedError(`Unexpected char '${c}' at position ${currentIndex()}`);
    }
    tokens.push(token(tokenType.EOF, "EOF"));
    return tokens;
}

class Element {
    constructor() {
        this.tagName = null;
        this.props = [];
        this.datasets = [];
        this.ids = [];
        this.classes = [];
        this.content = null;
        this.style = [];
        this.closed = false;
        this.children = [];
    }
}

class Parser {
    #src;
    #tokens;
    constructor(code) {
        this.#src = tokenize(code);
        this.tree = [];
        this.#tokens = this.#src.slice();
    }
    current() { return this.#src[0]; }
    eat(type) {
        const t = this.#src.shift();
        if (type !== undefined && t.type !== type)
            logger.unexpectedError(`Unexpected token '${t.value}' of type ${t.type} at token position ${this.#tokens.length - this.#src.length - 1}`);
        return t;
    }
    parse() {
        while (this.current().type !== tokenType.EOF) this.tree.push(this.parseElement());
        return this.tree;
    }
    parseElement() {
        const elem = new Element();
        const tag = this.eat(tokenType.Tag);
        elem.tagName = tag.value;
        this.eat(tokenType.Colon);
        while (true) {
            const t = this.current();
            if (t.type === tokenType.Semicolon) { this.eat(); elem.closed = true; break; }
            if (t.type === tokenType.Tag) { elem.children.push(this.parseElement()); continue; }
            if ([tokenType.Props, tokenType.Dataset, tokenType.Classes, tokenType.Ids, tokenType.Content, tokenType.Style].includes(t.type)) this.parseSet(elem);
            else logger.unexpectedError(`Unexpected token '${t.value}' at token position ${this.#tokens.length - this.#src.length - 1}`);
        }
        return elem;
    }
    parseSet(elem) {
        const t = this.current();
        switch (t.type) {
            case tokenType.Props: this.eat(); elem.props = this.parseKeyValue(this.eat(tokenType.Block).value); break;
            case tokenType.Dataset: this.eat(); elem.datasets = this.parseKeyValue(this.eat(tokenType.Block).value); break;
            case tokenType.Classes: this.eat(); elem.classes = this.parseList(this.eat(tokenType.Block).value); break;
            case tokenType.Ids: this.eat(); elem.ids = this.parseList(this.eat(tokenType.Block).value); break;
            case tokenType.Content: this.eat(); elem.content = this.parseContent(this.eat(tokenType.Block).value); break;
            case tokenType.Style: this.eat(); elem.style = this.parseKeyValue(this.eat(tokenType.Block).value); break;
            default: logger.invalidError("Invalid set or missing semicolon");
        }
    }
    parseKeyValue(v) {
        const arr = [];
        let curr = '';
        let quotes = false;
        for (let i = 0; i <= v.length; ++i) {
            const c = v[i];
            if (c === undefined || (c === ',' && !quotes)) {
                if (curr.trim().length) {
                    const [k, ...vals] = curr.split(':');
                    arr.push({ key: k.trim(), value: vals.join(':').trim() });
                }
                curr = '';
            }
            else if (c === '"') {
                quotes = !quotes;
                curr += c;
            }
            else curr += c;
        }
        return arr;
    }
    parseContent(v) {
        let result = '';
        let i = 0;
        while (i < v.length) {
            if (v[i] === '\\' && v[i + 1] === ',') {
                result += ',';
                i += 2;
            } else {
                result += v[i];
                ++i;
            }
        }
        return result;
    }
    parseList(v) {
        const arr = [];
        let curr = '';
        let quotes = false;
        for (let i = 0; i <= v.length; ++i) {
            const c = v[i];
            if (c === undefined || (c === ',' && !quotes)) {
                if (curr.trim().length) arr.push(this.unquote(curr.trim()));
                curr = '';
            }
            else if (c === '"') { quotes = !quotes; curr += c; }
            else curr += c;
        }
        return arr;
    }
    unquote(str) {
        if (str[0] === '"' && str[str.length - 1] === '"') return str.slice(1, -1);
        return str;
    }
}

export function convertToHTML(src) {
    const p = new Parser(src);
    return p.parse().map(convertElementToHTML).join('\n');
}
function convertElementToHTML(e) {
    let html = `<${e.tagName}${attrs(e)}>`;
    if (e.content) html += e.content;
    if (e.children.length) html += e.children.map(convertElementToHTML).join('');
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


