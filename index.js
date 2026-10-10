#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';

const program = new Command();

// Функція для читання даних з data.json
function loadData() {
  const dataBuffer = fs.readFileSync('data.json');
  const dataJSON = dataBuffer.toString();
  return JSON.parse(dataJSON);
}

program
  .name('library-cli')
  .description('CLI для управління бібліотечним каталогом (Варіант 10)')
  .version('1.0.0');

// Команда для перегляду всіх книг
program
  .command('list')
  .description('Вивести список усіх книг у бібліотеці')
  .action(() => {
    const data = loadData();
    console.log(`\n📚 Бібліотека: ${data.libraryName}\n`);
    data.books.forEach((book) => {
      console.log(`ID: ${book.id} | Назва: "${book.title}" | Автори: ${book.authors.join(', ')} (${book.publicationYear})`);
    });
  });

program.parse(process.argv);