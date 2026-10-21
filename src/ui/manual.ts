import { setIcon } from 'obsidian';
import { STATUSES } from '../core/model';
import { el } from './dom';

let manualId = 0;
import { words } from './i18n';

/** A separate reading surface keeps operational pages free of tutorials. */
export function manual(
  parent: HTMLElement,
  language: string,
  author: string,
  version: string,
): void {
  const w = words(language);
  const t = (en: string, ru: string) => (language === 'ru' ? ru : en);
  const root = el(parent, 'article', 'tp-manual');
  root.lang = language === 'ru' ? 'ru' : 'en';
  el(
    root,
    'p',
    'tp-manual-intro',
    t(
      'Tiny Planner is a personal planner for Obsidian: tasks, projects, a calendar and recurring work in one place. It helps you see what to do and when, while keeping completion history in your vault.',
      'Tiny Planner помогает планировать дела в Obsidian: задачи, проекты, календарь и повторы собраны в одном месте. Вы видите, что нужно сделать и когда, а история остаётся в вашем хранилище.',
    ),
  );
  const contents = el(root, 'nav', 'tp-manual-contents');
  const prefix = `tp-manual-${++manualId}`;
  const contentsHeading = el(contents, 'h2', '', w.manualContents);
  contentsHeading.id = `${prefix}-contents`;
  contents.setAttribute('aria-labelledby', contentsHeading.id);
  const links = el(contents, 'ol', 'tp-manual-links');
  const section = (title: string, paragraphs: string[]) => {
    const index = links.childElementCount + 1;
    if (index > 1) el(root, 'hr', 'tp-manual-divider');
    const block = el(root, 'section');
    const heading = el(block, 'h2', 'tp-manual-heading');
    el(heading, 'span', 'tp-manual-number', String(index).padStart(2, '0') + ' ');
    el(heading, 'span', '', title);
    heading.id = `${prefix}-chapter-${index}`;
    heading.tabIndex = -1;
    const item = el(links, 'li');
    const link = el(item, 'a', 'tp-manual-link');
    link.href = `#${heading.id}`;
    const number = el(link, 'span', 'tp-manual-link-number', String(index).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    el(link, 'span', '', title);
    link.addEventListener('click', (event) => {
      event.preventDefault();
      block.scrollIntoView({ block: 'start', behavior: 'auto' });
      heading.focus({ preventScroll: true });
    });
    for (const paragraph of paragraphs) el(block, 'p', '', paragraph);
    return block;
  };
  section(t('Area → project → task', 'Сфера → проект → задача'), [
    t(
      'An area is an ongoing part of life, such as Home or Work. A project groups work toward an outcome, such as Moving home. A task is a specific action. Tasks without a project appear in Inbox. Changing a project status does not change its tasks.',
      'Сфера — часть жизни, например «Дом» или «Работа». Проект объединяет дела ради результата, например «Переезд». Задача — конкретное действие. Задачи без проекта попадают во «Входящие». Смена статуса проекта не меняет статусы его задач.',
    ),
  ]);
  section(t('Capture, dates and time', 'Добавление задач, даты и время'), [
    t(
      'The panel button at the top of the left menu collapses or expands navigation. When collapsed, the same chevron moves to the page header and the content uses the full width. It remains available in every section, including Guide. The choice lasts while this planner view is open. Enter a title and date in quick entry and press Enter or +. Options reveals project, time and status. The sliders button opens the full form. Click a task title to edit it. A document icon beside the task title indicates a description; hover it for a tooltip. The calendar button beside each date lets you choose a day, month and year, use today or clear the field. Typed dates may omit separators: 07102026 in DD.MM.YYYY means 07.10.2026. Settings choose the date order; ISO dates can be pasted in any mode.',
      'Кнопка вверху левого меню сворачивает и раскрывает его. В свёрнутом состоянии та же кнопка перемещается в заголовок страницы, а содержимое занимает всю ширину. Она доступна в каждом разделе, включая инструкцию. Выбор сохраняется, пока открыта эта вкладка планнера. Введите название и дату в строку добавления и нажмите Enter или +. «Параметры» раскрывают проект, время и статус. Кнопка с ползунками открывает полную форму. Нажмите на название задачи, чтобы открыть форму. Значок документа рядом с названием отмечает наличие описания; при наведении появляется подсказка. Значок календаря рядом с датой позволяет выбрать день, месяц и год, перейти к сегодняшнему дню или очистить поле. Дату можно вводить без разделителей: 07102026 в формате ДД.ММ.ГГГГ означает 07.10.2026. Формат меняется в настройках; даты ISO можно вставлять при любом формате.',
    ),
    w.appointmentHelp,
    t(
      'Calendar cells put Done first, then Failed, then unfinished tasks; each group is ordered by time. Other day lists put timed tasks earliest first, followed by untimed tasks. Series time applies to all repeats and survives moves. A red ! marks high priority with a gentle pulse; a white down arrow marks low priority; closed tasks and reduced motion keep a static badge. Overdue tasks are red and labelled Overdue. Payment uses a $ marker, Meeting uses a people icon and Status uses a flag. The type marker and the high-priority ! can appear together. Calendar cards have equal closed heights and show the checkbox, assigned time before the title when provided, up to two title lines and uniform icons. Assigned time remains visible in Minimal view and on continuation marks. The vertical ellipsis reveals the full title, area/project, estimates and actions. Minimal view collapses these details; Detailed view expands every task. The choice stays with the open planner view across Day, Week and Month. Subtle intermediate-day marks connect start and deadline without checkboxes or workload and follow the task status, including green strikethrough for completed work. Calendar cards stay compact and all remain visible; only the whole planner page scrolls. Narrow panes use a readable dated agenda.',
      'В календаре сначала идут выполненные задачи, затем не выполненные и открытые; внутри группы они упорядочены по времени. В остальных списках дня сначала идут задачи со временем, затем без него. Время серии относится ко всем повторам и сохраняется при переносе. Красный значок ! отмечает высокий приоритет, белая стрелка вниз — низкий. Маркер высокого приоритета мягко пульсирует; у закрытых задач и при отключённой анимации остаётся неподвижным. Просроченные задачи выделены красным и подписаны «Просрочено». В календаре закрытые карточки имеют одинаковую высоту: чекбокс, указанное время перед названием, до двух строк названия и значки одного размера. Время видно и в минималистичном виде, и на промежуточных отметках. Вертикальное многоточие раскрывает полное название, сферу, проект, оценку длительности и действия. «Минималистичный вид» сворачивает подробности, «Подробный вид» раскрывает все задачи. Выбор сохраняется в открытой вкладке для дня, недели и месяца. Приглушённые отметки между стартом и дедлайном не имеют чекбоксов и не увеличивают нагрузку. Они наследуют статус задачи: выполненные зелёные и зачёркнутые. Карточки остаются компактными и видимыми целиком; прокручивается только вся страница планировщика. В узком окне используется читаемый список дат. Платёж отмечен знаком $, встреча — значком людей, статус — флажком. Маркер типа и восклицательный знак высокого приоритета могут отображаться вместе.',
    ),
    w.manual,
  ]);
  section(t('Statuses and Undo', 'Статусы и отмена действий'), [
    t(
      'Backlog holds deferred work; To do is planned work; In progress is started work; Done and Failed are closed. The checkbox completes or reopens a task, the cross marks failure and the trash button deletes it. Undo reverses up to 50 changes in the current session; creation and import are excluded. Restarting clears Undo history. Undo preserves conflicting external edits.',
      '«Отложено» — дела на потом, «К выполнению» — запланированные, «В работе» — начатые. «Выполнено» и «Не выполнено» — закрытые задачи. Галочка завершает или переоткрывает задачу, крестик отмечает невыполнение, корзина удаляет. Отмена доступна для последних 50 изменений в текущей сессии, кроме создания и импорта. После перезапуска история отмены очищается. При конфликте отмена сохраняет изменения, сделанные вне планнера.',
    ),
  ]);
  section(t('Repeats and series end', 'Повторы и завершение серии'), [
    t(
      'Daily, weekly, weekday, monthly, yearly and custom RRULE repeats are available. Date anchors the series; Repeat through is its inclusive last day, and an empty end leaves it open-ended. A weekday series anchored on a weekend starts on Monday. The form and save confirmation show its first repeat. A range with no matching dates cannot be saved.',
      'Доступны повторы каждый день, неделю, по будням, месяц, год и собственное правило RRULE. Начальная дата задаёт отсчёт серии; «Повторять по» включает последний день, а пустое поле оставляет серию без конца. Если повтор по будням начинается в выходной, первый день будет в понедельник. Первый повтор виден в форме и подтверждении сохранения. Диапазон без подходящих дат сохранить нельзя.',
    ),
    w.seriesHint,
    t(
      'Completion, spent minutes, skip and move apply to the selected occurrence. Tomorrow remains independent. Deletion can target one day or the whole series. Stopping removes future generation while retaining recorded history; resuming restores the series. Monthly repeats on the 31st skip months without that day. A rule exceeding calculation limits shows a warning; simplify it or shorten its range.',
      'Завершение, минуты, пропуск и перенос относятся к выбранному повтору. Следующий день остаётся независимым. Можно удалить один повтор или всю серию. Остановка убирает будущие повторы, сохраняя историю; возобновление возвращает серию. Ежемесячные повторы на 31-е пропускают месяцы без этого дня. Если правило превышает предел расчёта, появится предупреждение: упростите правило или сократите диапазон.',
    ),
  ]);
  const legend = section(t('Colors and icons', 'Цвета и значки'), [
    t(
      'Task colors describe workflow status. Shades are darker in the light theme, with the same meaning. Red overdue labels identify unfinished work past its deadline; they do not mark it Failed. Project deadline cards use the theme accent.',
      'Цвет задачи обозначает статус работы. В светлой теме оттенки темнее, но значения те же. Красная подпись «Просрочено» отмечает незакрытую задачу с истёкшим сроком и не переводит её в «Не выполнено». Карточки сроков проектов используют акцент темы.',
    ),
    t(
      'Continuation marks between start and deadline inherit the task color and strikethrough. They have no checkbox or separate workload; the empty checkbox gutter keeps their titles aligned. Normal priority has no marker. Filter dots show which calendar filters are enabled; they are not task status indicators.',
      'Промежуточные отметки между стартом и дедлайном наследуют цвет и зачёркивание задачи. У них нет чекбокса и отдельной нагрузки; пустой отступ под чекбокс выравнивает названия. Обычный приоритет не имеет маркера. Точки на кнопках фильтров показывают, какие фильтры включены, и не обозначают статус задачи.',
    ),
  ]);
  legend.classList.add('tp-manual-legend');
  const key = el(legend, 'dl', 'tp-manual-key');
  const addKey = (label: string, description: string, icon = '', symbol = '') => {
    const row = el(key, 'div', 'tp-manual-key-entry');
    const term = el(row, 'dt');
    const mark = el(term, 'span', 'tp-manual-symbol', symbol);
    mark.setAttribute('aria-hidden', 'true');
    if (icon) setIcon(mark, icon);
    el(term, 'span', '', label);
    el(row, 'dd', '', description);
    return mark;
  };
  const colors = {
    backlog: t('Gray — postponed work.', 'Серый — отложенная задача.'),
    todo: t(
      'Blue / cyan — planned work awaiting action.',
      'Голубой / синий — задача запланирована и ожидает выполнения.',
    ),
    'in-progress': t(
      'Yellow / amber — work in progress, independently of priority.',
      'Жёлтый / янтарный — задача в работе, независимо от приоритета.',
    ),
    done: t(
      'Green and strikethrough — completed work.',
      'Зелёный и зачёркнутое название — выполненная задача.',
    ),
    failed: t(
      'Red / pink and strikethrough — failed work.',
      'Красный / розовый и зачёркнутое название — задача не выполнена.',
    ),
  };
  for (const status of STATUSES) {
    const mark = addKey(w[status], colors[status]);
    mark.dataset.status = status;
    mark.classList.add('tp-manual-swatch');
    mark.style.backgroundColor = `var(--tp-status-${status})`;
  }
  addKey(
    w.highPriority,
    t(
      'Red outlined exclamation mark — high priority.',
      'Красный восклицательный знак в рамке — высокий приоритет.',
    ),
    '',
    '!',
  ).dataset.priority = 'high';
  addKey(
    w.lowPriority,
    t(
      'White outlined down arrow — low priority.',
      'Белая стрелка вниз в рамке — низкий приоритет.',
    ),
    '',
    '↓',
  ).dataset.priority = 'low';
  addKey(
    t('Task checkbox', 'Чекбокс задачи'),
    t(
      'An empty circle is open work, a check marks completion and an X marks failure. Click to complete or reopen.',
      'Пустой круг — открытая задача, галочка — выполненная, крестик — не выполненная. Нажатие завершает или возвращает задачу в план.',
    ),
    'circle',
  );
  addKey(
    w.meeting,
    t('People icon — Meeting task type.', 'Значок людей — тип задачи «Встреча».'),
    'users-round',
  );
  addKey(
    w.payment,
    t(
      'Dollar sign — Payment task type; the amount uses its saved currency.',
      'Знак $ — тип задачи «Платёж»; сумма отображается в сохранённой валюте.',
    ),
    '',
    '$',
  );
  addKey(
    t('Status task type', 'Тип «Статус»'),
    t(
      'Flag — the task type, separate from its workflow status.',
      'Флажок — тип задачи, отдельно от её статуса выполнения.',
    ),
    'flag',
  );
  addKey(
    w.deadline,
    t(
      'Calendar with a clock — the final deadline card.',
      'Календарь с часами — конечная карточка дедлайна.',
    ),
    'calendar-clock',
  );
  addKey(
    w.repeat,
    t('Circular arrows — a recurring task.', 'Круговые стрелки — повторяющаяся задача.'),
    'repeat',
  );
  addKey(
    w.description,
    t(
      'Document beside the title — a saved description; open the title to read or edit it.',
      'Документ рядом с названием — у задачи есть описание; нажмите название, чтобы прочитать или изменить его.',
    ),
    'file-text',
  );
  addKey(
    w.estimate,
    t(
      'Clock beside minutes — estimated or planned time, not a running timer.',
      'Часы рядом с минутами — оценка или план времени, а не работающий таймер.',
    ),
    '',
    '◷',
  );
  addKey(
    t('Recorded time', 'Затраченное время'),
    t(
      'Check beside minutes — recorded spent time, separate from task completion.',
      'Галочка рядом с минутами — записанное фактическое время, отдельно от отметки выполнения задачи.',
    ),
    '',
    '✓',
  );
  addKey(
    w.unestimated,
    t(
      'Question mark in daily workload — tasks without a time estimate; the number counts them.',
      'Вопросительный знак в нагрузке дня — задачи без оценки времени; число показывает их количество.',
    ),
    '',
    '?',
  );
  addKey(
    w.taskDetails,
    t(
      'Vertical ellipsis — reveal context and actions in Minimal view.',
      'Вертикальное многоточие — раскрыть подробности и действия в минималистичном виде.',
    ),
    'ellipsis-vertical',
  );
  addKey(
    w.fail,
    t(
      'Crossed circle in the action row — mark failure or return the task to the plan.',
      'Круг с крестиком в действиях — отметить невыполнение или вернуть задачу в план.',
    ),
    'circle-x',
  );
  addKey(
    w.reschedule,
    t('Calendar in the action row — reschedule.', 'Календарь в действиях — перенести задачу.'),
    'calendar-days',
  );
  addKey(
    w.note,
    t(
      'Document button in the action row — open the Markdown note.',
      'Кнопка документа в действиях — открыть Markdown-заметку.',
    ),
    'file-text',
  );
  addKey(
    w.remove,
    t(
      'Trash — delete using the plugin deletion dialog.',
      'Корзина — удалить через диалог плагина.',
    ),
    'trash-2',
  );
  section(t('Lists, calendar and boards', 'Списки, календарь и доски'), [
    w.help,
    w.boardHelp,
    w.boardPeriodHint,
    t(
      'Day, Week and Month show the chosen work days and the separate deadline. Subtle continuation marks link start and deadline without checkboxes, work sessions or additional workload; clicking one edits the original task. Date sets the primary work day. Additional dates already saved in the note’s workDates field remain visible and are preserved when editing the task. Deadline-only cards appear at the bottom of their day without a separate lane. Expanded names and project labels wrap in full; area/project context is included; no tasks are hidden behind count buttons. Dragging a work day moves only that session; dragging a deadline moves only the deadline. A task still has one status and one total of spent minutes. Extra work days cannot be combined with a recurrence rule.',
      'Режимы «День», «Неделя» и «Месяц» показывают выбранные дни работы и отдельный дедлайн. Между стартом и дедлайном видны приглушённые отметки без чекбоксов и дополнительной нагрузки. Нажатие открывает исходную задачу. Поле «Дата» задаёт основной рабочий день. Дополнительные даты, уже сохранённые в поле workDates заметки, остаются видимыми и сохраняются при редактировании задачи. Карточка отдельного дедлайна находится внизу дня, без дополнительной полосы. После раскрытия название и проект видны полностью; сфера показана рядом с проектом; задач под кнопками с количеством нет. Перетаскивание рабочего дня переносит только его, а дедлайна — только срок. Статус и фактически затраченные минуты остаются общими для задачи. Дополнительные дни нельзя совмещать с правилом повторения.',
    ),
    t(
      'Hide completed, Hide failed and Hide recurring independently filter calendar cards. Day, Week and Month share these choices while the view stays open. Task status, planned load, time, expenses and subscription forecasts remain unchanged.',
      '«Скрыть выполненные», «Скрыть проваленные» и «Скрыть повторяющиеся» независимо скрывают карточки календаря. Выбор сохраняется для дня, недели и месяца, пока открыт этот вид планировщика. Статусы, плановая нагрузка, время, расходы и прогноз подписок не меняются.',
    ),
  ]);
  section(t('Planned workload', 'Плановая нагрузка'), [
    t(
      'Estimated time estimates the whole task and stays separate from manually recorded spent minutes. Open cards show Estimate: 3 h or Estimate: 1 h 30 min. Completed work shows Plan and, when positive spent minutes are recorded, Spent, in lists, the calendar and boards. Missing estimates and unrecorded spent time are omitted. Recurring work uses its selected occurrence’s spent minutes. The estimate is divided equally across its selected work days; rounding preserves the exact total. With no work days, the estimate belongs to the deadline. A recurring occurrence receives its own full estimate. Completed and failed work, payments and subscriptions are excluded from planned load. Unknown estimates are counted separately. Daily capacity defaults to 480 minutes and can be changed in Settings; zero means no available time. Day and Today show planned time and available daily time with separate labels. Week and Month show estimated time, tasks without estimates and overloaded days. Repeated sessions of the same one-off task count once in the unknown-estimate total; recurring occurrences count separately. An empty estimate is shown as unknown, with no empty progress bar. Moving or reopening work recomputes the load without altering spent minutes.',
      'Оценка времени относится ко всей задаче и отделена от фактически затраченного времени. У открытых задач она показана кратко: «Оценка: 3 ч» или «Оценка: 1 ч 30 мин». У выполненных задач в списках, календаре и на досках показан «План» и, если введено положительное затраченное время, «Потрачено». Если оценка или затраченное время не указаны, соответствующая подпись не показывается. Для повторов берутся минуты выбранного выполнения. Оценка распределяется поровну между выбранными днями работы с сохранением точной суммы. Если рабочих дней нет, оценка относится к дедлайну. Для каждого повтора используется полная оценка. Выполненные и не выполненные дела, платежи и подписки в нагрузку не входят; задачи без оценки учитываются отдельно. В настройках доступно время на день: по умолчанию 480 минут, ноль означает отсутствие свободного времени. «День» и «Сегодня» показывают план и доступное время с отдельными подписями. В неделе и месяце видны оценённое время, задачи без оценки и дни с перегрузкой. Одна задача с несколькими рабочими днями считается один раз в общем числе задач без оценки; повторы считаются отдельно. Пустая оценка отображается как неизвестная, без пустого прогресс-бара. Перенос и переоткрытие обновляют нагрузку, сохраняя фактически затраченные минуты.',
    ),
  ]);
  section(t('Statistics', 'Статистика'), [
    t(
      'The period selector uses the current calendar week, month, quarter or year and is shared by work statistics, financial statistics and Payments. The full date range stays beneath the period buttons; today’s date sits beside the header actions. Dates in expense and budget panels belong to their headings. Work results and time are reported for that period; Overall statistics and project progress are explicitly marked All time. Spending shows every currency at once in separate line charts with the same dates and independent monetary scales. Zero days are retained; exact daily values for all currencies are available together.',
      'Выбор периода означает текущие календарные неделю, месяц, квартал или год и общий для деловой статистики, финансовой статистики и платежей. Полный диапазон дат расположен под кнопками периода, а сегодняшняя дата — рядом с действиями в шапке. В расходах и бюджетах даты входят в заголовки соответствующих блоков. Результаты дел и затраченное время относятся к выбранному периоду; общая статистика и прогресс проектов отмечены как «За всё время». Расходы во всех валютах показаны одновременно: у каждой валюты свой график с одинаковыми датами и отдельной денежной шкалой. Дни без оплат сохранены; точные суммы по всем валютам доступны вместе в данных по дням.',
    ),
    w.statsHelp,
    w.statsTimeHelp,
    w.periodRangeHelp,
    t(
      'Completion and failed-task counts use separate lines on one scale. Closed minutes have their own line chart. Every date in the selected period is retained, including zero-value days. Quarters group days by week; years group by month. Sparse horizontal date labels keep the charts readable; exact daily numbers remain in the expandable table.',
      'Количество выполненных и не выполненных дел показано отдельными линиями на одной шкале. Минуты закрытых дел — отдельной линейной диаграммой. Сохраняются все даты выбранного периода, включая нулевые дни. В квартале дни объединяются по неделям, в году — по месяцам. Подписи дат расположены горизонтально с промежутками; точные дневные значения доступны в раскрывающейся таблице.',
    ),
    t(
      'Work statistics exclude payments and subscriptions. Expenses is for entering, editing and undoing payments, planning and subscription management. Financial statistics show totals, daily spending and project allocation without duplicating transaction lists. Actual spending uses the payment date. All currency charts remain visible; the currency selector applies only to the project breakdown. Currencies are never added together or converted.',
      'В разделе «Дела» платежи и подписки исключены. «Расходы» — внесение и изменение оплат, план и управление подписками. «Финансы» — итоги, динамика и распределение по проектам без повторения списков оплат. Фактические траты учитываются по дате оплаты. Графики всех валют видны одновременно; выбор валюты относится только к распределению по проектам. Разные валюты не складываются и не конвертируются.',
    ),
  ]);
  section(t('Budgets', 'Бюджеты'), [
    t(
      'Set an optional monthly budget and currency when editing an area or project, or choose a scope in Statistics → Finances → Budgets. An empty limit disables the budget; zero remains a valid limit. The selected current calendar month uses that limit, a quarter uses three monthly limits, and a year uses twelve. A week is prorated by the actual number of days in each month. Spent uses actual payment dates; Planned includes outstanding payment tasks and unrecorded subscription charges in that period. Remaining is the limit minus spent; After planned payments also subtracts the forecast. Area budgets include all linked projects. Area and project limits are independent and are never summed into a shared total. Other currencies and missing prices are flagged; no currency conversion occurs. The operational payment lists remain in Expenses.',
      'Месячный бюджет и валюту можно задать в форме сферы или проекта либо выбрать объект в «Статистика → Финансы → Бюджеты». Пустая сумма отключает бюджет; ноль — допустимый лимит. Текущий месяц использует этот лимит, квартал — три месячных лимита, год — двенадцать. Лимит недели рассчитывается пропорционально числу дней в соответствующих месяцах. Факт относится к дате оплаты; план включает открытые платежи и ещё не записанные списания подписок за выбранный период. Остаток — лимит минус факт; «После запланированных оплат» также вычитает план. В бюджет сферы входят все связанные проекты. Лимиты сферы и проекта независимы и не складываются в общий итог. Другие валюты и неизвестные суммы отмечены отдельно, конвертации нет. Списки оплат остаются в «Расходах».',
    ),
  ]);
  section(w.subscriptions, [
    t(
      'Expenses has two sections: Payments for upcoming payments and paid expenses, and Subscriptions for recurring cost settings. Payments to review groups overdue, undated and unsuccessful payments. The subscription catalog and monthly cost estimate do not depend on the report period. Add expense and Add subscription open their respective sections.',
      'В «Расходах» два раздела: «Платежи» — предстоящие платежи и оплаченные расходы; «Подписки» — настройки регулярных списаний. В блоке «Требуют внимания» собраны просроченные платежи, записи без даты и неоплаченные задачи. Список подписок и их стоимость в месяц не зависят от периода отчёта. «Добавить расход» и «Добавить подписку» открывают соответствующий раздел.',
    ),
    w.expensesHelp,
    w.paymentHelp,
    w.chargeHelp,
    w.subscriptionHelp,
    w.subscriptionCatalogHelp,
    t(
      'Active subscriptions appear in a separate payment section at the bottom of each calendar day. First payment anchors a monthly or yearly forecast; missing month days use the last day without changing the anchor. Future dates show the full billing amount, not the monthly average. Cancelled or undated subscriptions have no calendar forecast. Subscriptions remain excluded from work lists, boards, task progress and time statistics. The cards show the next payment date; cancellation and resumption support Undo.',
      'Активные подписки показаны отдельно внизу каждого дня календаря. Дата первого платежа задаёт ежемесячный или ежегодный прогноз. Если нужного числа нет, используется последний день месяца без изменения исходной даты. Будущие списания показывают полную сумму платежа, а не среднее за месяц. У отменённых подписок и подписок без даты прогноза нет. Они не входят в списки задач, доски, прогресс и учёт времени. На карточке видна дата следующего платежа; отмену и возобновление подписки можно отменить.',
    ),
  ]);
  section(t('Data and legacy import', 'Данные и импорт'), [
    t(
      'Data lives in Obsidian Markdown notes. New areas, projects and tasks default to Planner/Areas, Planner/Projects and Planner/Tasks; settings choose the folder and language. Dataview and TaskNotes are unnecessary. The plugin works locally without an account or telemetry. Collaboration depends on your vault and synchronization.',
      'Данные хранятся в обычных Markdown-заметках Obsidian. По умолчанию новые сферы, проекты и задачи создаются в Planner/Areas, Planner/Projects и Planner/Tasks. Папка и язык меняются в настройках. Dataview и TaskNotes не нужны. Плагин работает локально, без аккаунта и телеметрии. Совместная работа зависит от синхронизации вашего хранилища.',
    ),
    w.importText,
  ]);
  section(t('About', 'О плагине'), [
    `${t('Author', 'Автор')}: ${author}.`,
    ...(version ? [`${t('Version', 'Версия')}: ${version}.`] : []),
    t(
      'MIT license. The source archive includes code, tests and a detailed guide.',
      'Лицензия MIT. Архив исходников содержит код, тесты и подробное руководство.',
    ),
  ]);
}
