const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "public", "mini-app", "index.html");
const D = "motion.div".slice(7);

function section(id, title, inner) {
  return [
    `            <article id="${id}" class="help-doc-section card help-doc-callout web-instr-section">`,
    `              <h3 class="help-doc-h3">${title}</h3>`,
    inner,
    `            </article>`,
  ].join("\n");
}

const shotNav = [
  `              <figure class="web-instr-figure">`,
  `                <figcaption class="web-instr-figure-caption muted">Схема: боковое меню и шапка</figcaption>`,
  `                <${D} class="web-instr-shot" aria-hidden="true">`,
  `                  <${D} class="web-instr-shot-layout">`,
  `                    <${D} class="web-instr-shot-sidebar">`,
  `                      <${D} class="web-instr-shot-brand">Balancy</${D}>`,
  `                      <${D} class="web-instr-shot-nav-item is-hot"><span class="web-instr-pin">1</span>Главная</${D}>`,
  `                      <${D} class="web-instr-shot-nav-item"><span class="web-instr-pin">2</span>Счета</${D}>`,
  `                      <${D} class="web-instr-shot-nav-item"><span class="web-instr-pin">3</span>Категории</${D}>`,
  `                      <${D} class="web-instr-shot-nav-item"><span class="web-instr-pin">4</span>Операции</${D}>`,
  `                      <${D} class="web-instr-shot-nav-item"><span class="web-instr-pin">5</span>Переводы</${D}>`,
  `                      <${D} class="web-instr-shot-nav-item"><span class="web-instr-pin">6</span>Отчёты</${D}>`,
  `                      <${D} class="web-instr-shot-nav-item"><span class="web-instr-pin">7</span>История</${D}>`,
  `                      <${D} class="web-instr-shot-nav-item web-instr-shot-nav-item--guide"><span class="web-instr-pin">8</span>Инструкция</${D}>`,
  `                    </${D}>`,
  `                    <${D} class="web-instr-shot-main">`,
  `                      <${D} class="web-instr-shot-header">`,
  `                        <span class="web-instr-shot-title">Главная</span>`,
  `                        <span class="web-instr-shot-btn is-hot"><span class="web-instr-pin">A</span>+ Новая запись</span>`,
  `                        <span class="web-instr-shot-btn-icon"><span class="web-instr-pin">B</span>↻</span>`,
  `                      </${D}>`,
  `                      <${D} class="web-instr-shot-body muted">Содержимое раздела</${D}>`,
  `                    </${D}>`,
  `                  </${D}>`,
  `                </${D}>`,
  `              </figure>`,
].join("\n");

const shotHome = [
  `              <figure class="web-instr-figure">`,
  `                <figcaption class="web-instr-figure-caption muted">Схема: карточки на главной</figcaption>`,
  `                <${D} class="web-instr-shot web-instr-shot--stack" aria-hidden="true">`,
  `                  <${D} class="web-instr-shot-card is-hot"><span class="web-instr-pin">1</span>Общий баланс</${D}>`,
  `                  <${D} class="web-instr-shot-row">`,
  `                    <${D} class="web-instr-shot-card"><span class="web-instr-pin">2</span>Ваши счета</${D}>`,
  `                    <${D} class="web-instr-shot-card"><span class="web-instr-pin">3</span>История</${D}>`,
  `                  </${D}>`,
  `                  <${D} class="web-instr-shot-row">`,
  `                    <${D} class="web-instr-shot-card"><span class="web-instr-pin">4</span>По категориям</${D}>`,
  `                    <${D} class="web-instr-shot-card"><span class="web-instr-pin">5</span>Расходы и доходы</${D}>`,
  `                  </${D}>`,
  `                </${D}>`,
  `              </figure>`,
].join("\n");

function shotForm(rows) {
  const fields = rows
    .map(([pin, label, hot]) => {
      const cls = hot ? "web-instr-shot-field is-hot" : "web-instr-shot-field";
      return `                  <${D} class="${cls}"><span class="web-instr-pin">${pin}</span>${label}</${D}>`;
    })
    .join("\n");
  return [
    `              <figure class="web-instr-figure">`,
    `                <${D} class="web-instr-shot web-instr-shot--form" aria-hidden="true">`,
    fields,
    `                </${D}>`,
    `              </figure>`,
  ].join("\n");
}

const html = [
  `          <${D} class="web-instruction-root">`,
  `            <nav class="web-instr-toc card" aria-label="Содержание инструкции">`,
  `              <p class="web-instr-toc-title">Содержание</p>`,
  `              <ol class="web-instr-toc-list">`,
  `                <li><a href="#web-instr-start">С чего начать</a></li>`,
  `                <li><a href="#web-instr-nav">Меню и навигация</a></li>`,
  `                <li><a href="#web-instr-home">Главная</a></li>`,
  `                <li><a href="#web-instr-accounts">Счета</a></li>`,
  `                <li><a href="#web-instr-categories">Категории</a></li>`,
  `                <li><a href="#web-instr-activity">Операции</a></li>`,
  `                <li><a href="#web-instr-transfer">Переводы</a></li>`,
  `                <li><a href="#web-instr-reports">Отчёты</a></li>`,
  `                <li><a href="#web-instr-history">История</a></li>`,
  `              </ol>`,
  `            </nav>`,
  `            <p class="help-doc-lede muted">Пошаговое руководство по веб-версии Balancy: куда нажимать, в каком порядке заводить данные и как читать сводки. Серые блоки ниже — схемы экранов с номерами кнопок.</p>`,
  section(
    "web-instr-start",
    "1. С чего начать",
    `              <ol class="help-doc-list help-doc-numbered">
                <li>Откройте <strong>Счета</strong> и создайте хотя бы один счёт.</li>
                <li>Добавьте <strong>Категории</strong> доходов и расходов.</li>
                <li>Запишите операцию в <strong>Операции</strong> или через <strong>+ Новая запись</strong>.</li>
              </ol>`
  ),
  section(
    "web-instr-nav",
    "2. Меню слева и шапка",
    `              <p class="muted">Разделы — слева; быстрые действия — справа в шапке.</p>
${shotNav}
              <ul class="help-doc-list">
                <li><strong>1–7</strong> — разделы меню.</li>
                <li><strong>8</strong> — эта инструкция (слегка выделена).</li>
                <li><strong>A</strong> — новая запись.</li>
                <li><strong>B</strong> — обновить данные.</li>
              </ul>`
  ),
  section(
    "web-instr-home",
    "3. Главная",
    `              <p class="muted">Баланс, сводка за месяц, счета, история, диаграммы.</p>
${shotHome}
              <ul class="help-doc-list">
                <li><strong>1</strong> — валюта отображения и общий баланс.</li>
                <li><strong>2–3</strong> — короткие списки счетов и операций.</li>
                <li><strong>4–5</strong> — расходы по категориям и полоски дохода/расхода.</li>
              </ul>`
  ),
  section(
    "web-instr-accounts",
    "4. Счета",
    `              <ol class="help-doc-list help-doc-numbered">
                <li>Меню <strong>Счета</strong>: список слева, форма справа.</li>
                <li>Заполните поля и нажмите <strong>Создать счёт</strong>.</li>
                <li>Редактирование — иконка карандаша в строке.</li>
              </ol>
${shotForm([
    ["1", "Название", false],
    ["2", "Тип · Валюта · Баланс", false],
    ["3", "Цвет и иконка", false],
    ["4", "Создать счёт", true],
  ])}`
  ),
  section(
    "web-instr-categories",
    "5. Категории",
    `              <ol class="help-doc-list help-doc-numbered">
                <li>Выберите <strong>Доход</strong> или <strong>Расход</strong>.</li>
                <li>Укажите название, цвет и иконку.</li>
                <li><strong>Сохранить</strong>.</li>
              </ol>
${shotForm([
    ["1", "Тип: Доход / Расход", false],
    ["2", "Название", false],
    ["3", "Сетка иконок", false],
    ["4", "Сохранить", true],
  ])}`
  ),
  section(
    "web-instr-activity",
    "6. Операции",
    `              <ol class="help-doc-list help-doc-numbered">
                <li>Раздел <strong>Операции</strong> или меню <strong>+ Новая запись</strong>.</li>
                <li>Карточки <strong>Доход</strong> / <strong>Расход</strong>.</li>
                <li>Под счётом — строка «Доступно: …».</li>
                <li><strong>Сохранить операцию</strong>.</li>
              </ol>
${shotForm([
    ["1", "Тип операции", false],
    ["2", "Счёт · Категория", false],
    ["3", "Сумма · Дата", false],
    ["4", "Сохранить", true],
  ])}`
  ),
  section(
    "web-instr-transfer",
    "7. Переводы",
    `              <ol class="help-doc-list help-doc-numbered">
                <li>Меню <strong>Переводы</strong>.</li>
                <li>Счета «откуда» и «куда», кнопка ⇅ между ними.</li>
                <li><strong>Сохранить перевод</strong>.</li>
              </ol>
${shotForm([
    ["1", "Со счёта · На счёт", false],
    ["2", "Сумма", false],
    ["3", "Сохранить перевод", true],
  ])}`
  ),
  section(
    "web-instr-reports",
    "8. Отчёты",
    `              <ol class="help-doc-list help-doc-numbered">
                <li>Выберите период и фильтры.</li>
                <li><strong>Показать</strong> — графики и таблицы.</li>
                <li><strong>Скачать отчёт</strong> — CSV.</li>
              </ol>
${shotForm([
    ["1", "Период", false],
    ["2", "Фильтры", false],
    ["3", "Показать", true],
  ])}`
  ),
  section(
    "web-instr-history",
    "9. История",
    `              <ol class="help-doc-list help-doc-numbered">
                <li>Задайте фильтры и поиск.</li>
                <li><strong>Применить</strong>.</li>
                <li>Листайте страницы внизу таблицы.</li>
              </ol>
              <p class="help-doc-note muted">Если запись не появилась — нажмите обновление в шапке.</p>`
  ),
  `          </${D}>`,
].join("\n");

let index = fs.readFileSync(indexPath, "utf8");

if (index.includes("web-instruction-root")) {
  console.log("Already present");
  process.exit(0);
}

const replaced = index.replace(
  /(<section id="screen-instruction" class="screen" data-screen="instruction">[\r\n]+)\s*<div class="tg-instruction-root">/,
  `$1${html}\r\n\r\n          <div class="tg-instruction-root">`
);

if (replaced === index) {
  console.error("Marker not found");
  process.exit(1);
}

fs.writeFileSync(indexPath, replaced);
console.log("Inserted web instruction");
