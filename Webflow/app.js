'use strict';

import {
    convertToHTML
} from './src/compiler.js';
import fs from 'fs';

const data = fs.readFileSync('./testing file/test.webf', 'utf-8');
const emittedCode = convertToHTML(data);

fs.writeFileSync('./testing file/test.html', emittedCode);

