import { Command, InvalidArgumentError } from 'commander';
import { readFileSync } from 'node:fs';

const program = new Command();

program
  .name('library')
  .description('CLI-програма для роботи з бібліотечним каталогом')
  .version('1.0.0')
  .option('-f, --file <path>', 'шлях до JSON-файлу з каталогом', 'data.json');

// ---------- допоміжні функції ----------

function fail(message) {
  program.error(`Помилка: ${message}`);   // stderr + код завершення 1, без стеку
}

function loadCatalog() {
  const { file } = program.opts();
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') fail(`файл «${file}» не знайдено`);
    fail(`не вдалося прочитати файл «${file}» (${e.code})`);
  }
  let catalog;
  try {
    catalog = JSON.parse(text);
  } catch {
    fail(`файл «${file}» містить некоректний JSON`);
  }
  if (!Array.isArray(catalog.books)) {
    fail(`у файлі «${file}» немає масиву books`);
  }
  return catalog;
}

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new InvalidArgumentError('очікується додатне ціле число.');
  }
  return n;
}

function findBook(catalog, id) {
  const book = catalog.books.find((b) => b.id === id);
  if (!book) fail(`книгу з id ${id} не знайдено`);
  return book;
}

function printBookLine(b) {
  console.log(`${b.id}\t${b.title}\t${b.authors.join(', ')}\t${b.publicationYear}`);
}

// ---------- загальні команди ----------

program
  .command('list')
  .description('Показати стислий перелік книг')
  .option('-l, --limit <n>', 'максимальна кількість книг', parsePositiveInt)
  .action((options) => {
    const { books } = loadCatalog();
    const shown = options.limit ? books.slice(0, options.limit) : books;
    shown.forEach(printBookLine);
  });

program
  .command('show')
  .description('Показати одну книгу повністю')
  .argument('<id>', 'id книги', parsePositiveInt)
  .action((id) => {
    console.log(JSON.stringify(findBook(loadCatalog(), id), null, 2));
  });

program
  .command('field')
  .description('Показати значення поля книги за шляхом через крапку, напр. copies.0.inventoryNumber')
  .argument('<id>', 'id книги', parsePositiveInt)
  .argument('<path>', 'шлях до поля через крапку')
  .action((id, path) => {
    let value = findBook(loadCatalog(), id);
    for (const key of path.split('.')) {
      if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) {
        fail(`поле «${path}» відсутнє у книги ${id}`);
      }
      value = value[key];
    }
    console.log(value !== null && typeof value === 'object'
      ? JSON.stringify(value, null, 2)
      : String(value));            // null виведеться як «null»
  });

// ---------- команди варіанта 10 ----------

program
  .command('search-author')
  .description('Знайти книги автора за частиною імені')
  .argument('<name>', 'частина імені автора (регістр не має значення)')
  .action((name) => {
    const q = name.toLowerCase();
    const found = loadCatalog().books.filter((b) =>
      b.authors.some((a) => a.toLowerCase().includes(q)));
    if (found.length === 0) {
      console.log('Книг цього автора не знайдено.');
      return;
    }
    found.forEach(printBookLine);
  });

program
  .command('copies')
  .description('Показати примірники книги')
  .argument('<bookId>', 'id книги', parsePositiveInt)
  .option('-a, --available-only', 'показати лише доступні примірники')
  .action((bookId, options) => {
    const book = findBook(loadCatalog(), bookId);
    const copies = options.availableOnly
      ? book.copies.filter((c) => c.available)
      : book.copies;
    if (copies.length === 0) {
      console.log('Примірників не знайдено.');
      return;
    }
    for (const c of copies) {
      console.log(`${c.inventoryNumber}\t${c.available ? 'доступний' : 'виданий'}`);
    }
  });

program
  .command('loans')
  .description('Показати історію видач примірника')
  .argument('<inventoryNumber>', 'інвентарний номер, напр. INV-00231')
  .action((inv) => {
    const wanted = inv.toUpperCase();
    for (const book of loadCatalog().books) {
      const copy = book.copies.find((c) => c.inventoryNumber.toUpperCase() === wanted);
      if (!copy) continue;
      console.log(`Примірник ${copy.inventoryNumber} («${book.title}»)`);
      if (copy.loanHistory.length === 0) {
        console.log('Видач не було.');
        return;
      }
      for (const l of copy.loanHistory) {
        console.log(`${l.borrowedDate} → ${l.returnedDate ?? 'не повернено'}\t${l.borrowerName}`);
      }
      return;
    }
    fail(`примірник «${inv}» не знайдено`);
  });

program.parse();