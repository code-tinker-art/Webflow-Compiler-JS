import {
    convertToHTML
} from './src/compiler.js';
import fs from 'fs';
import path from 'path';

const data = fs.readFileSync('./testing file/test.webf', 'utf-8');
const emittedCode = convertToHTML(data, path.resolve(process.cwd(), "testing file"));

fs.writeFileSync('./testing file/test.html', emittedCode);


