import {
    tokenType
} from './types.js'

import {
    LogError
} from './errors.js';

const logger = new LogError();

class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}
function token(type, value) {
    return new Token(type, value);
}

export function tokenize(source) {
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
        } else if (c === '"') {
            src.shift();
            let value = '';
            while (src.length > 0) {
                if (src[0] === '\\' && src[1] === '"') { value += '"'; src.shift(); src.shift(); }
                else if (src[0] === '\\' && src[1] === '\\') { value += '\\'; src.shift(); src.shift(); }
                else if (src[0] === '"') break;
                else value += src.shift();
            }
            if (src[0] !== '"') logger.unclosedError(`Unclosed String at position ${currentIndex()}`);
            src.shift();
            tokens.push(token(tokenType.String, value));
        } else if (src[0] === '-' && src[1] === '-') {
            while (src.length > 0 && src[0] !== '\n') {
                src.shift();
            }
        } else if ((c.toUpperCase() !== c.toLowerCase()) || '0123456789'.includes(c)) {
            let str = '';
            while (src.length > 0 && ((src[0].toUpperCase() !== src[0].toLowerCase()) || '0123456789'.includes(src[0]))) str += src.shift();
            const map = { from: tokenType.From, import: tokenType.Import, props: tokenType.Props, content: tokenType.Content, classes: tokenType.Classes, ids: tokenType.Ids, dataset: tokenType.Dataset, styles: tokenType.Style };
            tokens.push(token(map[str] ?? tokenType.Tag, str));
        } else if (' \n\r\t'.includes(c)) src.shift();
        else logger.unexpectedError(`Unexpected char '${c}' at position ${currentIndex()}`);
    }
    tokens.push(token(tokenType.EOF, "EOF"));
    return tokens;
}