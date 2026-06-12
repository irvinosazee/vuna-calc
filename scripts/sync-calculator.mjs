import { mkdirSync, cpSync } from 'node:fs';

mkdirSync('public/calculator/src', { recursive: true });
cpSync('src/calculator.js', 'public/calculator/src/calculator.js');
console.log('Synced src/calculator.js -> public/calculator/src/calculator.js');
