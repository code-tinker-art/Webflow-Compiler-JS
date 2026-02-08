import { tokenType } from './types.js';
import { tokenize } from './lexer.js';
import { LogError } from './errors.js';

const logger = new LogError();

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

export class Parser {
    #src;
    #tokens;

    imports = []; // store { name, path }

    constructor(code) {
        this.#src = tokenize(code);
        this.tree = [];
        this.#tokens = this.#src.slice();
    }

    current() {
        return this.#src[0];
    }

    eat(type) {
        const t = this.#src.shift();
        if (type !== undefined && t.type !== type)
            logger.unexpectedError(
                `Unexpected token '${t.value}' of type ${t.type} at token position ${this.#tokens.length - this.#src.length - 1}`
            );
        return t;
    }

    parse() {
        while (this.current().type !== tokenType.EOF) {
            if (this.current().type === tokenType.Import) {
                if (this.tree.length > 0)
                    logger.invalidError("Imports must appear before elements");
                this.parseImport();
            } else {
                this.tree.push(this.parseElement());
            }
        }
        return this.tree;
    }

    parseImport() {
        this.eat(tokenType.Import);
        const name = this.eat(tokenType.Tag).value;
        this.eat(tokenType.From);
        const pathToken = this.eat(tokenType.String);
        this.eat(tokenType.Semicolon);

        this.imports.push({ name, path: pathToken.value });
    }

    parseElement() {
        const elem = new Element();
        const tag = this.eat(tokenType.Tag);
        elem.tagName = tag.value;
        this.eat(tokenType.Colon);

        while (true) {
            const t = this.current();
            if (t.type === tokenType.Semicolon) {
                this.eat();
                elem.closed = true;
                break;
            }
            if (t.type === tokenType.Tag) {
                elem.children.push(this.parseElement());
                continue;
            }
            if ([tokenType.Props, tokenType.Dataset, tokenType.Classes, tokenType.Ids, tokenType.Content, tokenType.Style].includes(t.type)) {
                this.parseSet(elem);
                continue;
            }
            logger.unexpectedError(
                `Unexpected token '${t.value}' at token position ${this.#tokens.length - this.#src.length - 1}`
            );
        }

        return elem;
    }

    parseSet(elem) {
        const t = this.current();
        switch (t.type) {
            case tokenType.Props:
                this.eat();
                elem.props = this.parseKeyValue(this.eat(tokenType.Block).value);
                break;
            case tokenType.Dataset:
                this.eat();
                elem.datasets = this.parseKeyValue(this.eat(tokenType.Block).value);
                break;
            case tokenType.Classes:
                this.eat();
                elem.classes = this.parseList(this.eat(tokenType.Block).value);
                break;
            case tokenType.Ids:
                this.eat();
                elem.ids = this.parseList(this.eat(tokenType.Block).value);
                break;
            case tokenType.Content:
                this.eat();
                elem.content = this.parseContent(this.eat(tokenType.Block).value);
                break;
            case tokenType.Style:
                this.eat();
                elem.style = this.parseKeyValue(this.eat(tokenType.Block).value);
                break;
            default:
                logger.invalidError("Invalid set or missing semicolon");
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
            } else if (c === '"') {
                quotes = !quotes;
                curr += c;
            } else curr += c;
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
            } else if (c === '"') {
                quotes = !quotes;
                curr += c;
            } else curr += c;
        }
        return arr;
    }

    unquote(str) {
        if (str[0] === '"' && str[str.length - 1] === '"') return str.slice(1, -1);
        return str;
    }
}
