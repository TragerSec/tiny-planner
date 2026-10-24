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
      'Areas group projects; projects group tasks. Tasks without a recognized project appear in Inbox. Create a task with just a title and add details later.',
      'Сферы объединяют проекты, проекты — задачи. Задачи без распознанного проекта попадают во «Входящие». Для создания задачи достаточно названия; остальное можно добавить позже.',
    ),
  ]);
  section(t('Filters, deletion and closed work', 'Фильтры, удаление и закрытые задачи'), [
    t(
      'Filters beside search narrow the displayed list by area or project. Remove a filter label or clear all filters. The project field in quick entry assigns the new task; it does not filter the list.',
      '«Фильтры» рядом с поиском отбирают записи по сфере и проекту. Снимите отдельную метку или сбросьте отбор. Проект в строке добавления назначается новой задаче и не фильтрует список.',
    ),
    t(
      'Deleting an area or project preserves linked notes. Undo restores the deleted note and its links. Failed overdue work stays in history rather than returning to Today.',
      'Удаление сферы или проекта сохраняет связанные заметки. Отмена восстанавливает удалённую заметку и связи. Просроченные задачи со статусом «Не выполнено» остаются в истории и не возвращаются в «Сегодня».',
    ),
  ]);
  section(t('Capture, dates and time', 'Добавление задач, даты и время'), [
    t(
      'Enter a title and press Enter or +. Options reveals quick-entry fields; the sliders button opens the full form. Click a task title to edit it. Contact means writing or calling someone.',
      'Введите название и нажмите Enter или +. «Параметры» раскрывают дополнительные поля, кнопка с ползунками открывает полную форму. Нажмите название для редактирования. Тип «Связаться» — написать или позвонить человеку.',
    ),
    t(
      'Description holds the brief; Result records the outcome. Both support multiline text. Optional sections open when needed, and up to 20 recent form drafts can be recovered. Date format and language are in settings; task time is optional.',
      '«Описание» — вводные, «Результат» — итог. Оба поля многострочные. Дополнительные секции раскрываются по необходимости; сохраняется до 20 последних черновиков форм. Язык и формат дат меняются в настройках; время задачи необязательно.',
    ),
  ]);
  section(t('Statuses and Undo', 'Статусы и отмена действий'), [
    t(
      'Backlog, To do and In progress are open work; Done and Failed are closed. Click the check to complete or reopen. Undo retains 50 changes in the current session, except creation and import, and refuses conflicting external edits.',
      '«Отложено», «К выполнению» и «В работе» — открытые задачи; «Выполнено» и «Не выполнено» — закрытые. Галочка завершает или переоткрывает задачу. Отмена хранит 50 изменений текущей сессии, кроме создания и импорта, и защищает внешние правки.',
    ),
  ]);
  section(t('Repeats and series end', 'Повторы и завершение серии'), [
    t(
      'Choose a repeat preset or configure intervals, weekdays and a count; preview dates before saving. Advanced RRULE is also available. Repeat through includes its last day. Status, result, spent time and moves belong to each occurrence separately.',
      'Выберите готовый повтор или настройте интервал, дни недели и количество; проверьте ближайшие даты перед сохранением. Доступно и правило RRULE. «Повторять по» включает последний день. Статус, результат, затраченное время и переносы у каждого выполнения отдельные.',
    ),
    t(
      'Stopping a series preserves recorded history. Deletion offers one occurrence or the whole series.',
      'Завершение серии сохраняет записанную историю. При удалении можно выбрать одно выполнение или всю серию.',
    ),
  ]);
  const legend = section(t('Colors and icons', 'Цвета и значки'), [
    t(
      'Status colors mark the task accents. Closed titles are muted and crossed out. An overdue label marks unfinished work past its deadline; it does not change its status.',
      'Цвет статуса виден на акцентах задачи. Названия закрытых задач приглушены и зачёркнуты. «Просрочено» отмечает незавершённую задачу с истёкшим сроком, не меняя её статус.',
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
      'Green accent — completed work; muted, crossed-out title.',
      'Зелёный акцент — выполнено; название приглушено и зачёркнуто.',
    ),
    failed: t(
      'Red / pink accent — failed work; muted, crossed-out title.',
      'Красный / розовый акцент — не выполнено; название приглушено и зачёркнуто.',
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
    w.contact,
    t(
      'Message icon — write or call someone.',
      'Значок сообщения — написать или позвонить человеку.',
    ),
    'message-circle',
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
    t(
      'Day, Week and Month show work dates and deadlines. Dragging a work card moves that session; dragging the final deadline card moves the deadline. Planning adds work days and splits the estimate between them. Boards change task status.',
      '«День», «Неделя» и «Месяц» показывают рабочие даты и дедлайны. Перенос рабочей карточки меняет этот день, конечной карточки — дедлайн. «Планирование» добавляет рабочие дни и распределяет оценку времени. Доски помогают менять статус задач.',
    ),
    t(
      'Full titles wrap without truncation. Wide calendars align multi-day tasks; narrow panes use an agenda. Continuation cards add no workload. Display controls details, task visibility and the optional three-entry Month overview; Show more opens the full day.',
      'Названия переносятся полностью. В широком календаре многодневные задачи выровнены по строкам, в узком показана повестка. Промежуточные карточки не добавляют нагрузку. «Отображение» управляет подробностями, видимостью задач и лимитом в три записи на день месяца; «Показать ещё» открывает весь день.',
    ),
    t(
      'In Month, a small underline marks the current week. Weekends use only a subtle text color; today has its own marker. Daily workload bars remain visible across all weeks. Click the period title to jump to a date.',
      'В месяце текущая неделя отмечена короткой линией под датами. Выходные отличаются только оттенком текста, у сегодняшнего дня свой маркер. Полоски нагрузки видны во всех неделях. Нажмите название периода для перехода к дате.',
    ),
  ]);
  section(t('Planned workload', 'Плановая нагрузка'), [
    t(
      'The estimate is planned time; Spent is recorded manually. A one-off estimate is divided between work days, while each repeat gets its full estimate. Closed work, payments and subscriptions do not add planned load. Missing estimates are counted separately.',
      'Оценка — план времени; затраченное время вводится вручную. Оценка обычной задачи делится между рабочими днями, у каждого повтора она полная. Закрытые задачи, платежи и подписки не увеличивают плановую нагрузку. Задачи без оценки учитываются отдельно.',
    ),
    t(
      'Daily capacity defaults to 480 minutes and is configurable. Open the time indicator for details; red indicates overload. Reopening preserves the recorded result and spent time.',
      'Доступное время по умолчанию — 480 минут в день; его можно изменить в настройках. Нажмите показатель времени для подробностей; красный означает перегрузку. Переоткрытие сохраняет результат и записанное время.',
    ),
  ]);
  section(t('Statistics', 'Статистика'), [
    t(
      'Week, Month, Quarter and Year cover the current calendar period. Overall statistics cover all time; exact values are in collapsed details. Closing old work credits its planned reporting date. Payments and subscriptions are excluded from work metrics.',
      '«Неделя», «Месяц», «Квартал» и «Год» — текущие календарные периоды. Общая статистика охватывает всё время; точные значения доступны в раскрывающихся подробностях. Закрытие старой задачи учитывается по её плановой отчётной дате. Платежи и подписки не входят в показатели дел.',
    ),
    t(
      'Financial reports use actual payment dates. Each currency stays separate; currencies are never converted or summed.',
      'Финансовые отчёты используют фактические даты оплаты. Каждая валюта показана отдельно, без конвертации и сложения разных валют.',
    ),
  ]);
  section(t('Budgets', 'Бюджеты'), [
    t(
      'Set a monthly limit and currency in an area or project, or in financial statistics. Empty disables the limit; zero is valid. Remaining subtracts spending; After planned payments also subtracts the forecast. Area and project budgets stay independent.',
      'Задайте месячный лимит и валюту в сфере, проекте или финансовой статистике. Пустой лимит отключён; ноль допустим. Остаток учитывает расходы, «После запланированных оплат» — ещё и прогноз. Бюджеты сфер и проектов независимы.',
    ),
  ]);
  section(w.subscriptions, [
    t(
      'Expenses contains Payments and Subscriptions. Record a payment to update paid history. Subscription settings define recurring forecasts; cancelled or undated subscriptions have no calendar forecast. Annual charges show the full payment, while monthly cost uses the yearly amount divided by twelve.',
      'В «Расходах» есть «Платежи» и «Подписки». Запишите оплату для добавления в историю. Настройки подписки задают прогноз списаний; отменённые подписки и записи без даты в прогноз не входят. Годовое списание показано полностью, стоимость в месяц — как годовая сумма, делённая на двенадцать.',
    ),
  ]);
  section(t('Data and legacy import', 'Данные и импорт'), [
    t(
      'Notes stay in your vault; new notes default to Planner. Settings choose the folder and language. The plugin works offline without accounts or telemetry. Legacy import copies supported notes without changing originals; vault sync is managed by Obsidian.',
      'Заметки остаются в хранилище; новые по умолчанию создаются в Planner. Папка и язык меняются в настройках. Плагин работает офлайн, без аккаунта и телеметрии. Импорт копирует поддерживаемые старые заметки, сохраняя оригиналы; синхронизацией хранилища управляет Obsidian.',
    ),
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
