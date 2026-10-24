# Calendar changes in 1.0.6

Изменения календаря включены в исходники 1.0.6. Опубликованные коммиты и теги не менялись; публикация GitHub здесь не выполнялась. Ранние проверки ниже сохранены как история разработки.

Актуальные результаты комплексной проверки: [QUALITY_REVIEW.md](docs/QUALITY_REVIEW.md). Разделы ниже также сохраняют журнал предыдущих этапов.

## Что изменено

- Добавлено отдельное многострочное поле «Результат» в разделе «Описание и результат». Черновики, защита от конфликтов и отмена учитывают оба поля; у повторяющихся задач итог хранится отдельно для каждого выполнения.
- Текущая неделя с понедельника по воскресенье отмечается тонким подчёркиванием чисел в месячном календаре, без фоновой заливки и полосы на всю ячейку; сегодняшний день сохраняет отдельный маркер.
- Высота компактных карточек определяется видимыми строками названия с общей высотой строки и отступами; значки находятся рядом с первой строкой, без дополнительного подвала.
- Кнопки, поля и выбор значений получили общие нейтральные поверхности. Значки редактирования и удаления сфер/проектов уменьшены до 16 px; области нажатия, отступы и выравнивание согласованы на всех страницах и в формах.
- В широкой неделе и месяце задачи со стартом и дедлайном выровнены по общим строкам. Пересекающиеся задачи разнесены, а освобождённые строки используются повторно. На следующей неделе размещение уплотняется заново. Пустых карточек нет; небольшие промежутки нужны только для сохранения уровня. Подробный вид также выровнен. В узких окнах и браузерах без subgrid остаётся список.
- Наведение или клавиатурный фокус подсвечивают связанные карточки одной задачи.
- Индикатор нагрузки под датой показывает запланированное/доступное время; перегрузка выделена красным. Конечная дата отмечена отдельным значком календаря с часами, без текстовой метки «Срок».
- Нажатие на название периода открывает выбор дня, месяца и года. Проверяются существование даты и високосные годы. Перетаскивание показывает дату назначения; отмена и завершение убирают подсказку и приглушение карточки. Порядок перехода с клавиатуры соответствует видимым строкам.

- Нейтральные поверхности карточек и тонкие полоски статуса. Маркеры приоритета остаются отдельными: высокий — красный `!`, низкий — белая стрелка вниз.
- Сегодня выделено лёгкой обводкой и акцентом под датой; выходные — только спокойным оттенком подписей и чисел, без фоновой заливки.
- Промежуточные дни задачи показываются компактной прозрачной полоской с полным названием с переносами и стрелкой вместо чекбокса. Время, тип, приоритет, цвет статуса и зачёркивание закрытой задачи сохраняются. Отступ названия совпадает с обычной карточкой. Нажатие открывает исходную задачу.
- Элементы управления разделены на группы периода, отображения и фильтров. Кнопки имеют согласованную геометрию и видимый клавиатурный фокус.
- Дополнительный «Обзор месяца» оставляет три записи в дне. «Показать ещё · N» открывает выбранный день целиком. Учитываются задачи, промежуточные отметки, дедлайны проектов и платежи подписок. Фильтры применяются до подсчёта. По умолчанию обзор отключён и видны все записи.
- В узких панелях сохраняется список дней. Промежуточные отметки и переход к полному дню имеют область нажатия от 44 px. Внутренние скроллбары не добавлены: прокручивается вся страница.
- Встроенная инструкция на русском и английском, GUIDE.md и README обновлены.

## Установка для пробы

Закройте Obsidian. Из каталога `tiny-planner-source` скопируйте `main.js`, `manifest.json` и `styles.css` в `.obsidian/plugins/tiny-planner/` вашего хранилища. Существующий `data.json` сохраните. Затем откройте Obsidian.

Для просмотра исходников и запуска проверок используются обычные команды из docs/DEVELOPMENT.md. Настройки отображения действуют в открытом виде планировщика; включение обзора и переходы между видами не переписывают заметки.

## Проверки и ограничения

Проверка метаданных, официальный Obsidian recommended lint, TypeScript, сборка и сравнение сгенерированного main.js включены в проект. Регрессионные тесты проверяют подсчёт смешанных записей, фильтры, переход к полному дню и сохранность данных. Браузерная матрица покрывает светлую/тёмную темы, узкие панели и масштаб интерфейса; проверяются прокрутка колесом над календарём и отсутствие вложенных областей прокрутки.

Проверки выполняются в Chromium с макетом Obsidian API. Физические устройства Android/iOS и нативный Obsidian в этой среде не запускались. Секреты и подозрительные механизмы сетевой отправки, shell/eval или вставки HTML в собственном runtime при целевой проверке не обнаружены; отсутствие бэкдоров не может быть доказано одним сканером.

### Полная проверка предыдущего этапа

- Node.js 22.23.3: метаданные, официальный Obsidian lint, TypeScript и сборка прошли.
- 273/273 unit/integration тестов, без пропусков.
- Полный test:browser: 87/87 UI, 16/16 тем и 36/36 сочетаний ширины/масштаба/темы; код завершения 0.
- main.js побайтово совпадает с повторной сборкой; браузер проверял те же main.js и styles.css.
- npm audit обоих lockfile: 0 известных уязвимостей; подписи 61 и 332 пакетов подтверждены, attestations 4 и 60 соответственно.
- Gitleaks для собственных исходников: секретов не обнаружено. Целевой поиск в runtime не выявил сети, shell/eval или HTML-вставок.
- Исходный архив содержит контрольные суммы; приватные логи, тестовые vault, зависимости и Git-история исключены.

### Убрана текстовая метка дедлайна

По запросу убраны надписи «Срок»/Due перед названием. Остались указанное время, название и прежний значок календаря с часами. Удалены неиспользуемые короткие переводы и CSS для префикса; сведения о дедлайне в подробностях и доступное описание сохранены.

### Следующий этап дизайна

Продолжения получили приглушённый обычный текст и более заметное время; цвет статуса сохранён в полоске и оттенке зачёркнутых закрытых названий. Сетка облегчена, границы недель различимы. Старт и дедлайн отмечены ровными полосами слева и справа без выступающих меток. «Отображение» скрывает редко используемые фильтры, обзор месяца и подробности задач. По умолчанию панель закрыта; Enter/Space и Escape поддерживаются. Переключатель плотности удалён; используются постоянные компактные отступы. Пустые дни телефона ниже, с кнопкой даты на всю ширину и высотой не менее 44 px. Настройки действуют в открытом виде, без записи заметок.

### Упрощение управления

На основной строке календаря оставлены только «День / Неделя / Месяц» и значок настроек. Панель содержит пять обычных флажков в двух группах: «Показывать задачи» (выполненные, проваленные, повторяющиеся) и «Карточки» (подробности, до 3 записей на день (месяц)). Отметка означает включённое действие; подписи не меняются. Пары кнопок режимов удалены. У конечной карточки цветная полоса перенесена исключительно вправо; прозрачная граница слева сохраняет отступ названия. Просрочка остаётся красной.

### Исправлены переключатели и полосы

Ограничение месяца доступно для включения и снятия во всех видах. В дне и неделе оно не скрывает записи; при возврате в месяц используется выбранное состояние. Удалены состояние, переводы и CSS увеличенных отступов. Полосы задач и продолжений прямые, без скругления и выступающих точек.

### Полное название без подробностей

Ограничения в одну/две строки и фиксированная высота названия удалены. Основные карточки и продолжения показывают полное название с переносами; сведения о проекте и действия по-прежнему скрыты до раскрытия. Высота растёт по содержимому, без вложенной прокрутки. Выравнивание недельных строк сохранено.

### Фильтры, удаление и проваленные задачи

Кнопка «Фильтры» подписана, индикатор активного отбора синхронизирован. Выбор проекта в быстром добавлении имеет отдельное доступное название. Проекты и сферы можно удалить через корзину в иерархии или из редактора, после подтверждения. Связанные заметки не удаляются; отмена восстанавливает исходный файл и ссылки. Проваленные просроченные задачи и повторы не возвращаются в «Сегодня» и на доску за сегодня по дате отметки Failed. История в календаре и общем списке сохранена.

### Старт и дедлайн в один день

Карточка задачи, у которой запланированная дата совпадает с дедлайном, имеет прямые полосы с обеих сторон. Обе наследуют цвет статуса; просрочка остаётся красной. У завершающей карточки многодневной задачи остаётся только правая полоса.

Текущая проверка двойных полос: 274/274 unit/integration, официальный Obsidian lint, TypeScript и воспроизводимость сборки. Целевая браузерная проверка охватывает пять статусов, две темы и ширины 1440/390/320 px; старые многодневные дедлайны остаются с правой полосой. Обе проверки зависимостей: 0 известных уязвимостей.

### Пять визуальных доработок

Значки находятся рядом с первой строкой названия; карточки с одинаковым числом видимых строк имеют одинаковую высоту. Пустые дни и границы сетки приглушены. Сегодня выделено числом и верхней границей. В заголовке дня оставлены дата и плановое время; наведение или нажатие раскрывает ёмкость, задачи без оценки и индикатор нагрузки без сдвига карточек. Escape, нажатие снаружи, прокрутка и изменение размера закрывают сведения. Промежуточные карточки прозрачные, с полным названием, полосой статуса и прежним зачёркиванием.

Проверка визуальных доработок: 275 unit/integration тестов, основной браузерный набор 88 UI, 16 тем и 36 раскладок. Финальное выравнивание дополнительно проверено отдельно в двух темах и на трёх ширинах, в минимальном и подробном видах. Touch-события на 320 px открывают и закрывают сведения о времени. Открытие, прокрутка, Escape и взаимодействие с другим планером проверены без изменения заметок.

### Выравнивание содержимого карточек

Название всегда начинается с одной высоты относительно чекбокса, независимо от наличия значков. Чекбокс выровнен по первой строке, многоточие остаётся справа. Значки типа, приоритета, описания и дедлайна расположены рядом с первой строкой полного названия. Продолжения используют те же метрики строк, что и основные карточки. У коротких карточек убран обязательный запас под две строки; длинные названия по-прежнему переносятся целиком. Дополнительная строка под значки не резервируется.

Регрессионная проверка сравнивает отступы обычной карточки и карточки со значками, центр чекбокса и первую строку названия, отсутствие наложений и ширину полного текста в двух темах, на 1440/390/320 px и в обоих режимах подробностей.


## Usability preview — 23 October 2026

- Added `taskType: contact` (Связаться / Contact) for writing or calling, with a message icon across task surfaces and the bilingual guide.
- Reduced the initial editor to title, project, type and dates. Planning (including status), repeat, time tracking and description use disclosures; populated sections open automatically. Entity budgets and subscription descriptions are also disclosed.
- Added removable active-filter labels, contextual empty states, editable additional work dates and exact estimate-distribution previews.
- Added a visual recurrence editor for periods, intervals, weekly days and counts, with five-date previews. Advanced RRULEs and the guarded engine remain intact; COUNT and exact unchanged UNTIL are preserved.
- Restored view preferences through Obsidian view state and plugin settings, deliberately opening calendar dates relative to today. Added Today/Calendar/Inbox commands.
- Kept up to 20 recent task/entity/subscription form drafts in settings. Drafts preserve dates and invalid typed intervals, can be discarded, and require explicit restoration if the note changed. Task form saves detect conflicts atomically, preserve input and show inline errors.
- Reduced neutral outlines and title weight, retaining status colors, full titles, straight deadline rails, whole-page scrolling and touch sizes.
- Batched visible workload calculations so each series is expanded once per range. A synthetic Node 22 sample with 500 recurring tasks and 42 days took 340 ms with individual queries and 28 ms batched, with identical results; this is not a device benchmark.
- Added dependency-free deterministic source ZIP packaging, automatic inclusion of new source/test modules, per-file SHA-256 checksums and explicit private-file exclusions.

Validation of the final runtime assets:

- Node 22: release metadata, official Obsidian/vendor lint, TypeScript, build and 288 unit/integration tests passed.
- Chromium with mocked Obsidian API: 88/88 existing UI scenarios, 6/6 new usability/theme/width scenarios, 16/16 theme checks and 36/36 phone/tablet/desktop/scale layouts passed. No uncaught JavaScript errors. Captured form layouts were visually inspected at narrow widths.
- Both project and isolated lint lockfile audits returned zero known vulnerabilities. No new runtime dependencies. Targeted runtime and credential-pattern scans found no suspicious matches.
- Native Obsidian, physical Android/iOS devices and remote GitHub checks were not run. The preview stays on version 1.0.5 and was not pushed, tagged or released.


## Results and lighter controls — 24 October 2026

- Separate multiline Result beside Description; independent occurrence results, draft recovery, concurrent-edit checks and Undo. Existing notes require no migration.
- Common title line metrics and inline markers make equal visible line counts produce equal compact-card heights. In the desktop fixture, one/two/three/four lines measured 28/44/62/80 px in both themes; phone touch minima remain 44 px.
- Subtle current-week background in Month, using Monday–Sunday boundaries.
- Consistent neutral controls and 16 px project/area action icons, with aligned spacing and retained phone touch areas. No new dependencies.
- Browser verification: 88/88 UI scenarios, 6/6 usability layouts, 16/16 theme scenarios, 36/36 responsive layouts and 54/54 page × theme × width combinations. No uncaught browser errors. Forms and page screenshots were visually inspected.
- Verification uses mocked Obsidian API; native Obsidian and physical mobile devices were not exercised. This remains an unpublished local preview over 1.0.5.
- Final Node 22 verification: release metadata, official Obsidian/vendor lint, TypeScript, build and 293/293 unit/integration tests passed.

## Minimal reading surfaces — 24 October 2026

- Project and statistics sections use spacing and quiet separators instead of nested frames. Navigation headings use ordinary case and lighter weight; inactive controls are flat.
- Task titles use the normal reading color; closed tasks use muted text and retain strikethrough. Status rails, checkboxes, overdue labels and charts retain their semantic colors. Earlier notes about colored task titles are superseded by this treatment.
- List metadata shares one context line where space permits. Repeated workflow captions remain accessible without taking another visible line.
- Desktop list actions appear on row hover or keyboard focus. Phone/touch controls remain explicit. No fields, features or settings were removed, and no new settings or dependencies were added.
- Card line metrics, occurrence results, full titles and current-week highlighting are retained.

## Weekend and continuation correction — 24 October 2026

- Remove conflicting empty-day and outside-month weekend backgrounds. Every Saturday/Sunday uses the same neutral surface; the current week underlines date numbers without changing weekday/weekend surfaces. Remove the current-week inset top stripe. Today's date keeps its independent marker.
- Mute closed continuation titles, including linked hover/focus, and reduce closed priority-marker emphasis. Status accents remain semantic.
- Add 16 focused browser cases across black/light themes, desktop/phone, compact/detailed Month, Week and Day. Include an outside-month Saturday and today on Sunday in the current week, populated and empty weekends, hover and keyboard focus.


## Current-week line — 24 October 2026

Replace the current-week background tint with a thin accent line under each of its seven day headings. Preserve the normal weekday/weekend backgrounds, today marker and closed-task dimming.


## Restore daily workload bars — 24 October 2026

Daily load bars are visible under the date headings on every week, including past/future and adjacent-month dates. Empty days have an empty track. Bars and popup details share the existing active planned-work/capacity calculation; overloads are red. Replace the long current-week heading line with a small underline on the date number only. This update requires both main.js and styles.css.

Validation: 293 unit/integration tests and 20 focused calendar browser cases passed, including 50% fill across all weeks and a 100% overload on a future week.

## Card width correction — 24 October 2026

Calendar cards now explicitly fill their container width. The existing align-self:start rule sized a grid card vertically but also let ordinary cards inside column flex containers shrink horizontally to title width. Explicit width:100% and border-box sizing fix that distinction without changing title line heights, load bars, status markers or weekend styling. Browser geometry checks now assert both container width and equal height for equal visible line counts, including Ardshinbank/Raiffeisen, multiple widths, themes, ordinary cards and aligned range cards. Only styles.css is required for this correction.
