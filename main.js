/* Tiny Planner — MIT. Generated from src/main.ts.
# Bundled dependencies

## rrule 2.8.1 (BSD-3-Clause)

Tiny Planner bundles a local guarded copy. Only the iterator is modified: a 20,000-period budget and a boundary check before empty-candidate filtering. See vendor/rrule/README.md in the source distribution.

rrule.js: Library for working with recurrence rules for calendar dates.
=======================================================================

Copyright 2010, Jakub Roztocil <jakub@roztocil.name> and Lars Schöning

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice,
       this list of conditions and the following disclaimer.

    2. Redistributions in binary form must reproduce the above copyright
       notice, this list of conditions and the following disclaimer in the
       documentation and/or other materials provided with the distribution.

    3. Neither the name of The author nor the names of its contributors may
       be used to endorse or promote products derived from this software
       without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE AUTHOR AND CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.



./rrule.js and ./test/tests.js is based on python-dateutil. LICENCE:

python-dateutil - Extensions to the standard Python datetime module.
====================================================================

Copyright (c) 2003-2011 - Gustavo Niemeyer <gustavo@niemeyer.net>
Copyright (c) 2012 - Tomi Pieviläinen <tomi.pievilainen@iki.fi>

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the copyright holder nor the names of its
      contributors may be used to endorse or promote products derived from
      this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


## tslib (ISC / BSD-0-Clause notices)

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** * /


Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
*/
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TinyPlanner
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/services/repository.ts
var import_obsidian = require("obsidian");

// src/core/model.ts
var STATUSES = ["backlog", "todo", "in-progress", "done", "failed"];
function isActive(status) {
  return status !== "done" && status !== "failed";
}
var SCHEMA = 1;
var TERMINAL = /* @__PURE__ */ new Set(["done", "failed"]);
function normalizeStatus(value) {
  const s = String(value ?? "todo").trim().toLowerCase().replace(/[ _]+/g, "-");
  if (["done", "completed", "complete", "cancelled", "canceled"].includes(s)) return "done";
  if (["failed", "failure"].includes(s)) return "failed";
  if (["archived", "archive"].includes(s)) return "done";
  if (["backlog", "paused", "on-hold"].includes(s)) return "backlog";
  if (s === "active") return "in-progress";
  if (["in-progress", "inprogress"].includes(s)) return "in-progress";
  return "todo";
}
function strings(value) {
  if (value == null) return [];
  const entries = Array.isArray(value) ? value : [value];
  return entries.map(
    (v) => typeof v === "object" && v !== null && "path" in v ? String(v.path) : String(v)
  );
}
function link(value) {
  return strings(value)[0]?.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0]?.split("#")[0]?.trim() ?? "";
}
function title(fm, path) {
  return String(fm.title || path.split("/").pop()?.replace(/\.md$/i, "") || "Untitled");
}
function safeMinutes(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

// src/core/dates.ts
var pad = (n) => String(n).padStart(2, "0");
function day(date = /* @__PURE__ */ new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function dateKey(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.valueOf())) return "";
    value = value.toISOString();
  }
  const s = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = /* @__PURE__ */ new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s ? s : "";
}
function utc(key) {
  return /* @__PURE__ */ new Date(`${key}T00:00:00Z`);
}
function addDays(key, amount) {
  const d = utc(key);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
function distance(a, b) {
  return Math.round((utc(b).valueOf() - utc(a).valueOf()) / 864e5);
}
function shiftMonth(key, amount) {
  const d = utc(key.slice(0, 7) + "-01");
  d.setUTCMonth(d.getUTCMonth() + amount);
  return d.toISOString().slice(0, 10);
}
function monthGrid(key) {
  const first = key.slice(0, 7) + "-01";
  const start = addDays(first, -((utc(first).getUTCDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
function formatDate(key, format = "dmy") {
  if (!dateKey(key)) return "";
  const [y, m, d] = key.split("-");
  return format === "iso" ? key : format === "mdy" ? `${m}/${d}/${y}` : `${d}.${m}.${y}`;
}
function parseDate(text, format = "dmy") {
  const value = text.trim();
  if (!value) return "";
  if (/^\d{8}$/.test(value)) {
    const year2 = format === "iso" ? value.slice(0, 4) : value.slice(4);
    const month = format === "iso" ? value.slice(4, 6) : format === "mdy" ? value.slice(0, 2) : value.slice(2, 4);
    const date = format === "iso" ? value.slice(6) : format === "mdy" ? value.slice(2, 4) : value.slice(0, 2);
    return dateKey(`${year2}-${month}-${date}`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return dateKey(value);
  const match = value.match(
    format === "mdy" ? /^(\d{2})\/(\d{2})\/(\d{4})$/ : /^(\d{2})\.(\d{2})\.(\d{4})$/
  );
  if (!match || format === "iso") return "";
  const [, first, second, year] = match;
  return dateKey(
    `${year}-${format === "mdy" ? first : second}-${format === "mdy" ? second : first}`
  );
}
function timeKey(value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  const text = /^\d{3,4}$/.test(raw) ? `${raw.slice(0, -2)}:${raw.slice(-2)}` : raw;
  const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}
function calendarPeriod(today, period) {
  if (period === 7) {
    const from2 = addDays(today, -((utc(today).getUTCDay() + 6) % 7));
    return { from: from2, to: addDays(from2, 6) };
  }
  const year = today.slice(0, 4);
  const month = Number(today.slice(5, 7));
  const from = period === 365 ? `${year}-01-01` : period === 90 ? `${year}-${pad(Math.floor((month - 1) / 3) * 3 + 1)}-01` : `${year}-${pad(month)}-01`;
  return { from, to: addDays(shiftMonth(from, period === 365 ? 12 : period === 90 ? 3 : 1), -1) };
}
function periodDates(today, period) {
  const { from, to } = calendarPeriod(today, period);
  return Array.from({ length: distance(from, to) + 1 }, (_, i) => addDays(from, i));
}

// vendor/rrule/weekday.js
var ALL_WEEKDAYS = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU"
];
var Weekday = (
  /** @class */
  (function() {
    function Weekday2(weekday, n) {
      if (n === 0)
        throw new Error("Can't create weekday with n == 0");
      this.weekday = weekday;
      this.n = n;
    }
    Weekday2.fromStr = function(str) {
      return new Weekday2(ALL_WEEKDAYS.indexOf(str));
    };
    Weekday2.prototype.nth = function(n) {
      return this.n === n ? this : new Weekday2(this.weekday, n);
    };
    Weekday2.prototype.equals = function(other) {
      return this.weekday === other.weekday && this.n === other.n;
    };
    Weekday2.prototype.toString = function() {
      var s = ALL_WEEKDAYS[this.weekday];
      if (this.n)
        s = (this.n > 0 ? "+" : "") + String(this.n) + s;
      return s;
    };
    Weekday2.prototype.getJsWeekday = function() {
      return this.weekday === 6 ? 0 : this.weekday + 1;
    };
    return Weekday2;
  })()
);

// vendor/rrule/helpers.js
var isPresent = function(value) {
  return value !== null && value !== void 0;
};
var isNumber = function(value) {
  return typeof value === "number";
};
var isWeekdayStr = function(value) {
  return typeof value === "string" && ALL_WEEKDAYS.includes(value);
};
var isArray = Array.isArray;
var range = function(start, end) {
  if (end === void 0) {
    end = start;
  }
  if (arguments.length === 1) {
    end = start;
    start = 0;
  }
  var rang = [];
  for (var i = start; i < end; i++)
    rang.push(i);
  return rang;
};
var repeat = function(value, times) {
  var i = 0;
  var array = [];
  if (isArray(value)) {
    for (; i < times; i++)
      array[i] = [].concat(value);
  } else {
    for (; i < times; i++)
      array[i] = value;
  }
  return array;
};
var toArray = function(item) {
  if (isArray(item)) {
    return item;
  }
  return [item];
};
function padStart(item, targetLength, padString) {
  if (padString === void 0) {
    padString = " ";
  }
  var str = String(item);
  targetLength = targetLength >> 0;
  if (str.length > targetLength) {
    return String(str);
  }
  targetLength = targetLength - str.length;
  if (targetLength > padString.length) {
    padString += repeat(padString, targetLength / padString.length);
  }
  return padString.slice(0, targetLength) + String(str);
}
var split = function(str, sep, num) {
  var splits = str.split(sep);
  return num ? splits.slice(0, num).concat([splits.slice(num).join(sep)]) : splits;
};
var pymod = function(a, b) {
  var r = a % b;
  return r * b < 0 ? r + b : r;
};
var divmod = function(a, b) {
  return { div: Math.floor(a / b), mod: pymod(a, b) };
};
var empty = function(obj) {
  return !isPresent(obj) || obj.length === 0;
};
var notEmpty = function(obj) {
  return !empty(obj);
};
var includes = function(arr, val) {
  return notEmpty(arr) && arr.indexOf(val) !== -1;
};

// vendor/rrule/dateutil.js
var datetime = function(y, m, d, h, i, s) {
  if (h === void 0) {
    h = 0;
  }
  if (i === void 0) {
    i = 0;
  }
  if (s === void 0) {
    s = 0;
  }
  return new Date(Date.UTC(y, m - 1, d, h, i, s));
};
var MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var ONE_DAY = 1e3 * 60 * 60 * 24;
var MAXYEAR = 9999;
var ORDINAL_BASE = datetime(1970, 1, 1);
var PY_WEEKDAYS = [6, 0, 1, 2, 3, 4, 5];
var isLeapYear = function(year) {
  return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
};
var isDate = function(value) {
  return value instanceof Date;
};
var isValidDate = function(value) {
  return isDate(value) && !isNaN(value.getTime());
};
var daysBetween = function(date1, date2) {
  var date1ms = date1.getTime();
  var date2ms = date2.getTime();
  var differencems = date1ms - date2ms;
  return Math.round(differencems / ONE_DAY);
};
var toOrdinal = function(date) {
  return daysBetween(date, ORDINAL_BASE);
};
var fromOrdinal = function(ordinal) {
  return new Date(ORDINAL_BASE.getTime() + ordinal * ONE_DAY);
};
var getMonthDays = function(date) {
  var month = date.getUTCMonth();
  return month === 1 && isLeapYear(date.getUTCFullYear()) ? 29 : MONTH_DAYS[month];
};
var getWeekday = function(date) {
  return PY_WEEKDAYS[date.getUTCDay()];
};
var monthRange = function(year, month) {
  var date = datetime(year, month + 1, 1);
  return [getWeekday(date), getMonthDays(date)];
};
var combine = function(date, time) {
  time = time || date;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds()));
};
var clone = function(date) {
  var dolly = new Date(date.getTime());
  return dolly;
};
var cloneDates = function(dates) {
  var clones = [];
  for (var i = 0; i < dates.length; i++) {
    clones.push(clone(dates[i]));
  }
  return clones;
};
var sort = function(dates) {
  dates.sort(function(a, b) {
    return a.getTime() - b.getTime();
  });
};
var timeToUntilString = function(time, utc2) {
  if (utc2 === void 0) {
    utc2 = true;
  }
  var date = new Date(time);
  return [
    padStart(date.getUTCFullYear().toString(), 4, "0"),
    padStart(date.getUTCMonth() + 1, 2, "0"),
    padStart(date.getUTCDate(), 2, "0"),
    "T",
    padStart(date.getUTCHours(), 2, "0"),
    padStart(date.getUTCMinutes(), 2, "0"),
    padStart(date.getUTCSeconds(), 2, "0"),
    utc2 ? "Z" : ""
  ].join("");
};
var untilStringToDate = function(until) {
  var re = /^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/;
  var bits = re.exec(until);
  if (!bits)
    throw new Error("Invalid UNTIL value: ".concat(until));
  return new Date(Date.UTC(parseInt(bits[1], 10), parseInt(bits[2], 10) - 1, parseInt(bits[3], 10), parseInt(bits[5], 10) || 0, parseInt(bits[6], 10) || 0, parseInt(bits[7], 10) || 0));
};
var dateTZtoISO8601 = function(date, timeZone) {
  var dateStr = date.toLocaleString("sv-SE", { timeZone });
  return dateStr.replace(" ", "T") + "Z";
};
var dateInTimeZone = function(date, timeZone) {
  var localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  var dateInLocalTZ = new Date(dateTZtoISO8601(date, localTimeZone));
  var dateInTargetTZ = new Date(dateTZtoISO8601(date, timeZone !== null && timeZone !== void 0 ? timeZone : "UTC"));
  var tzOffset = dateInTargetTZ.getTime() - dateInLocalTZ.getTime();
  return new Date(date.getTime() - tzOffset);
};

// vendor/rrule/iterresult.js
var IterResult = (
  /** @class */
  (function() {
    function IterResult2(method, args) {
      this.minDate = null;
      this.maxDate = null;
      this._result = [];
      this.total = 0;
      this.method = method;
      this.args = args;
      if (method === "between") {
        this.maxDate = args.inc ? args.before : new Date(args.before.getTime() - 1);
        this.minDate = args.inc ? args.after : new Date(args.after.getTime() + 1);
      } else if (method === "before") {
        this.maxDate = args.inc ? args.dt : new Date(args.dt.getTime() - 1);
      } else if (method === "after") {
        this.minDate = args.inc ? args.dt : new Date(args.dt.getTime() + 1);
      }
    }
    IterResult2.prototype.accept = function(date) {
      ++this.total;
      var tooEarly = this.minDate && date < this.minDate;
      var tooLate = this.maxDate && date > this.maxDate;
      if (this.method === "between") {
        if (tooEarly)
          return true;
        if (tooLate)
          return false;
      } else if (this.method === "before") {
        if (tooLate)
          return false;
      } else if (this.method === "after") {
        if (tooEarly)
          return true;
        this.add(date);
        return false;
      }
      return this.add(date);
    };
    IterResult2.prototype.add = function(date) {
      this._result.push(date);
      return true;
    };
    IterResult2.prototype.getValue = function() {
      var res = this._result;
      switch (this.method) {
        case "all":
        case "between":
          return res;
        case "before":
        case "after":
        default:
          return res.length ? res[res.length - 1] : null;
      }
    };
    IterResult2.prototype.clone = function() {
      return new IterResult2(this.method, this.args);
    };
    return IterResult2;
  })()
);
var iterresult_default = IterResult;

// node_modules/tslib/tslib.es6.mjs
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function() {
  __assign = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}

// vendor/rrule/callbackiterresult.js
var CallbackIterResult = (
  /** @class */
  (function(_super) {
    __extends(CallbackIterResult2, _super);
    function CallbackIterResult2(method, args, iterator) {
      var _this = _super.call(this, method, args) || this;
      _this.iterator = iterator;
      return _this;
    }
    CallbackIterResult2.prototype.add = function(date) {
      if (this.iterator(date, this._result.length)) {
        this._result.push(date);
        return true;
      }
      return false;
    };
    return CallbackIterResult2;
  })(iterresult_default)
);
var callbackiterresult_default = CallbackIterResult;

// vendor/rrule/nlp/i18n.js
var ENGLISH = {
  dayNames: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ],
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ],
  tokens: {
    SKIP: /^[ \r\n\t]+|^\.$/,
    number: /^[1-9][0-9]*/,
    numberAsText: /^(one|two|three)/i,
    every: /^every/i,
    "day(s)": /^days?/i,
    "weekday(s)": /^weekdays?/i,
    "week(s)": /^weeks?/i,
    "hour(s)": /^hours?/i,
    "minute(s)": /^minutes?/i,
    "month(s)": /^months?/i,
    "year(s)": /^years?/i,
    on: /^(on|in)/i,
    at: /^(at)/i,
    the: /^the/i,
    first: /^first/i,
    second: /^second/i,
    third: /^third/i,
    nth: /^([1-9][0-9]*)(\.|th|nd|rd|st)/i,
    last: /^last/i,
    for: /^for/i,
    "time(s)": /^times?/i,
    until: /^(un)?til/i,
    monday: /^mo(n(day)?)?/i,
    tuesday: /^tu(e(s(day)?)?)?/i,
    wednesday: /^we(d(n(esday)?)?)?/i,
    thursday: /^th(u(r(sday)?)?)?/i,
    friday: /^fr(i(day)?)?/i,
    saturday: /^sa(t(urday)?)?/i,
    sunday: /^su(n(day)?)?/i,
    january: /^jan(uary)?/i,
    february: /^feb(ruary)?/i,
    march: /^mar(ch)?/i,
    april: /^apr(il)?/i,
    may: /^may/i,
    june: /^june?/i,
    july: /^july?/i,
    august: /^aug(ust)?/i,
    september: /^sep(t(ember)?)?/i,
    october: /^oct(ober)?/i,
    november: /^nov(ember)?/i,
    december: /^dec(ember)?/i,
    comma: /^(,\s*|(and|or)\s*)+/i
  }
};
var i18n_default = ENGLISH;

// vendor/rrule/nlp/totext.js
var contains = function(arr, val) {
  return arr.indexOf(val) !== -1;
};
var defaultGetText = function(id) {
  return id.toString();
};
var defaultDateFormatter = function(year, month, day2) {
  return "".concat(month, " ").concat(day2, ", ").concat(year);
};
var ToText = (
  /** @class */
  (function() {
    function ToText2(rrule, gettext, language, dateFormatter) {
      if (gettext === void 0) {
        gettext = defaultGetText;
      }
      if (language === void 0) {
        language = i18n_default;
      }
      if (dateFormatter === void 0) {
        dateFormatter = defaultDateFormatter;
      }
      this.text = [];
      this.language = language || i18n_default;
      this.gettext = gettext;
      this.dateFormatter = dateFormatter;
      this.rrule = rrule;
      this.options = rrule.options;
      this.origOptions = rrule.origOptions;
      if (this.origOptions.bymonthday) {
        var bymonthday = [].concat(this.options.bymonthday);
        var bynmonthday = [].concat(this.options.bynmonthday);
        bymonthday.sort(function(a, b) {
          return a - b;
        });
        bynmonthday.sort(function(a, b) {
          return b - a;
        });
        this.bymonthday = bymonthday.concat(bynmonthday);
        if (!this.bymonthday.length)
          this.bymonthday = null;
      }
      if (isPresent(this.origOptions.byweekday)) {
        var byweekday = !isArray(this.origOptions.byweekday) ? [this.origOptions.byweekday] : this.origOptions.byweekday;
        var days = String(byweekday);
        this.byweekday = {
          allWeeks: byweekday.filter(function(weekday) {
            return !weekday.n;
          }),
          someWeeks: byweekday.filter(function(weekday) {
            return Boolean(weekday.n);
          }),
          isWeekdays: days.indexOf("MO") !== -1 && days.indexOf("TU") !== -1 && days.indexOf("WE") !== -1 && days.indexOf("TH") !== -1 && days.indexOf("FR") !== -1 && days.indexOf("SA") === -1 && days.indexOf("SU") === -1,
          isEveryDay: days.indexOf("MO") !== -1 && days.indexOf("TU") !== -1 && days.indexOf("WE") !== -1 && days.indexOf("TH") !== -1 && days.indexOf("FR") !== -1 && days.indexOf("SA") !== -1 && days.indexOf("SU") !== -1
        };
        var sortWeekDays = function(a, b) {
          return a.weekday - b.weekday;
        };
        this.byweekday.allWeeks.sort(sortWeekDays);
        this.byweekday.someWeeks.sort(sortWeekDays);
        if (!this.byweekday.allWeeks.length)
          this.byweekday.allWeeks = null;
        if (!this.byweekday.someWeeks.length)
          this.byweekday.someWeeks = null;
      } else {
        this.byweekday = null;
      }
    }
    ToText2.isFullyConvertible = function(rrule) {
      var canConvert = true;
      if (!(rrule.options.freq in ToText2.IMPLEMENTED))
        return false;
      if (rrule.origOptions.until && rrule.origOptions.count)
        return false;
      for (var key in rrule.origOptions) {
        if (contains(["dtstart", "tzid", "wkst", "freq"], key))
          return true;
        if (!contains(ToText2.IMPLEMENTED[rrule.options.freq], key))
          return false;
      }
      return canConvert;
    };
    ToText2.prototype.isFullyConvertible = function() {
      return ToText2.isFullyConvertible(this.rrule);
    };
    ToText2.prototype.toString = function() {
      var gettext = this.gettext;
      if (!(this.options.freq in ToText2.IMPLEMENTED)) {
        return gettext("RRule error: Unable to fully convert this rrule to text");
      }
      this.text = [gettext("every")];
      this[RRule.FREQUENCIES[this.options.freq]]();
      if (this.options.until) {
        this.add(gettext("until"));
        var until = this.options.until;
        this.add(this.dateFormatter(until.getUTCFullYear(), this.language.monthNames[until.getUTCMonth()], until.getUTCDate()));
      } else if (this.options.count) {
        this.add(gettext("for")).add(this.options.count.toString()).add(this.plural(this.options.count) ? gettext("times") : gettext("time"));
      }
      if (!this.isFullyConvertible())
        this.add(gettext("(~ approximate)"));
      return this.text.join("");
    };
    ToText2.prototype.HOURLY = function() {
      var gettext = this.gettext;
      if (this.options.interval !== 1)
        this.add(this.options.interval.toString());
      this.add(this.plural(this.options.interval) ? gettext("hours") : gettext("hour"));
    };
    ToText2.prototype.MINUTELY = function() {
      var gettext = this.gettext;
      if (this.options.interval !== 1)
        this.add(this.options.interval.toString());
      this.add(this.plural(this.options.interval) ? gettext("minutes") : gettext("minute"));
    };
    ToText2.prototype.DAILY = function() {
      var gettext = this.gettext;
      if (this.options.interval !== 1)
        this.add(this.options.interval.toString());
      if (this.byweekday && this.byweekday.isWeekdays) {
        this.add(this.plural(this.options.interval) ? gettext("weekdays") : gettext("weekday"));
      } else {
        this.add(this.plural(this.options.interval) ? gettext("days") : gettext("day"));
      }
      if (this.origOptions.bymonth) {
        this.add(gettext("in"));
        this._bymonth();
      }
      if (this.bymonthday) {
        this._bymonthday();
      } else if (this.byweekday) {
        this._byweekday();
      } else if (this.origOptions.byhour) {
        this._byhour();
      }
    };
    ToText2.prototype.WEEKLY = function() {
      var gettext = this.gettext;
      if (this.options.interval !== 1) {
        this.add(this.options.interval.toString()).add(this.plural(this.options.interval) ? gettext("weeks") : gettext("week"));
      }
      if (this.byweekday && this.byweekday.isWeekdays) {
        if (this.options.interval === 1) {
          this.add(this.plural(this.options.interval) ? gettext("weekdays") : gettext("weekday"));
        } else {
          this.add(gettext("on")).add(gettext("weekdays"));
        }
      } else if (this.byweekday && this.byweekday.isEveryDay) {
        this.add(this.plural(this.options.interval) ? gettext("days") : gettext("day"));
      } else {
        if (this.options.interval === 1)
          this.add(gettext("week"));
        if (this.origOptions.bymonth) {
          this.add(gettext("in"));
          this._bymonth();
        }
        if (this.bymonthday) {
          this._bymonthday();
        } else if (this.byweekday) {
          this._byweekday();
        }
        if (this.origOptions.byhour) {
          this._byhour();
        }
      }
    };
    ToText2.prototype.MONTHLY = function() {
      var gettext = this.gettext;
      if (this.origOptions.bymonth) {
        if (this.options.interval !== 1) {
          this.add(this.options.interval.toString()).add(gettext("months"));
          if (this.plural(this.options.interval))
            this.add(gettext("in"));
        } else {
        }
        this._bymonth();
      } else {
        if (this.options.interval !== 1) {
          this.add(this.options.interval.toString());
        }
        this.add(this.plural(this.options.interval) ? gettext("months") : gettext("month"));
      }
      if (this.bymonthday) {
        this._bymonthday();
      } else if (this.byweekday && this.byweekday.isWeekdays) {
        this.add(gettext("on")).add(gettext("weekdays"));
      } else if (this.byweekday) {
        this._byweekday();
      }
    };
    ToText2.prototype.YEARLY = function() {
      var gettext = this.gettext;
      if (this.origOptions.bymonth) {
        if (this.options.interval !== 1) {
          this.add(this.options.interval.toString());
          this.add(gettext("years"));
        } else {
        }
        this._bymonth();
      } else {
        if (this.options.interval !== 1) {
          this.add(this.options.interval.toString());
        }
        this.add(this.plural(this.options.interval) ? gettext("years") : gettext("year"));
      }
      if (this.bymonthday) {
        this._bymonthday();
      } else if (this.byweekday) {
        this._byweekday();
      }
      if (this.options.byyearday) {
        this.add(gettext("on the")).add(this.list(this.options.byyearday, this.nth, gettext("and"))).add(gettext("day"));
      }
      if (this.options.byweekno) {
        this.add(gettext("in")).add(this.plural(this.options.byweekno.length) ? gettext("weeks") : gettext("week")).add(this.list(this.options.byweekno, void 0, gettext("and")));
      }
    };
    ToText2.prototype._bymonthday = function() {
      var gettext = this.gettext;
      if (this.byweekday && this.byweekday.allWeeks) {
        this.add(gettext("on")).add(this.list(this.byweekday.allWeeks, this.weekdaytext, gettext("or"))).add(gettext("the")).add(this.list(this.bymonthday, this.nth, gettext("or")));
      } else {
        this.add(gettext("on the")).add(this.list(this.bymonthday, this.nth, gettext("and")));
      }
    };
    ToText2.prototype._byweekday = function() {
      var gettext = this.gettext;
      if (this.byweekday.allWeeks && !this.byweekday.isWeekdays) {
        this.add(gettext("on")).add(this.list(this.byweekday.allWeeks, this.weekdaytext));
      }
      if (this.byweekday.someWeeks) {
        if (this.byweekday.allWeeks)
          this.add(gettext("and"));
        this.add(gettext("on the")).add(this.list(this.byweekday.someWeeks, this.weekdaytext, gettext("and")));
      }
    };
    ToText2.prototype._byhour = function() {
      var gettext = this.gettext;
      this.add(gettext("at")).add(this.list(this.origOptions.byhour, void 0, gettext("and")));
    };
    ToText2.prototype._bymonth = function() {
      this.add(this.list(this.options.bymonth, this.monthtext, this.gettext("and")));
    };
    ToText2.prototype.nth = function(n) {
      n = parseInt(n.toString(), 10);
      var nth;
      var gettext = this.gettext;
      if (n === -1)
        return gettext("last");
      var npos = Math.abs(n);
      switch (npos) {
        case 1:
        case 21:
        case 31:
          nth = npos + gettext("st");
          break;
        case 2:
        case 22:
          nth = npos + gettext("nd");
          break;
        case 3:
        case 23:
          nth = npos + gettext("rd");
          break;
        default:
          nth = npos + gettext("th");
      }
      return n < 0 ? nth + " " + gettext("last") : nth;
    };
    ToText2.prototype.monthtext = function(m) {
      return this.language.monthNames[m - 1];
    };
    ToText2.prototype.weekdaytext = function(wday) {
      var weekday = isNumber(wday) ? (wday + 1) % 7 : wday.getJsWeekday();
      return (wday.n ? this.nth(wday.n) + " " : "") + this.language.dayNames[weekday];
    };
    ToText2.prototype.plural = function(n) {
      return n % 100 !== 1;
    };
    ToText2.prototype.add = function(s) {
      this.text.push(" ");
      this.text.push(s);
      return this;
    };
    ToText2.prototype.list = function(arr, callback, finalDelim, delim) {
      var _this = this;
      if (delim === void 0) {
        delim = ",";
      }
      if (!isArray(arr)) {
        arr = [arr];
      }
      var delimJoin = function(array, delimiter, finalDelimiter) {
        var list = "";
        for (var i = 0; i < array.length; i++) {
          if (i !== 0) {
            if (i === array.length - 1) {
              list += " " + finalDelimiter + " ";
            } else {
              list += delimiter + " ";
            }
          }
          list += array[i];
        }
        return list;
      };
      callback = callback || function(o) {
        return o.toString();
      };
      var realCallback = function(arg) {
        return callback && callback.call(_this, arg);
      };
      if (finalDelim) {
        return delimJoin(arr.map(realCallback), delim, finalDelim);
      } else {
        return arr.map(realCallback).join(delim + " ");
      }
    };
    return ToText2;
  })()
);
var totext_default = ToText;

// vendor/rrule/nlp/parsetext.js
var Parser = (
  /** @class */
  (function() {
    function Parser2(rules) {
      this.done = true;
      this.rules = rules;
    }
    Parser2.prototype.start = function(text) {
      this.text = text;
      this.done = false;
      return this.nextSymbol();
    };
    Parser2.prototype.isDone = function() {
      return this.done && this.symbol === null;
    };
    Parser2.prototype.nextSymbol = function() {
      var best;
      var bestSymbol;
      this.symbol = null;
      this.value = null;
      do {
        if (this.done)
          return false;
        var rule = void 0;
        best = null;
        for (var name_1 in this.rules) {
          rule = this.rules[name_1];
          var match = rule.exec(this.text);
          if (match) {
            if (best === null || match[0].length > best[0].length) {
              best = match;
              bestSymbol = name_1;
            }
          }
        }
        if (best != null) {
          this.text = this.text.substr(best[0].length);
          if (this.text === "")
            this.done = true;
        }
        if (best == null) {
          this.done = true;
          this.symbol = null;
          this.value = null;
          return;
        }
      } while (bestSymbol === "SKIP");
      this.symbol = bestSymbol;
      this.value = best;
      return true;
    };
    Parser2.prototype.accept = function(name) {
      if (this.symbol === name) {
        if (this.value) {
          var v = this.value;
          this.nextSymbol();
          return v;
        }
        this.nextSymbol();
        return true;
      }
      return false;
    };
    Parser2.prototype.acceptNumber = function() {
      return this.accept("number");
    };
    Parser2.prototype.expect = function(name) {
      if (this.accept(name))
        return true;
      throw new Error("expected " + name + " but found " + this.symbol);
    };
    return Parser2;
  })()
);
function parseText(text, language) {
  if (language === void 0) {
    language = i18n_default;
  }
  var options = {};
  var ttr = new Parser(language.tokens);
  if (!ttr.start(text))
    return null;
  S();
  return options;
  function S() {
    ttr.expect("every");
    var n = ttr.acceptNumber();
    if (n)
      options.interval = parseInt(n[0], 10);
    if (ttr.isDone())
      throw new Error("Unexpected end");
    switch (ttr.symbol) {
      case "day(s)":
        options.freq = RRule.DAILY;
        if (ttr.nextSymbol()) {
          AT();
          F();
        }
        break;
      // FIXME Note: every 2 weekdays != every two weeks on weekdays.
      // DAILY on weekdays is not a valid rule
      case "weekday(s)":
        options.freq = RRule.WEEKLY;
        options.byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
        ttr.nextSymbol();
        AT();
        F();
        break;
      case "week(s)":
        options.freq = RRule.WEEKLY;
        if (ttr.nextSymbol()) {
          ON();
          AT();
          F();
        }
        break;
      case "hour(s)":
        options.freq = RRule.HOURLY;
        if (ttr.nextSymbol()) {
          ON();
          F();
        }
        break;
      case "minute(s)":
        options.freq = RRule.MINUTELY;
        if (ttr.nextSymbol()) {
          ON();
          F();
        }
        break;
      case "month(s)":
        options.freq = RRule.MONTHLY;
        if (ttr.nextSymbol()) {
          ON();
          F();
        }
        break;
      case "year(s)":
        options.freq = RRule.YEARLY;
        if (ttr.nextSymbol()) {
          ON();
          F();
        }
        break;
      case "monday":
      case "tuesday":
      case "wednesday":
      case "thursday":
      case "friday":
      case "saturday":
      case "sunday":
        options.freq = RRule.WEEKLY;
        var key = ttr.symbol.substr(0, 2).toUpperCase();
        options.byweekday = [RRule[key]];
        if (!ttr.nextSymbol())
          return;
        while (ttr.accept("comma")) {
          if (ttr.isDone())
            throw new Error("Unexpected end");
          var wkd = decodeWKD();
          if (!wkd) {
            throw new Error("Unexpected symbol " + ttr.symbol + ", expected weekday");
          }
          options.byweekday.push(RRule[wkd]);
          ttr.nextSymbol();
        }
        AT();
        MDAYs();
        F();
        break;
      case "january":
      case "february":
      case "march":
      case "april":
      case "may":
      case "june":
      case "july":
      case "august":
      case "september":
      case "october":
      case "november":
      case "december":
        options.freq = RRule.YEARLY;
        options.bymonth = [decodeM()];
        if (!ttr.nextSymbol())
          return;
        while (ttr.accept("comma")) {
          if (ttr.isDone())
            throw new Error("Unexpected end");
          var m = decodeM();
          if (!m) {
            throw new Error("Unexpected symbol " + ttr.symbol + ", expected month");
          }
          options.bymonth.push(m);
          ttr.nextSymbol();
        }
        ON();
        F();
        break;
      default:
        throw new Error("Unknown symbol");
    }
  }
  function ON() {
    var on = ttr.accept("on");
    var the = ttr.accept("the");
    if (!(on || the))
      return;
    do {
      var nth = decodeNTH();
      var wkd = decodeWKD();
      var m = decodeM();
      if (nth) {
        if (wkd) {
          ttr.nextSymbol();
          if (!options.byweekday)
            options.byweekday = [];
          options.byweekday.push(RRule[wkd].nth(nth));
        } else {
          if (!options.bymonthday)
            options.bymonthday = [];
          options.bymonthday.push(nth);
          ttr.accept("day(s)");
        }
      } else if (wkd) {
        ttr.nextSymbol();
        if (!options.byweekday)
          options.byweekday = [];
        options.byweekday.push(RRule[wkd]);
      } else if (ttr.symbol === "weekday(s)") {
        ttr.nextSymbol();
        if (!options.byweekday) {
          options.byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
        }
      } else if (ttr.symbol === "week(s)") {
        ttr.nextSymbol();
        var n = ttr.acceptNumber();
        if (!n) {
          throw new Error("Unexpected symbol " + ttr.symbol + ", expected week number");
        }
        options.byweekno = [parseInt(n[0], 10)];
        while (ttr.accept("comma")) {
          n = ttr.acceptNumber();
          if (!n) {
            throw new Error("Unexpected symbol " + ttr.symbol + "; expected monthday");
          }
          options.byweekno.push(parseInt(n[0], 10));
        }
      } else if (m) {
        ttr.nextSymbol();
        if (!options.bymonth)
          options.bymonth = [];
        options.bymonth.push(m);
      } else {
        return;
      }
    } while (ttr.accept("comma") || ttr.accept("the") || ttr.accept("on"));
  }
  function AT() {
    var at = ttr.accept("at");
    if (!at)
      return;
    do {
      var n = ttr.acceptNumber();
      if (!n) {
        throw new Error("Unexpected symbol " + ttr.symbol + ", expected hour");
      }
      options.byhour = [parseInt(n[0], 10)];
      while (ttr.accept("comma")) {
        n = ttr.acceptNumber();
        if (!n) {
          throw new Error("Unexpected symbol " + ttr.symbol + "; expected hour");
        }
        options.byhour.push(parseInt(n[0], 10));
      }
    } while (ttr.accept("comma") || ttr.accept("at"));
  }
  function decodeM() {
    switch (ttr.symbol) {
      case "january":
        return 1;
      case "february":
        return 2;
      case "march":
        return 3;
      case "april":
        return 4;
      case "may":
        return 5;
      case "june":
        return 6;
      case "july":
        return 7;
      case "august":
        return 8;
      case "september":
        return 9;
      case "october":
        return 10;
      case "november":
        return 11;
      case "december":
        return 12;
      default:
        return false;
    }
  }
  function decodeWKD() {
    switch (ttr.symbol) {
      case "monday":
      case "tuesday":
      case "wednesday":
      case "thursday":
      case "friday":
      case "saturday":
      case "sunday":
        return ttr.symbol.substr(0, 2).toUpperCase();
      default:
        return false;
    }
  }
  function decodeNTH() {
    switch (ttr.symbol) {
      case "last":
        ttr.nextSymbol();
        return -1;
      case "first":
        ttr.nextSymbol();
        return 1;
      case "second":
        ttr.nextSymbol();
        return ttr.accept("last") ? -2 : 2;
      case "third":
        ttr.nextSymbol();
        return ttr.accept("last") ? -3 : 3;
      case "nth":
        var v = parseInt(ttr.value[1], 10);
        if (v < -366 || v > 366)
          throw new Error("Nth out of range: " + v);
        ttr.nextSymbol();
        return ttr.accept("last") ? -v : v;
      default:
        return false;
    }
  }
  function MDAYs() {
    ttr.accept("on");
    ttr.accept("the");
    var nth = decodeNTH();
    if (!nth)
      return;
    options.bymonthday = [nth];
    ttr.nextSymbol();
    while (ttr.accept("comma")) {
      nth = decodeNTH();
      if (!nth) {
        throw new Error("Unexpected symbol " + ttr.symbol + "; expected monthday");
      }
      options.bymonthday.push(nth);
      ttr.nextSymbol();
    }
  }
  function F() {
    if (ttr.symbol === "until") {
      var date = Date.parse(ttr.text);
      if (!date)
        throw new Error("Cannot parse until date:" + ttr.text);
      options.until = new Date(date);
    } else if (ttr.accept("for")) {
      options.count = parseInt(ttr.value[0], 10);
      ttr.expect("number");
    }
  }
}

// vendor/rrule/types.js
var Frequency;
(function(Frequency2) {
  Frequency2[Frequency2["YEARLY"] = 0] = "YEARLY";
  Frequency2[Frequency2["MONTHLY"] = 1] = "MONTHLY";
  Frequency2[Frequency2["WEEKLY"] = 2] = "WEEKLY";
  Frequency2[Frequency2["DAILY"] = 3] = "DAILY";
  Frequency2[Frequency2["HOURLY"] = 4] = "HOURLY";
  Frequency2[Frequency2["MINUTELY"] = 5] = "MINUTELY";
  Frequency2[Frequency2["SECONDLY"] = 6] = "SECONDLY";
})(Frequency || (Frequency = {}));
function freqIsDailyOrGreater(freq) {
  return freq < Frequency.HOURLY;
}

// vendor/rrule/nlp/index.js
var fromText = function(text, language) {
  if (language === void 0) {
    language = i18n_default;
  }
  return new RRule(parseText(text, language) || void 0);
};
var common = [
  "count",
  "until",
  "interval",
  "byweekday",
  "bymonthday",
  "bymonth"
];
totext_default.IMPLEMENTED = [];
totext_default.IMPLEMENTED[Frequency.HOURLY] = common;
totext_default.IMPLEMENTED[Frequency.MINUTELY] = common;
totext_default.IMPLEMENTED[Frequency.DAILY] = ["byhour"].concat(common);
totext_default.IMPLEMENTED[Frequency.WEEKLY] = common;
totext_default.IMPLEMENTED[Frequency.MONTHLY] = common;
totext_default.IMPLEMENTED[Frequency.YEARLY] = ["byweekno", "byyearday"].concat(common);
var toText = function(rrule, gettext, language, dateFormatter) {
  return new totext_default(rrule, gettext, language, dateFormatter).toString();
};
var isFullyConvertible = totext_default.isFullyConvertible;

// vendor/rrule/datetime.js
var Time = (
  /** @class */
  (function() {
    function Time2(hour, minute, second, millisecond) {
      this.hour = hour;
      this.minute = minute;
      this.second = second;
      this.millisecond = millisecond || 0;
    }
    Time2.prototype.getHours = function() {
      return this.hour;
    };
    Time2.prototype.getMinutes = function() {
      return this.minute;
    };
    Time2.prototype.getSeconds = function() {
      return this.second;
    };
    Time2.prototype.getMilliseconds = function() {
      return this.millisecond;
    };
    Time2.prototype.getTime = function() {
      return (this.hour * 60 * 60 + this.minute * 60 + this.second) * 1e3 + this.millisecond;
    };
    return Time2;
  })()
);
var DateTime = (
  /** @class */
  (function(_super) {
    __extends(DateTime2, _super);
    function DateTime2(year, month, day2, hour, minute, second, millisecond) {
      var _this = _super.call(this, hour, minute, second, millisecond) || this;
      _this.year = year;
      _this.month = month;
      _this.day = day2;
      return _this;
    }
    DateTime2.fromDate = function(date) {
      return new this(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.valueOf() % 1e3);
    };
    DateTime2.prototype.getWeekday = function() {
      return getWeekday(new Date(this.getTime()));
    };
    DateTime2.prototype.getTime = function() {
      return new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.millisecond)).getTime();
    };
    DateTime2.prototype.getDay = function() {
      return this.day;
    };
    DateTime2.prototype.getMonth = function() {
      return this.month;
    };
    DateTime2.prototype.getYear = function() {
      return this.year;
    };
    DateTime2.prototype.addYears = function(years) {
      this.year += years;
    };
    DateTime2.prototype.addMonths = function(months) {
      this.month += months;
      if (this.month > 12) {
        var yearDiv = Math.floor(this.month / 12);
        var monthMod = pymod(this.month, 12);
        this.month = monthMod;
        this.year += yearDiv;
        if (this.month === 0) {
          this.month = 12;
          --this.year;
        }
      }
    };
    DateTime2.prototype.addWeekly = function(days, wkst) {
      if (wkst > this.getWeekday()) {
        this.day += -(this.getWeekday() + 1 + (6 - wkst)) + days * 7;
      } else {
        this.day += -(this.getWeekday() - wkst) + days * 7;
      }
      this.fixDay();
    };
    DateTime2.prototype.addDaily = function(days) {
      this.day += days;
      this.fixDay();
    };
    DateTime2.prototype.addHours = function(hours, filtered, byhour) {
      if (filtered) {
        this.hour += Math.floor((23 - this.hour) / hours) * hours;
      }
      for (; ; ) {
        this.hour += hours;
        var _a = divmod(this.hour, 24), dayDiv = _a.div, hourMod = _a.mod;
        if (dayDiv) {
          this.hour = hourMod;
          this.addDaily(dayDiv);
        }
        if (empty(byhour) || includes(byhour, this.hour))
          break;
      }
    };
    DateTime2.prototype.addMinutes = function(minutes, filtered, byhour, byminute) {
      if (filtered) {
        this.minute += Math.floor((1439 - (this.hour * 60 + this.minute)) / minutes) * minutes;
      }
      for (; ; ) {
        this.minute += minutes;
        var _a = divmod(this.minute, 60), hourDiv = _a.div, minuteMod = _a.mod;
        if (hourDiv) {
          this.minute = minuteMod;
          this.addHours(hourDiv, false, byhour);
        }
        if ((empty(byhour) || includes(byhour, this.hour)) && (empty(byminute) || includes(byminute, this.minute))) {
          break;
        }
      }
    };
    DateTime2.prototype.addSeconds = function(seconds, filtered, byhour, byminute, bysecond) {
      if (filtered) {
        this.second += Math.floor((86399 - (this.hour * 3600 + this.minute * 60 + this.second)) / seconds) * seconds;
      }
      for (; ; ) {
        this.second += seconds;
        var _a = divmod(this.second, 60), minuteDiv = _a.div, secondMod = _a.mod;
        if (minuteDiv) {
          this.second = secondMod;
          this.addMinutes(minuteDiv, false, byhour, byminute);
        }
        if ((empty(byhour) || includes(byhour, this.hour)) && (empty(byminute) || includes(byminute, this.minute)) && (empty(bysecond) || includes(bysecond, this.second))) {
          break;
        }
      }
    };
    DateTime2.prototype.fixDay = function() {
      if (this.day <= 28) {
        return;
      }
      var daysinmonth = monthRange(this.year, this.month - 1)[1];
      if (this.day <= daysinmonth) {
        return;
      }
      while (this.day > daysinmonth) {
        this.day -= daysinmonth;
        ++this.month;
        if (this.month === 13) {
          this.month = 1;
          ++this.year;
          if (this.year > MAXYEAR) {
            return;
          }
        }
        daysinmonth = monthRange(this.year, this.month - 1)[1];
      }
    };
    DateTime2.prototype.add = function(options, filtered) {
      var freq = options.freq, interval = options.interval, wkst = options.wkst, byhour = options.byhour, byminute = options.byminute, bysecond = options.bysecond;
      switch (freq) {
        case Frequency.YEARLY:
          return this.addYears(interval);
        case Frequency.MONTHLY:
          return this.addMonths(interval);
        case Frequency.WEEKLY:
          return this.addWeekly(interval, wkst);
        case Frequency.DAILY:
          return this.addDaily(interval);
        case Frequency.HOURLY:
          return this.addHours(interval, filtered, byhour);
        case Frequency.MINUTELY:
          return this.addMinutes(interval, filtered, byhour, byminute);
        case Frequency.SECONDLY:
          return this.addSeconds(interval, filtered, byhour, byminute, bysecond);
      }
    };
    return DateTime2;
  })(Time)
);

// vendor/rrule/parseoptions.js
function initializeOptions(options) {
  var invalid = [];
  var keys = Object.keys(options);
  for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
    var key = keys_1[_i];
    if (!includes(defaultKeys, key))
      invalid.push(key);
    if (isDate(options[key]) && !isValidDate(options[key])) {
      invalid.push(key);
    }
  }
  if (invalid.length) {
    throw new Error("Invalid options: " + invalid.join(", "));
  }
  return __assign({}, options);
}
function parseOptions(options) {
  var opts = __assign(__assign({}, DEFAULT_OPTIONS), initializeOptions(options));
  if (isPresent(opts.byeaster))
    opts.freq = RRule.YEARLY;
  if (!(isPresent(opts.freq) && RRule.FREQUENCIES[opts.freq])) {
    throw new Error("Invalid frequency: ".concat(opts.freq, " ").concat(options.freq));
  }
  if (!opts.dtstart)
    opts.dtstart = new Date((/* @__PURE__ */ new Date()).setMilliseconds(0));
  if (!isPresent(opts.wkst)) {
    opts.wkst = RRule.MO.weekday;
  } else if (isNumber(opts.wkst)) {
  } else {
    opts.wkst = opts.wkst.weekday;
  }
  if (isPresent(opts.bysetpos)) {
    if (isNumber(opts.bysetpos))
      opts.bysetpos = [opts.bysetpos];
    for (var i = 0; i < opts.bysetpos.length; i++) {
      var v = opts.bysetpos[i];
      if (v === 0 || !(v >= -366 && v <= 366)) {
        throw new Error("bysetpos must be between 1 and 366, or between -366 and -1");
      }
    }
  }
  if (!(Boolean(opts.byweekno) || notEmpty(opts.byweekno) || notEmpty(opts.byyearday) || Boolean(opts.bymonthday) || notEmpty(opts.bymonthday) || isPresent(opts.byweekday) || isPresent(opts.byeaster))) {
    switch (opts.freq) {
      case RRule.YEARLY:
        if (!opts.bymonth)
          opts.bymonth = opts.dtstart.getUTCMonth() + 1;
        opts.bymonthday = opts.dtstart.getUTCDate();
        break;
      case RRule.MONTHLY:
        opts.bymonthday = opts.dtstart.getUTCDate();
        break;
      case RRule.WEEKLY:
        opts.byweekday = [getWeekday(opts.dtstart)];
        break;
    }
  }
  if (isPresent(opts.bymonth) && !isArray(opts.bymonth)) {
    opts.bymonth = [opts.bymonth];
  }
  if (isPresent(opts.byyearday) && !isArray(opts.byyearday) && isNumber(opts.byyearday)) {
    opts.byyearday = [opts.byyearday];
  }
  if (!isPresent(opts.bymonthday)) {
    opts.bymonthday = [];
    opts.bynmonthday = [];
  } else if (isArray(opts.bymonthday)) {
    var bymonthday = [];
    var bynmonthday = [];
    for (var i = 0; i < opts.bymonthday.length; i++) {
      var v = opts.bymonthday[i];
      if (v > 0) {
        bymonthday.push(v);
      } else if (v < 0) {
        bynmonthday.push(v);
      }
    }
    opts.bymonthday = bymonthday;
    opts.bynmonthday = bynmonthday;
  } else if (opts.bymonthday < 0) {
    opts.bynmonthday = [opts.bymonthday];
    opts.bymonthday = [];
  } else {
    opts.bynmonthday = [];
    opts.bymonthday = [opts.bymonthday];
  }
  if (isPresent(opts.byweekno) && !isArray(opts.byweekno)) {
    opts.byweekno = [opts.byweekno];
  }
  if (!isPresent(opts.byweekday)) {
    opts.bynweekday = null;
  } else if (isNumber(opts.byweekday)) {
    opts.byweekday = [opts.byweekday];
    opts.bynweekday = null;
  } else if (isWeekdayStr(opts.byweekday)) {
    opts.byweekday = [Weekday.fromStr(opts.byweekday).weekday];
    opts.bynweekday = null;
  } else if (opts.byweekday instanceof Weekday) {
    if (!opts.byweekday.n || opts.freq > RRule.MONTHLY) {
      opts.byweekday = [opts.byweekday.weekday];
      opts.bynweekday = null;
    } else {
      opts.bynweekday = [[opts.byweekday.weekday, opts.byweekday.n]];
      opts.byweekday = null;
    }
  } else {
    var byweekday = [];
    var bynweekday = [];
    for (var i = 0; i < opts.byweekday.length; i++) {
      var wday = opts.byweekday[i];
      if (isNumber(wday)) {
        byweekday.push(wday);
        continue;
      } else if (isWeekdayStr(wday)) {
        byweekday.push(Weekday.fromStr(wday).weekday);
        continue;
      }
      if (!wday.n || opts.freq > RRule.MONTHLY) {
        byweekday.push(wday.weekday);
      } else {
        bynweekday.push([wday.weekday, wday.n]);
      }
    }
    opts.byweekday = notEmpty(byweekday) ? byweekday : null;
    opts.bynweekday = notEmpty(bynweekday) ? bynweekday : null;
  }
  if (!isPresent(opts.byhour)) {
    opts.byhour = opts.freq < RRule.HOURLY ? [opts.dtstart.getUTCHours()] : null;
  } else if (isNumber(opts.byhour)) {
    opts.byhour = [opts.byhour];
  }
  if (!isPresent(opts.byminute)) {
    opts.byminute = opts.freq < RRule.MINUTELY ? [opts.dtstart.getUTCMinutes()] : null;
  } else if (isNumber(opts.byminute)) {
    opts.byminute = [opts.byminute];
  }
  if (!isPresent(opts.bysecond)) {
    opts.bysecond = opts.freq < RRule.SECONDLY ? [opts.dtstart.getUTCSeconds()] : null;
  } else if (isNumber(opts.bysecond)) {
    opts.bysecond = [opts.bysecond];
  }
  return { parsedOptions: opts };
}
function buildTimeset(opts) {
  var millisecondModulo = opts.dtstart.getTime() % 1e3;
  if (!freqIsDailyOrGreater(opts.freq)) {
    return [];
  }
  var timeset = [];
  opts.byhour.forEach(function(hour) {
    opts.byminute.forEach(function(minute) {
      opts.bysecond.forEach(function(second) {
        timeset.push(new Time(hour, minute, second, millisecondModulo));
      });
    });
  });
  return timeset;
}

// vendor/rrule/parsestring.js
function parseString(rfcString) {
  var options = rfcString.split("\n").map(parseLine).filter(function(x) {
    return x !== null;
  });
  return __assign(__assign({}, options[0]), options[1]);
}
function parseDtstart(line) {
  var options = {};
  var dtstartWithZone = /DTSTART(?:;TZID=([^:=]+?))?(?::|=)([^;\s]+)/i.exec(line);
  if (!dtstartWithZone) {
    return options;
  }
  var tzid = dtstartWithZone[1], dtstart = dtstartWithZone[2];
  if (tzid) {
    options.tzid = tzid;
  }
  options.dtstart = untilStringToDate(dtstart);
  return options;
}
function parseLine(rfcString) {
  rfcString = rfcString.replace(/^\s+|\s+$/, "");
  if (!rfcString.length)
    return null;
  var header = /^([A-Z]+?)[:;]/.exec(rfcString.toUpperCase());
  if (!header) {
    return parseRrule(rfcString);
  }
  var key = header[1];
  switch (key.toUpperCase()) {
    case "RRULE":
    case "EXRULE":
      return parseRrule(rfcString);
    case "DTSTART":
      return parseDtstart(rfcString);
    default:
      throw new Error("Unsupported RFC prop ".concat(key, " in ").concat(rfcString));
  }
}
function parseRrule(line) {
  var strippedLine = line.replace(/^RRULE:/i, "");
  var options = parseDtstart(strippedLine);
  var attrs = line.replace(/^(?:RRULE|EXRULE):/i, "").split(";");
  attrs.forEach(function(attr) {
    var _a = attr.split("="), key = _a[0], value = _a[1];
    switch (key.toUpperCase()) {
      case "FREQ":
        options.freq = Frequency[value.toUpperCase()];
        break;
      case "WKST":
        options.wkst = Days[value.toUpperCase()];
        break;
      case "COUNT":
      case "INTERVAL":
      case "BYSETPOS":
      case "BYMONTH":
      case "BYMONTHDAY":
      case "BYYEARDAY":
      case "BYWEEKNO":
      case "BYHOUR":
      case "BYMINUTE":
      case "BYSECOND":
        var num = parseNumber(value);
        var optionKey = key.toLowerCase();
        options[optionKey] = num;
        break;
      case "BYWEEKDAY":
      case "BYDAY":
        options.byweekday = parseWeekday(value);
        break;
      case "DTSTART":
      case "TZID":
        var dtstart = parseDtstart(line);
        options.tzid = dtstart.tzid;
        options.dtstart = dtstart.dtstart;
        break;
      case "UNTIL":
        options.until = untilStringToDate(value);
        break;
      case "BYEASTER":
        options.byeaster = Number(value);
        break;
      default:
        throw new Error("Unknown RRULE property '" + key + "'");
    }
  });
  return options;
}
function parseNumber(value) {
  if (value.indexOf(",") !== -1) {
    var values = value.split(",");
    return values.map(parseIndividualNumber);
  }
  return parseIndividualNumber(value);
}
function parseIndividualNumber(value) {
  if (/^[+-]?\d+$/.test(value)) {
    return Number(value);
  }
  return value;
}
function parseWeekday(value) {
  var days = value.split(",");
  return days.map(function(day2) {
    if (day2.length === 2) {
      return Days[day2];
    }
    var parts = day2.match(/^([+-]?\d{1,2})([A-Z]{2})$/);
    if (!parts || parts.length < 3) {
      throw new SyntaxError("Invalid weekday string: ".concat(day2));
    }
    var n = Number(parts[1]);
    var wdaypart = parts[2];
    var wday = Days[wdaypart].weekday;
    return new Weekday(wday, n);
  });
}

// vendor/rrule/datewithzone.js
var DateWithZone = (
  /** @class */
  (function() {
    function DateWithZone2(date, tzid) {
      if (isNaN(date.getTime())) {
        throw new RangeError("Invalid date passed to DateWithZone");
      }
      this.date = date;
      this.tzid = tzid;
    }
    Object.defineProperty(DateWithZone2.prototype, "isUTC", {
      get: function() {
        return !this.tzid || this.tzid.toUpperCase() === "UTC";
      },
      enumerable: false,
      configurable: true
    });
    DateWithZone2.prototype.toString = function() {
      var datestr = timeToUntilString(this.date.getTime(), this.isUTC);
      if (!this.isUTC) {
        return ";TZID=".concat(this.tzid, ":").concat(datestr);
      }
      return ":".concat(datestr);
    };
    DateWithZone2.prototype.getTime = function() {
      return this.date.getTime();
    };
    DateWithZone2.prototype.rezonedDate = function() {
      if (this.isUTC) {
        return this.date;
      }
      return dateInTimeZone(this.date, this.tzid);
    };
    return DateWithZone2;
  })()
);

// vendor/rrule/optionstostring.js
function optionsToString(options) {
  var rrule = [];
  var dtstart = "";
  var keys = Object.keys(options);
  var defaultKeys2 = Object.keys(DEFAULT_OPTIONS);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] === "tzid")
      continue;
    if (!includes(defaultKeys2, keys[i]))
      continue;
    var key = keys[i].toUpperCase();
    var value = options[keys[i]];
    var outValue = "";
    if (!isPresent(value) || isArray(value) && !value.length)
      continue;
    switch (key) {
      case "FREQ":
        outValue = RRule.FREQUENCIES[options.freq];
        break;
      case "WKST":
        if (isNumber(value)) {
          outValue = new Weekday(value).toString();
        } else {
          outValue = value.toString();
        }
        break;
      case "BYWEEKDAY":
        key = "BYDAY";
        outValue = toArray(value).map(function(wday) {
          if (wday instanceof Weekday) {
            return wday;
          }
          if (isArray(wday)) {
            return new Weekday(wday[0], wday[1]);
          }
          return new Weekday(wday);
        }).toString();
        break;
      case "DTSTART":
        dtstart = buildDtstart(value, options.tzid);
        break;
      case "UNTIL":
        outValue = timeToUntilString(value, !options.tzid);
        break;
      default:
        if (isArray(value)) {
          var strValues = [];
          for (var j = 0; j < value.length; j++) {
            strValues[j] = String(value[j]);
          }
          outValue = strValues.toString();
        } else {
          outValue = String(value);
        }
    }
    if (outValue) {
      rrule.push([key, outValue]);
    }
  }
  var rules = rrule.map(function(_a) {
    var key2 = _a[0], value2 = _a[1];
    return "".concat(key2, "=").concat(value2.toString());
  }).join(";");
  var ruleString = "";
  if (rules !== "") {
    ruleString = "RRULE:".concat(rules);
  }
  return [dtstart, ruleString].filter(function(x) {
    return !!x;
  }).join("\n");
}
function buildDtstart(dtstart, tzid) {
  if (!dtstart) {
    return "";
  }
  return "DTSTART" + new DateWithZone(new Date(dtstart), tzid).toString();
}

// vendor/rrule/cache.js
function argsMatch(left, right) {
  if (Array.isArray(left)) {
    if (!Array.isArray(right))
      return false;
    if (left.length !== right.length)
      return false;
    return left.every(function(date, i) {
      return date.getTime() === right[i].getTime();
    });
  }
  if (left instanceof Date) {
    return right instanceof Date && left.getTime() === right.getTime();
  }
  return left === right;
}
var Cache = (
  /** @class */
  (function() {
    function Cache2() {
      this.all = false;
      this.before = [];
      this.after = [];
      this.between = [];
    }
    Cache2.prototype._cacheAdd = function(what, value, args) {
      if (value) {
        value = value instanceof Date ? clone(value) : cloneDates(value);
      }
      if (what === "all") {
        this.all = value;
      } else {
        args._value = value;
        this[what].push(args);
      }
    };
    Cache2.prototype._cacheGet = function(what, args) {
      var cached = false;
      var argsKeys = args ? Object.keys(args) : [];
      var findCacheDiff = function(item2) {
        for (var i2 = 0; i2 < argsKeys.length; i2++) {
          var key = argsKeys[i2];
          if (!argsMatch(args[key], item2[key])) {
            return true;
          }
        }
        return false;
      };
      var cachedObject = this[what];
      if (what === "all") {
        cached = this.all;
      } else if (isArray(cachedObject)) {
        for (var i = 0; i < cachedObject.length; i++) {
          var item = cachedObject[i];
          if (argsKeys.length && findCacheDiff(item))
            continue;
          cached = item._value;
          break;
        }
      }
      if (!cached && this.all) {
        var iterResult = new iterresult_default(what, args);
        for (var i = 0; i < this.all.length; i++) {
          if (!iterResult.accept(this.all[i]))
            break;
        }
        cached = iterResult.getValue();
        this._cacheAdd(what, cached, args);
      }
      return isArray(cached) ? cloneDates(cached) : cached instanceof Date ? clone(cached) : cached;
    };
    return Cache2;
  })()
);

// vendor/rrule/masks.js
var M365MASK = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], repeat(1, 31), true), repeat(2, 28), true), repeat(3, 31), true), repeat(4, 30), true), repeat(5, 31), true), repeat(6, 30), true), repeat(7, 31), true), repeat(8, 31), true), repeat(9, 30), true), repeat(10, 31), true), repeat(11, 30), true), repeat(12, 31), true), repeat(1, 7), true);
var M366MASK = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], repeat(1, 31), true), repeat(2, 29), true), repeat(3, 31), true), repeat(4, 30), true), repeat(5, 31), true), repeat(6, 30), true), repeat(7, 31), true), repeat(8, 31), true), repeat(9, 30), true), repeat(10, 31), true), repeat(11, 30), true), repeat(12, 31), true), repeat(1, 7), true);
var M28 = range(1, 29);
var M29 = range(1, 30);
var M30 = range(1, 31);
var M31 = range(1, 32);
var MDAY366MASK = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], M31, true), M29, true), M31, true), M30, true), M31, true), M30, true), M31, true), M31, true), M30, true), M31, true), M30, true), M31, true), M31.slice(0, 7), true);
var MDAY365MASK = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], M31, true), M28, true), M31, true), M30, true), M31, true), M30, true), M31, true), M31, true), M30, true), M31, true), M30, true), M31, true), M31.slice(0, 7), true);
var NM28 = range(-28, 0);
var NM29 = range(-29, 0);
var NM30 = range(-30, 0);
var NM31 = range(-31, 0);
var NMDAY366MASK = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], NM31, true), NM29, true), NM31, true), NM30, true), NM31, true), NM30, true), NM31, true), NM31, true), NM30, true), NM31, true), NM30, true), NM31, true), NM31.slice(0, 7), true);
var NMDAY365MASK = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], NM31, true), NM28, true), NM31, true), NM30, true), NM31, true), NM30, true), NM31, true), NM31, true), NM30, true), NM31, true), NM30, true), NM31, true), NM31.slice(0, 7), true);
var M366RANGE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366];
var M365RANGE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
var WDAYMASK = (function() {
  var wdaymask = [];
  for (var i = 0; i < 55; i++)
    wdaymask = wdaymask.concat(range(7));
  return wdaymask;
})();

// vendor/rrule/iterinfo/yearinfo.js
function rebuildYear(year, options) {
  var firstyday = datetime(year, 1, 1);
  var yearlen = isLeapYear(year) ? 366 : 365;
  var nextyearlen = isLeapYear(year + 1) ? 366 : 365;
  var yearordinal = toOrdinal(firstyday);
  var yearweekday = getWeekday(firstyday);
  var result = __assign(__assign({ yearlen, nextyearlen, yearordinal, yearweekday }, baseYearMasks(year)), { wnomask: null });
  if (empty(options.byweekno)) {
    return result;
  }
  result.wnomask = repeat(0, yearlen + 7);
  var firstwkst;
  var wyearlen;
  var no1wkst = firstwkst = pymod(7 - yearweekday + options.wkst, 7);
  if (no1wkst >= 4) {
    no1wkst = 0;
    wyearlen = result.yearlen + pymod(yearweekday - options.wkst, 7);
  } else {
    wyearlen = yearlen - no1wkst;
  }
  var div = Math.floor(wyearlen / 7);
  var mod = pymod(wyearlen, 7);
  var numweeks = Math.floor(div + mod / 4);
  for (var j = 0; j < options.byweekno.length; j++) {
    var n = options.byweekno[j];
    if (n < 0) {
      n += numweeks + 1;
    }
    if (!(n > 0 && n <= numweeks)) {
      continue;
    }
    var i = void 0;
    if (n > 1) {
      i = no1wkst + (n - 1) * 7;
      if (no1wkst !== firstwkst) {
        i -= 7 - firstwkst;
      }
    } else {
      i = no1wkst;
    }
    for (var k = 0; k < 7; k++) {
      result.wnomask[i] = 1;
      i++;
      if (result.wdaymask[i] === options.wkst)
        break;
    }
  }
  if (includes(options.byweekno, 1)) {
    var i = no1wkst + numweeks * 7;
    if (no1wkst !== firstwkst)
      i -= 7 - firstwkst;
    if (i < yearlen) {
      for (var j = 0; j < 7; j++) {
        result.wnomask[i] = 1;
        i += 1;
        if (result.wdaymask[i] === options.wkst)
          break;
      }
    }
  }
  if (no1wkst) {
    var lnumweeks = void 0;
    if (!includes(options.byweekno, -1)) {
      var lyearweekday = getWeekday(datetime(year - 1, 1, 1));
      var lno1wkst = pymod(7 - lyearweekday.valueOf() + options.wkst, 7);
      var lyearlen = isLeapYear(year - 1) ? 366 : 365;
      var weekst = void 0;
      if (lno1wkst >= 4) {
        lno1wkst = 0;
        weekst = lyearlen + pymod(lyearweekday - options.wkst, 7);
      } else {
        weekst = yearlen - no1wkst;
      }
      lnumweeks = Math.floor(52 + pymod(weekst, 7) / 4);
    } else {
      lnumweeks = -1;
    }
    if (includes(options.byweekno, lnumweeks)) {
      for (var i = 0; i < no1wkst; i++)
        result.wnomask[i] = 1;
    }
  }
  return result;
}
function baseYearMasks(year) {
  var yearlen = isLeapYear(year) ? 366 : 365;
  var firstyday = datetime(year, 1, 1);
  var wday = getWeekday(firstyday);
  if (yearlen === 365) {
    return {
      mmask: M365MASK,
      mdaymask: MDAY365MASK,
      nmdaymask: NMDAY365MASK,
      wdaymask: WDAYMASK.slice(wday),
      mrange: M365RANGE
    };
  }
  return {
    mmask: M366MASK,
    mdaymask: MDAY366MASK,
    nmdaymask: NMDAY366MASK,
    wdaymask: WDAYMASK.slice(wday),
    mrange: M366RANGE
  };
}

// vendor/rrule/iterinfo/monthinfo.js
function rebuildMonth(year, month, yearlen, mrange, wdaymask, options) {
  var result = {
    lastyear: year,
    lastmonth: month,
    nwdaymask: []
  };
  var ranges = [];
  if (options.freq === RRule.YEARLY) {
    if (empty(options.bymonth)) {
      ranges = [[0, yearlen]];
    } else {
      for (var j = 0; j < options.bymonth.length; j++) {
        month = options.bymonth[j];
        ranges.push(mrange.slice(month - 1, month + 1));
      }
    }
  } else if (options.freq === RRule.MONTHLY) {
    ranges = [mrange.slice(month - 1, month + 1)];
  }
  if (empty(ranges)) {
    return result;
  }
  result.nwdaymask = repeat(0, yearlen);
  for (var j = 0; j < ranges.length; j++) {
    var rang = ranges[j];
    var first = rang[0];
    var last = rang[1] - 1;
    for (var k = 0; k < options.bynweekday.length; k++) {
      var i = void 0;
      var _a = options.bynweekday[k], wday = _a[0], n = _a[1];
      if (n < 0) {
        i = last + (n + 1) * 7;
        i -= pymod(wdaymask[i] - wday, 7);
      } else {
        i = first + (n - 1) * 7;
        i += pymod(7 - wdaymask[i] + wday, 7);
      }
      if (first <= i && i <= last)
        result.nwdaymask[i] = 1;
    }
  }
  return result;
}

// vendor/rrule/iterinfo/easter.js
function easter(y, offset) {
  if (offset === void 0) {
    offset = 0;
  }
  var a = y % 19;
  var b = Math.floor(y / 100);
  var c = y % 100;
  var d = Math.floor(b / 4);
  var e = b % 4;
  var f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3);
  var h = Math.floor(19 * a + b - d - g + 15) % 30;
  var i = Math.floor(c / 4);
  var k = c % 4;
  var l = Math.floor(32 + 2 * e + 2 * i - h - k) % 7;
  var m = Math.floor((a + 11 * h + 22 * l) / 451);
  var month = Math.floor((h + l - 7 * m + 114) / 31);
  var day2 = (h + l - 7 * m + 114) % 31 + 1;
  var date = Date.UTC(y, month - 1, day2 + offset);
  var yearStart = Date.UTC(y, 0, 1);
  return [Math.ceil((date - yearStart) / (1e3 * 60 * 60 * 24))];
}

// vendor/rrule/iterinfo/index.js
var Iterinfo = (
  /** @class */
  (function() {
    function Iterinfo2(options) {
      this.options = options;
    }
    Iterinfo2.prototype.rebuild = function(year, month) {
      var options = this.options;
      if (year !== this.lastyear) {
        this.yearinfo = rebuildYear(year, options);
      }
      if (notEmpty(options.bynweekday) && (month !== this.lastmonth || year !== this.lastyear)) {
        var _a = this.yearinfo, yearlen = _a.yearlen, mrange = _a.mrange, wdaymask = _a.wdaymask;
        this.monthinfo = rebuildMonth(year, month, yearlen, mrange, wdaymask, options);
      }
      if (isPresent(options.byeaster)) {
        this.eastermask = easter(year, options.byeaster);
      }
    };
    Object.defineProperty(Iterinfo2.prototype, "lastyear", {
      get: function() {
        return this.monthinfo ? this.monthinfo.lastyear : null;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "lastmonth", {
      get: function() {
        return this.monthinfo ? this.monthinfo.lastmonth : null;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "yearlen", {
      get: function() {
        return this.yearinfo.yearlen;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "yearordinal", {
      get: function() {
        return this.yearinfo.yearordinal;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "mrange", {
      get: function() {
        return this.yearinfo.mrange;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "wdaymask", {
      get: function() {
        return this.yearinfo.wdaymask;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "mmask", {
      get: function() {
        return this.yearinfo.mmask;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "wnomask", {
      get: function() {
        return this.yearinfo.wnomask;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "nwdaymask", {
      get: function() {
        return this.monthinfo ? this.monthinfo.nwdaymask : [];
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "nextyearlen", {
      get: function() {
        return this.yearinfo.nextyearlen;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "mdaymask", {
      get: function() {
        return this.yearinfo.mdaymask;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Iterinfo2.prototype, "nmdaymask", {
      get: function() {
        return this.yearinfo.nmdaymask;
      },
      enumerable: false,
      configurable: true
    });
    Iterinfo2.prototype.ydayset = function() {
      return [range(this.yearlen), 0, this.yearlen];
    };
    Iterinfo2.prototype.mdayset = function(_, month) {
      var start = this.mrange[month - 1];
      var end = this.mrange[month];
      var set = repeat(null, this.yearlen);
      for (var i = start; i < end; i++)
        set[i] = i;
      return [set, start, end];
    };
    Iterinfo2.prototype.wdayset = function(year, month, day2) {
      var set = repeat(null, this.yearlen + 7);
      var i = toOrdinal(datetime(year, month, day2)) - this.yearordinal;
      var start = i;
      for (var j = 0; j < 7; j++) {
        set[i] = i;
        ++i;
        if (this.wdaymask[i] === this.options.wkst)
          break;
      }
      return [set, start, i];
    };
    Iterinfo2.prototype.ddayset = function(year, month, day2) {
      var set = repeat(null, this.yearlen);
      var i = toOrdinal(datetime(year, month, day2)) - this.yearordinal;
      set[i] = i;
      return [set, i, i + 1];
    };
    Iterinfo2.prototype.htimeset = function(hour, _, second, millisecond) {
      var _this = this;
      var set = [];
      this.options.byminute.forEach(function(minute) {
        set = set.concat(_this.mtimeset(hour, minute, second, millisecond));
      });
      sort(set);
      return set;
    };
    Iterinfo2.prototype.mtimeset = function(hour, minute, _, millisecond) {
      var set = this.options.bysecond.map(function(second) {
        return new Time(hour, minute, second, millisecond);
      });
      sort(set);
      return set;
    };
    Iterinfo2.prototype.stimeset = function(hour, minute, second, millisecond) {
      return [new Time(hour, minute, second, millisecond)];
    };
    Iterinfo2.prototype.getdayset = function(freq) {
      switch (freq) {
        case Frequency.YEARLY:
          return this.ydayset.bind(this);
        case Frequency.MONTHLY:
          return this.mdayset.bind(this);
        case Frequency.WEEKLY:
          return this.wdayset.bind(this);
        case Frequency.DAILY:
          return this.ddayset.bind(this);
        default:
          return this.ddayset.bind(this);
      }
    };
    Iterinfo2.prototype.gettimeset = function(freq) {
      switch (freq) {
        case Frequency.HOURLY:
          return this.htimeset.bind(this);
        case Frequency.MINUTELY:
          return this.mtimeset.bind(this);
        case Frequency.SECONDLY:
          return this.stimeset.bind(this);
      }
    };
    return Iterinfo2;
  })()
);
var iterinfo_default = Iterinfo;

// vendor/rrule/iter/poslist.js
function buildPoslist(bysetpos, timeset, start, end, ii, dayset) {
  var poslist = [];
  for (var j = 0; j < bysetpos.length; j++) {
    var daypos = void 0;
    var timepos = void 0;
    var pos = bysetpos[j];
    if (pos < 0) {
      daypos = Math.floor(pos / timeset.length);
      timepos = pymod(pos, timeset.length);
    } else {
      daypos = Math.floor((pos - 1) / timeset.length);
      timepos = pymod(pos - 1, timeset.length);
    }
    var tmp = [];
    for (var k = start; k < end; k++) {
      var val = dayset[k];
      if (!isPresent(val))
        continue;
      tmp.push(val);
    }
    var i = void 0;
    if (daypos < 0) {
      i = tmp.slice(daypos)[0];
    } else {
      i = tmp[daypos];
    }
    var time = timeset[timepos];
    var date = fromOrdinal(ii.yearordinal + i);
    var res = combine(date, time);
    if (!includes(poslist, res))
      poslist.push(res);
  }
  sort(poslist);
  return poslist;
}

// vendor/rrule/iter/index.js
function iter(iterResult, options) {
  var dtstart = options.dtstart, freq = options.freq, interval = options.interval, until = options.until, bysetpos = options.bysetpos;
  var count = options.count;
  if (count === 0 || interval === 0) {
    return emitResult(iterResult);
  }
  var counterDate = DateTime.fromDate(dtstart);
  var ii = new iterinfo_default(options);
  ii.rebuild(counterDate.year, counterDate.month);
  var timeset = makeTimeset(ii, counterDate, options);
  var plannerIterations = 0;
  for (; ; ) {
    if (++plannerIterations > 2e4) {
      var error = new Error("Recurrence exceeds the safe calculation budget; simplify the rule or shorten its history.");
      error.name = "RecurrenceLimitError";
      throw error;
    }
    var _a = ii.getdayset(freq)(counterDate.year, counterDate.month, counterDate.day), dayset = _a[0], start = _a[1], end = _a[2];
    var periodStart = fromOrdinal(ii.yearordinal + start);
    if (until && periodStart > until || iterResult.maxDate && periodStart > iterResult.maxDate) return emitResult(iterResult);
    var filtered = removeFilteredDays(dayset, start, end, ii, options);
    if (notEmpty(bysetpos)) {
      var poslist = buildPoslist(bysetpos, timeset, start, end, ii, dayset);
      for (var j = 0; j < poslist.length; j++) {
        var res = poslist[j];
        if (until && res > until) {
          return emitResult(iterResult);
        }
        if (res >= dtstart) {
          var rezonedDate = rezoneIfNeeded(res, options);
          if (!iterResult.accept(rezonedDate)) {
            return emitResult(iterResult);
          }
          if (count) {
            --count;
            if (!count) {
              return emitResult(iterResult);
            }
          }
        }
      }
    } else {
      for (var j = start; j < end; j++) {
        var currentDay = dayset[j];
        if (!isPresent(currentDay)) {
          continue;
        }
        var date = fromOrdinal(ii.yearordinal + currentDay);
        for (var k = 0; k < timeset.length; k++) {
          var time = timeset[k];
          var res = combine(date, time);
          if (until && res > until) {
            return emitResult(iterResult);
          }
          if (res >= dtstart) {
            var rezonedDate = rezoneIfNeeded(res, options);
            if (!iterResult.accept(rezonedDate)) {
              return emitResult(iterResult);
            }
            if (count) {
              --count;
              if (!count) {
                return emitResult(iterResult);
              }
            }
          }
        }
      }
    }
    if (options.interval === 0) {
      return emitResult(iterResult);
    }
    counterDate.add(options, filtered);
    if (counterDate.year > MAXYEAR) {
      return emitResult(iterResult);
    }
    if (!freqIsDailyOrGreater(freq)) {
      timeset = ii.gettimeset(freq)(counterDate.hour, counterDate.minute, counterDate.second, 0);
    }
    ii.rebuild(counterDate.year, counterDate.month);
  }
}
function isFiltered(ii, currentDay, options) {
  var bymonth = options.bymonth, byweekno = options.byweekno, byweekday = options.byweekday, byeaster = options.byeaster, bymonthday = options.bymonthday, bynmonthday = options.bynmonthday, byyearday = options.byyearday;
  return notEmpty(bymonth) && !includes(bymonth, ii.mmask[currentDay]) || notEmpty(byweekno) && !ii.wnomask[currentDay] || notEmpty(byweekday) && !includes(byweekday, ii.wdaymask[currentDay]) || notEmpty(ii.nwdaymask) && !ii.nwdaymask[currentDay] || byeaster !== null && !includes(ii.eastermask, currentDay) || (notEmpty(bymonthday) || notEmpty(bynmonthday)) && !includes(bymonthday, ii.mdaymask[currentDay]) && !includes(bynmonthday, ii.nmdaymask[currentDay]) || notEmpty(byyearday) && (currentDay < ii.yearlen && !includes(byyearday, currentDay + 1) && !includes(byyearday, -ii.yearlen + currentDay) || currentDay >= ii.yearlen && !includes(byyearday, currentDay + 1 - ii.yearlen) && !includes(byyearday, -ii.nextyearlen + currentDay - ii.yearlen));
}
function rezoneIfNeeded(date, options) {
  return new DateWithZone(date, options.tzid).rezonedDate();
}
function emitResult(iterResult) {
  return iterResult.getValue();
}
function removeFilteredDays(dayset, start, end, ii, options) {
  var filtered = false;
  for (var dayCounter = start; dayCounter < end; dayCounter++) {
    var currentDay = dayset[dayCounter];
    filtered = isFiltered(ii, currentDay, options);
    if (filtered)
      dayset[currentDay] = null;
  }
  return filtered;
}
function makeTimeset(ii, counterDate, options) {
  var freq = options.freq, byhour = options.byhour, byminute = options.byminute, bysecond = options.bysecond;
  if (freqIsDailyOrGreater(freq)) {
    return buildTimeset(options);
  }
  if (freq >= RRule.HOURLY && notEmpty(byhour) && !includes(byhour, counterDate.hour) || freq >= RRule.MINUTELY && notEmpty(byminute) && !includes(byminute, counterDate.minute) || freq >= RRule.SECONDLY && notEmpty(bysecond) && !includes(bysecond, counterDate.second)) {
    return [];
  }
  return ii.gettimeset(freq)(counterDate.hour, counterDate.minute, counterDate.second, counterDate.millisecond);
}

// vendor/rrule/rrule.js
var Days = {
  MO: new Weekday(0),
  TU: new Weekday(1),
  WE: new Weekday(2),
  TH: new Weekday(3),
  FR: new Weekday(4),
  SA: new Weekday(5),
  SU: new Weekday(6)
};
var DEFAULT_OPTIONS = {
  freq: Frequency.YEARLY,
  dtstart: null,
  interval: 1,
  wkst: Days.MO,
  count: null,
  until: null,
  tzid: null,
  bysetpos: null,
  bymonth: null,
  bymonthday: null,
  bynmonthday: null,
  byyearday: null,
  byweekno: null,
  byweekday: null,
  bynweekday: null,
  byhour: null,
  byminute: null,
  bysecond: null,
  byeaster: null
};
var defaultKeys = Object.keys(DEFAULT_OPTIONS);
var RRule = (
  /** @class */
  (function() {
    function RRule2(options, noCache) {
      if (options === void 0) {
        options = {};
      }
      if (noCache === void 0) {
        noCache = false;
      }
      this._cache = noCache ? null : new Cache();
      this.origOptions = initializeOptions(options);
      var parsedOptions = parseOptions(options).parsedOptions;
      this.options = parsedOptions;
    }
    RRule2.parseText = function(text, language) {
      return parseText(text, language);
    };
    RRule2.fromText = function(text, language) {
      return fromText(text, language);
    };
    RRule2.fromString = function(str) {
      return new RRule2(RRule2.parseString(str) || void 0);
    };
    RRule2.prototype._iter = function(iterResult) {
      return iter(iterResult, this.options);
    };
    RRule2.prototype._cacheGet = function(what, args) {
      if (!this._cache)
        return false;
      return this._cache._cacheGet(what, args);
    };
    RRule2.prototype._cacheAdd = function(what, value, args) {
      if (!this._cache)
        return;
      return this._cache._cacheAdd(what, value, args);
    };
    RRule2.prototype.all = function(iterator) {
      if (iterator) {
        return this._iter(new callbackiterresult_default("all", {}, iterator));
      }
      var result = this._cacheGet("all");
      if (result === false) {
        result = this._iter(new iterresult_default("all", {}));
        this._cacheAdd("all", result);
      }
      return result;
    };
    RRule2.prototype.between = function(after, before, inc, iterator) {
      if (inc === void 0) {
        inc = false;
      }
      if (!isValidDate(after) || !isValidDate(before)) {
        throw new Error("Invalid date passed in to RRule.between");
      }
      var args = {
        before,
        after,
        inc
      };
      if (iterator) {
        return this._iter(new callbackiterresult_default("between", args, iterator));
      }
      var result = this._cacheGet("between", args);
      if (result === false) {
        result = this._iter(new iterresult_default("between", args));
        this._cacheAdd("between", result, args);
      }
      return result;
    };
    RRule2.prototype.before = function(dt, inc) {
      if (inc === void 0) {
        inc = false;
      }
      if (!isValidDate(dt)) {
        throw new Error("Invalid date passed in to RRule.before");
      }
      var args = { dt, inc };
      var result = this._cacheGet("before", args);
      if (result === false) {
        result = this._iter(new iterresult_default("before", args));
        this._cacheAdd("before", result, args);
      }
      return result;
    };
    RRule2.prototype.after = function(dt, inc) {
      if (inc === void 0) {
        inc = false;
      }
      if (!isValidDate(dt)) {
        throw new Error("Invalid date passed in to RRule.after");
      }
      var args = { dt, inc };
      var result = this._cacheGet("after", args);
      if (result === false) {
        result = this._iter(new iterresult_default("after", args));
        this._cacheAdd("after", result, args);
      }
      return result;
    };
    RRule2.prototype.count = function() {
      return this.all().length;
    };
    RRule2.prototype.toString = function() {
      return optionsToString(this.origOptions);
    };
    RRule2.prototype.toText = function(gettext, language, dateFormatter) {
      return toText(this, gettext, language, dateFormatter);
    };
    RRule2.prototype.isFullyConvertibleToText = function() {
      return isFullyConvertible(this);
    };
    RRule2.prototype.clone = function() {
      return new RRule2(this.origOptions);
    };
    RRule2.FREQUENCIES = [
      "YEARLY",
      "MONTHLY",
      "WEEKLY",
      "DAILY",
      "HOURLY",
      "MINUTELY",
      "SECONDLY"
    ];
    RRule2.YEARLY = Frequency.YEARLY;
    RRule2.MONTHLY = Frequency.MONTHLY;
    RRule2.WEEKLY = Frequency.WEEKLY;
    RRule2.DAILY = Frequency.DAILY;
    RRule2.HOURLY = Frequency.HOURLY;
    RRule2.MINUTELY = Frequency.MINUTELY;
    RRule2.SECONDLY = Frequency.SECONDLY;
    RRule2.MO = Days.MO;
    RRule2.TU = Days.TU;
    RRule2.WE = Days.WE;
    RRule2.TH = Days.TH;
    RRule2.FR = Days.FR;
    RRule2.SA = Days.SA;
    RRule2.SU = Days.SU;
    RRule2.parseString = parseString;
    RRule2.optionsToString = optionsToString;
    return RRule2;
  })()
);

// vendor/rrule/iterset.js
function iterSet(iterResult, _rrule, _exrule, _rdate, _exdate, tzid) {
  var _exdateHash = {};
  var _accept = iterResult.accept;
  function evalExdate(after, before) {
    _exrule.forEach(function(rrule) {
      rrule.between(after, before, true).forEach(function(date) {
        _exdateHash[Number(date)] = true;
      });
    });
  }
  _exdate.forEach(function(date) {
    var zonedDate2 = new DateWithZone(date, tzid).rezonedDate();
    _exdateHash[Number(zonedDate2)] = true;
  });
  iterResult.accept = function(date) {
    var dt = Number(date);
    if (isNaN(dt))
      return _accept.call(this, date);
    if (!_exdateHash[dt]) {
      evalExdate(new Date(dt - 1), new Date(dt + 1));
      if (!_exdateHash[dt]) {
        _exdateHash[dt] = true;
        return _accept.call(this, date);
      }
    }
    return true;
  };
  if (iterResult.method === "between") {
    evalExdate(iterResult.args.after, iterResult.args.before);
    iterResult.accept = function(date) {
      var dt = Number(date);
      if (!_exdateHash[dt]) {
        _exdateHash[dt] = true;
        return _accept.call(this, date);
      }
      return true;
    };
  }
  for (var i = 0; i < _rdate.length; i++) {
    var zonedDate = new DateWithZone(_rdate[i], tzid).rezonedDate();
    if (!iterResult.accept(new Date(zonedDate.getTime())))
      break;
  }
  _rrule.forEach(function(rrule) {
    iter(iterResult, rrule.options);
  });
  var res = iterResult._result;
  sort(res);
  switch (iterResult.method) {
    case "all":
    case "between":
      return res;
    case "before":
      return res.length && res[res.length - 1] || null;
    case "after":
    default:
      return res.length && res[0] || null;
  }
}

// vendor/rrule/rrulestr.js
var DEFAULT_OPTIONS2 = {
  dtstart: null,
  cache: false,
  unfold: false,
  forceset: false,
  compatible: false,
  tzid: null
};
function parseInput(s, options) {
  var rrulevals = [];
  var rdatevals = [];
  var exrulevals = [];
  var exdatevals = [];
  var parsedDtstart = parseDtstart(s);
  var dtstart = parsedDtstart.dtstart;
  var tzid = parsedDtstart.tzid;
  var lines = splitIntoLines(s, options.unfold);
  lines.forEach(function(line) {
    var _a;
    if (!line)
      return;
    var _b = breakDownLine(line), name = _b.name, parms = _b.parms, value = _b.value;
    switch (name.toUpperCase()) {
      case "RRULE":
        if (parms.length) {
          throw new Error("unsupported RRULE parm: ".concat(parms.join(",")));
        }
        rrulevals.push(parseString(line));
        break;
      case "RDATE":
        var _c = (_a = /RDATE(?:;TZID=([^:=]+))?/i.exec(line)) !== null && _a !== void 0 ? _a : [], rdateTzid = _c[1];
        if (rdateTzid && !tzid) {
          tzid = rdateTzid;
        }
        rdatevals = rdatevals.concat(parseRDate(value, parms));
        break;
      case "EXRULE":
        if (parms.length) {
          throw new Error("unsupported EXRULE parm: ".concat(parms.join(",")));
        }
        exrulevals.push(parseString(value));
        break;
      case "EXDATE":
        exdatevals = exdatevals.concat(parseRDate(value, parms));
        break;
      case "DTSTART":
        break;
      default:
        throw new Error("unsupported property: " + name);
    }
  });
  return {
    dtstart,
    tzid,
    rrulevals,
    rdatevals,
    exrulevals,
    exdatevals
  };
}
function buildRule(s, options) {
  var _a = parseInput(s, options), rrulevals = _a.rrulevals, rdatevals = _a.rdatevals, exrulevals = _a.exrulevals, exdatevals = _a.exdatevals, dtstart = _a.dtstart, tzid = _a.tzid;
  var noCache = options.cache === false;
  if (options.compatible) {
    options.forceset = true;
    options.unfold = true;
  }
  if (options.forceset || rrulevals.length > 1 || rdatevals.length || exrulevals.length || exdatevals.length) {
    var rset_1 = new RRuleSet(noCache);
    rset_1.dtstart(dtstart);
    rset_1.tzid(tzid || void 0);
    rrulevals.forEach(function(val2) {
      rset_1.rrule(new RRule(groomRruleOptions(val2, dtstart, tzid), noCache));
    });
    rdatevals.forEach(function(date) {
      rset_1.rdate(date);
    });
    exrulevals.forEach(function(val2) {
      rset_1.exrule(new RRule(groomRruleOptions(val2, dtstart, tzid), noCache));
    });
    exdatevals.forEach(function(date) {
      rset_1.exdate(date);
    });
    if (options.compatible && options.dtstart)
      rset_1.rdate(dtstart);
    return rset_1;
  }
  var val = rrulevals[0] || {};
  return new RRule(groomRruleOptions(val, val.dtstart || options.dtstart || dtstart, val.tzid || options.tzid || tzid), noCache);
}
function rrulestr(s, options) {
  if (options === void 0) {
    options = {};
  }
  return buildRule(s, initializeOptions2(options));
}
function groomRruleOptions(val, dtstart, tzid) {
  return __assign(__assign({}, val), { dtstart, tzid });
}
function initializeOptions2(options) {
  var invalid = [];
  var keys = Object.keys(options);
  var defaultKeys2 = Object.keys(DEFAULT_OPTIONS2);
  keys.forEach(function(key) {
    if (!includes(defaultKeys2, key))
      invalid.push(key);
  });
  if (invalid.length) {
    throw new Error("Invalid options: " + invalid.join(", "));
  }
  return __assign(__assign({}, DEFAULT_OPTIONS2), options);
}
function extractName(line) {
  if (line.indexOf(":") === -1) {
    return {
      name: "RRULE",
      value: line
    };
  }
  var _a = split(line, ":", 1), name = _a[0], value = _a[1];
  return {
    name,
    value
  };
}
function breakDownLine(line) {
  var _a = extractName(line), name = _a.name, value = _a.value;
  var parms = name.split(";");
  if (!parms)
    throw new Error("empty property name");
  return {
    name: parms[0].toUpperCase(),
    parms: parms.slice(1),
    value
  };
}
function splitIntoLines(s, unfold) {
  if (unfold === void 0) {
    unfold = false;
  }
  s = s && s.trim();
  if (!s)
    throw new Error("Invalid empty string");
  if (!unfold) {
    return s.split(/\s/);
  }
  var lines = s.split("\n");
  var i = 0;
  while (i < lines.length) {
    var line = lines[i] = lines[i].replace(/\s+$/g, "");
    if (!line) {
      lines.splice(i, 1);
    } else if (i > 0 && line[0] === " ") {
      lines[i - 1] += line.slice(1);
      lines.splice(i, 1);
    } else {
      i += 1;
    }
  }
  return lines;
}
function validateDateParm(parms) {
  parms.forEach(function(parm) {
    if (!/(VALUE=DATE(-TIME)?)|(TZID=)/.test(parm)) {
      throw new Error("unsupported RDATE/EXDATE parm: " + parm);
    }
  });
}
function parseRDate(rdateval, parms) {
  validateDateParm(parms);
  return rdateval.split(",").map(function(datestr) {
    return untilStringToDate(datestr);
  });
}

// vendor/rrule/rruleset.js
function createGetterSetter(fieldName) {
  var _this = this;
  return function(field2) {
    if (field2 !== void 0) {
      _this["_".concat(fieldName)] = field2;
    }
    if (_this["_".concat(fieldName)] !== void 0) {
      return _this["_".concat(fieldName)];
    }
    for (var i = 0; i < _this._rrule.length; i++) {
      var field_1 = _this._rrule[i].origOptions[fieldName];
      if (field_1) {
        return field_1;
      }
    }
  };
}
var RRuleSet = (
  /** @class */
  (function(_super) {
    __extends(RRuleSet2, _super);
    function RRuleSet2(noCache) {
      if (noCache === void 0) {
        noCache = false;
      }
      var _this = _super.call(this, {}, noCache) || this;
      _this.dtstart = createGetterSetter.apply(_this, ["dtstart"]);
      _this.tzid = createGetterSetter.apply(_this, ["tzid"]);
      _this._rrule = [];
      _this._rdate = [];
      _this._exrule = [];
      _this._exdate = [];
      return _this;
    }
    RRuleSet2.prototype._iter = function(iterResult) {
      return iterSet(iterResult, this._rrule, this._exrule, this._rdate, this._exdate, this.tzid());
    };
    RRuleSet2.prototype.rrule = function(rrule) {
      _addRule(rrule, this._rrule);
    };
    RRuleSet2.prototype.exrule = function(rrule) {
      _addRule(rrule, this._exrule);
    };
    RRuleSet2.prototype.rdate = function(date) {
      _addDate(date, this._rdate);
    };
    RRuleSet2.prototype.exdate = function(date) {
      _addDate(date, this._exdate);
    };
    RRuleSet2.prototype.rrules = function() {
      return this._rrule.map(function(e) {
        return rrulestr(e.toString());
      });
    };
    RRuleSet2.prototype.exrules = function() {
      return this._exrule.map(function(e) {
        return rrulestr(e.toString());
      });
    };
    RRuleSet2.prototype.rdates = function() {
      return this._rdate.map(function(e) {
        return new Date(e.getTime());
      });
    };
    RRuleSet2.prototype.exdates = function() {
      return this._exdate.map(function(e) {
        return new Date(e.getTime());
      });
    };
    RRuleSet2.prototype.valueOf = function() {
      var result = [];
      if (!this._rrule.length && this._dtstart) {
        result = result.concat(optionsToString({ dtstart: this._dtstart }));
      }
      this._rrule.forEach(function(rrule) {
        result = result.concat(rrule.toString().split("\n"));
      });
      this._exrule.forEach(function(exrule) {
        result = result.concat(exrule.toString().split("\n").map(function(line) {
          return line.replace(/^RRULE:/, "EXRULE:");
        }).filter(function(line) {
          return !/^DTSTART/.test(line);
        }));
      });
      if (this._rdate.length) {
        result.push(rdatesToString("RDATE", this._rdate, this.tzid()));
      }
      if (this._exdate.length) {
        result.push(rdatesToString("EXDATE", this._exdate, this.tzid()));
      }
      return result;
    };
    RRuleSet2.prototype.toString = function() {
      return this.valueOf().join("\n");
    };
    RRuleSet2.prototype.clone = function() {
      var rrs = new RRuleSet2(!!this._cache);
      this._rrule.forEach(function(rule) {
        return rrs.rrule(rule.clone());
      });
      this._exrule.forEach(function(rule) {
        return rrs.exrule(rule.clone());
      });
      this._rdate.forEach(function(date) {
        return rrs.rdate(new Date(date.getTime()));
      });
      this._exdate.forEach(function(date) {
        return rrs.exdate(new Date(date.getTime()));
      });
      return rrs;
    };
    return RRuleSet2;
  })(RRule)
);
function _addRule(rrule, collection) {
  if (!(rrule instanceof RRule)) {
    throw new TypeError(String(rrule) + " is not RRule instance");
  }
  if (!includes(collection.map(String), String(rrule))) {
    collection.push(rrule);
  }
}
function _addDate(date, collection) {
  if (!(date instanceof Date)) {
    throw new TypeError(String(date) + " is not Date instance");
  }
  if (!includes(collection.map(Number), Number(date))) {
    collection.push(date);
    sort(collection);
  }
}
function rdatesToString(param, rdates, tzid) {
  var isUTC = !tzid || tzid.toUpperCase() === "UTC";
  var header = isUTC ? "".concat(param, ":") : "".concat(param, ";TZID=").concat(tzid, ":");
  var dateString = rdates.map(function(rdate) {
    return timeToUntilString(rdate.valueOf(), isUTC);
  }).join(",");
  return "".concat(header).concat(dateString);
}

// src/core/recurrence.ts
function normalizeRule(raw) {
  const s = String(raw ?? "").trim();
  const aliases = {
    daily: "FREQ=DAILY",
    weekly: "FREQ=WEEKLY",
    monthly: "FREQ=MONTHLY",
    yearly: "FREQ=YEARLY",
    weekdays: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
  };
  return Object.prototype.hasOwnProperty.call(aliases, s.toLowerCase()) ? aliases[s.toLowerCase()] : s.replace(/^RRULE:/i, "");
}
function recurrenceEnd(raw) {
  const value = normalizeRule(raw).split(";").find((part) => part.startsWith("UNTIL="))?.slice(6);
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})(?:T\d{6}Z?)?$/);
  return match ? dateKey(`${match[1]}-${match[2]}-${match[3]}`) : "";
}
function withRecurrenceEnd(raw, end) {
  const rule = normalizeRule(raw);
  if (end && dateKey(end) !== end) throw new Error("Invalid recurrence end date.");
  if (end === recurrenceEnd(rule)) return rule;
  const fields = rule.split(";").filter((part) => !part.startsWith("UNTIL="));
  if (end) fields.push(`UNTIL=${end.replaceAll("-", "")}T235959Z`);
  return fields.join(";");
}
function makeRule(rule, anchor) {
  if (!anchor || dateKey(anchor) !== anchor)
    throw new Error("A recurring task needs a start date.");
  if (Number(anchor.slice(0, 4)) < 1900)
    throw new Error("Recurring tasks must start in 1900 or later.");
  if (rule.length > 1024) throw new Error("Recurrence rule is too long.");
  const fields = /* @__PURE__ */ new Map();
  const allowed = /* @__PURE__ */ new Set([
    "FREQ",
    "INTERVAL",
    "COUNT",
    "UNTIL",
    "BYMONTH",
    "BYMONTHDAY",
    "BYDAY",
    "BYYEARDAY",
    "BYWEEKNO",
    "BYSETPOS",
    "WKST",
    "BYHOUR",
    "BYMINUTE",
    "BYSECOND"
  ]);
  for (const part of rule.split(";")) {
    const [key, value, extra] = part.split("=");
    if (!key || !value || extra !== void 0 || !allowed.has(key) || fields.has(key))
      throw new Error("Invalid or duplicate recurrence field.");
    fields.set(key, value);
  }
  for (const key of ["INTERVAL", "COUNT"]) {
    const value = fields.get(key);
    if (value && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 1e5))
      throw new Error(`${key} must be a positive integer no greater than 100000.`);
  }
  for (const key of ["BYHOUR", "BYMINUTE", "BYSECOND"])
    if (fields.has(key) && fields.get(key) !== "0")
      throw new Error(
        "RRULE supports one occurrence per calendar day; set appointment time in the time field."
      );
  const bounds = {
    BYMONTH: 12,
    BYMONTHDAY: 31,
    BYYEARDAY: 366,
    BYWEEKNO: 53,
    BYSETPOS: 366
  };
  for (const [key, limit] of Object.entries(bounds)) {
    const value = fields.get(key);
    if (value && value.split(",").some(
      (v) => !/^-?\d+$/.test(v) || Number(v) === 0 || Math.abs(Number(v)) > limit || key === "BYMONTH" && Number(v) < 1
    ))
      throw new Error(`Invalid ${key} value.`);
  }
  if (fields.has("BYMONTH") && fields.has("BYMONTHDAY")) {
    const months = fields.get("BYMONTH").split(",").map(Number);
    const days = fields.get("BYMONTHDAY").split(",").map(Number);
    const maxDays = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (!months.some((m) => days.some((d) => Math.abs(d) <= maxDays[m])))
      throw new Error("Month/day constraints cannot produce a calendar date.");
  }
  const weekdays = fields.get("BYDAY");
  if (weekdays && weekdays.split(",").some(
    (v) => !/^([+-]?[1-9]\d?)?(MO|TU|WE|TH|FR|SA|SU)$/.test(v) || Math.abs(parseInt(v) || 0) > 53
  ))
    throw new Error("Invalid BYDAY value.");
  const options = RRule.parseString(rule);
  if (options.freq === void 0 || ![RRule.DAILY, RRule.WEEKLY, RRule.MONTHLY, RRule.YEARLY].includes(options.freq))
    throw new Error("Use a daily, weekly, monthly or yearly rule.");
  if (options.interval !== void 0 && options.interval < 1)
    throw new Error("Recurrence interval must be positive.");
  if (weekdays && /[\d]/.test(weekdays) && (options.freq === RRule.DAILY || options.freq === RRule.WEEKLY || fields.has("BYWEEKNO")))
    throw new Error("Ordinal weekdays require a monthly/yearly rule without BYWEEKNO.");
  const until = fields.get("UNTIL");
  if (until) {
    const match = until.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
    if (!match || !dateKey(`${match[1]}-${match[2]}-${match[3]}`) || Number(match[4] || 0) > 23 || Number(match[5] || 0) > 59 || Number(match[6] || 0) > 59)
      throw new Error("Invalid recurrence end date.");
    if (`${match[1]}-${match[2]}-${match[3]}` < anchor)
      throw new Error("Recurrence end date must not precede the start date.");
  }
  return new RRule({ ...options, dtstart: utc(anchor) }, true);
}
function queryRule(rule, anchor, from) {
  const original = makeRule(rule, anchor);
  const options = original.origOptions;
  if (!options.count && (options.freq === RRule.DAILY || options.freq === RRule.WEEKLY) && from > anchor) {
    const period = (options.interval || 1) * (options.freq === RRule.DAILY ? 1 : 7);
    const periods = Math.max(0, Math.floor(distance(anchor, from) / period) - 1);
    if (periods)
      return new RRule({ ...options, dtstart: utc(addDays(anchor, periods * period)) }, true);
  }
  return original;
}
function validateRule(rule, anchor) {
  if (!rule) return "";
  try {
    makeRule(rule, anchor);
    return "";
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
function repeatDates(rule, anchor, from, to) {
  const queried = queryRule(rule, anchor, from);
  const options = queried.origOptions;
  if ((options.freq === RRule.DAILY || options.freq === RRule.WEEKLY) && rule.split(";").every((field2) => /^(FREQ|INTERVAL|COUNT|UNTIL)=/.test(field2))) {
    const step = (options.interval || 1) * (options.freq === RRule.DAILY ? 1 : 7) * 864e5;
    const origin = utc(anchor).valueOf();
    const first = Math.max(0, Math.ceil((utc(from).valueOf() - origin) / step));
    const end = Math.min(utc(to).valueOf(), options.until?.valueOf() ?? Infinity);
    const result = [];
    for (let i = first; (!options.count || i < options.count) && origin + i * step <= end; i++) {
      if (result.length >= 2e4) {
        const e = new Error("Recurrence exceeds the safe calculation budget; shorten its history.");
        e.name = "RecurrenceLimitError";
        throw e;
      }
      result.push(new Date(origin + i * step).toISOString().slice(0, 10));
    }
    return result;
  }
  return queried.between(utc(from), utc(to), true).map((d) => d.toISOString().slice(0, 10));
}
function firstRepeatDate(rule, anchor) {
  return makeRule(rule, anchor).after(utc(anchor), true)?.toISOString().slice(0, 10) || "";
}

// src/core/normalize.ts
function safeAmount(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e12 ? value : null;
}
function safeCurrency(value) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : "USD";
}
function normalizeTask(path, fm) {
  const paymentCancelled = String(fm.taskType ?? fm.kind).toLowerCase() === "payment" && /^(cancelled|canceled|archived|archive)$/i.test(String(fm.status));
  const status = paymentCancelled ? "failed" : normalizeStatus(fm.status);
  const kind = String(fm.taskType ?? fm.kind ?? "task").toLowerCase();
  const recurrence = normalizeRule(fm.recurrence ?? fm.repeat);
  const scheduled = dateKey(fm.scheduled) || (recurrence && kind !== "subscription" ? dateKey(fm.dateCreated) : "");
  const occurrences = {};
  for (const k of strings(fm.complete_instances ?? fm.completeInstances)) {
    const d = dateKey(k);
    if (d) occurrences[d] = { status: "done" };
  }
  if (fm.topOccurrences && typeof fm.topOccurrences === "object") {
    for (const [k, v] of Object.entries(fm.topOccurrences))
      if (dateKey(k) === k && v && typeof v === "object" && !Array.isArray(v)) {
        const r = v;
        occurrences[k] = {
          status: normalizeStatus(r.status),
          minutes: safeMinutes(r.minutes),
          resolvedAt: r.resolvedAt ? String(r.resolvedAt) : void 0,
          resolvedOn: dateKey(r.resolvedOn),
          ...Object.prototype.hasOwnProperty.call(r, "amount") ? { amount: safeAmount(r.amount), currency: safeCurrency(r.currency) } : {}
        };
      }
  }
  const moves = {};
  if (fm.topMoves && typeof fm.topMoves === "object") {
    for (const [k, v] of Object.entries(fm.topMoves))
      if (dateKey(k) === k && dateKey(v)) moves[k] = dateKey(v);
  }
  const charges = {};
  if (fm.topCharges && typeof fm.topCharges === "object" && !Array.isArray(fm.topCharges)) {
    for (const [key, raw] of Object.entries(fm.topCharges)) {
      if (dateKey(key) !== key || !raw || typeof raw !== "object") continue;
      const r = raw, amount = safeAmount(r.amount), paidOn = dateKey(r.paidOn);
      if (amount !== null && paidOn)
        charges[key] = { amount, currency: safeCurrency(r.currency), paidOn };
    }
  }
  const payment = fm.topPayment && typeof fm.topPayment === "object" ? fm.topPayment : void 0;
  const kinds = ["task", "meeting", "payment", "status", "subscription"];
  return {
    path,
    title: title(fm, path),
    description: typeof fm.description === "string" ? fm.description : "",
    status,
    kind: kinds.includes(kind) ? kind : "task",
    project: link(fm.project ?? fm.projects),
    scheduled,
    scheduledTime: timeKey(fm.scheduledTime),
    workDates: [...new Set(strings(fm.workDates).map(dateKey).filter(Boolean))].sort(),
    plannedMinutes: safeMinutes(fm.plannedMinutes),
    due: dateKey(fm.due),
    recurrence,
    seriesEnd: dateKey(fm.topSeriesEnd),
    occurrences,
    moves,
    skipped: strings(fm.topSkipped).map(dateKey).filter(Boolean),
    minutes: safeMinutes(fm.actualMinutes ?? fm.topMinutes),
    resolvedOn: status === "done" ? dateKey(fm.completedDate) : status === "failed" ? dateKey(fm.failedDate) : "",
    priority: fm.priority === "high" ? "high" : "normal",
    unsupportedRepeat: kind !== "subscription" && recurrence ? validateRule(recurrence, scheduled) : "",
    amount: safeAmount(fm.amount),
    currency: safeCurrency(fm.currency),
    charges,
    ...payment ? {
      payment: { amount: safeAmount(payment.amount), currency: safeCurrency(payment.currency) }
    } : {},
    billingPeriod: fm.billingPeriod === "yearly" || !fm.billingPeriod && /FREQ=YEARLY/.test(recurrence) ? "yearly" : "monthly",
    subscriptionActive: typeof fm.subscriptionActive === "boolean" ? fm.subscriptionActive : status !== "done" && status !== "failed"
  };
}
function normalizeProject(path, fm) {
  return {
    path,
    title: title(fm, path),
    area: link(fm.area),
    status: normalizeStatus(fm.status ?? "backlog"),
    due: dateKey(fm.due),
    monthlyBudget: safeAmount(fm.monthlyBudget),
    budgetCurrency: safeCurrency(fm.budgetCurrency)
  };
}
function normalizeArea(path, fm) {
  return {
    path,
    title: title(fm, path),
    monthlyBudget: safeAmount(fm.monthlyBudget),
    budgetCurrency: safeCurrency(fm.budgetCurrency)
  };
}

// src/services/repository.ts
function frontmatter(text) {
  const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const data = (0, import_obsidian.parseYaml)(match[1]);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}
var Repository = class {
  constructor(app) {
    this.app = app;
  }
  tasks = /* @__PURE__ */ new Map();
  projects = /* @__PURE__ */ new Map();
  areas = /* @__PURE__ */ new Map();
  revisions = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  cached;
  projectIndex = /* @__PURE__ */ new Map();
  areaIndex = /* @__PURE__ */ new Map();
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    this.cached = void 0;
    for (const fn of this.listeners) fn();
  }
  snapshot() {
    if (this.cached) return this.cached;
    const projects = [...this.projects.values()];
    const areas = [...this.areas.values()];
    const index = (items) => {
      const paths = new Set(items.map((item) => item.path));
      const names = /* @__PURE__ */ new Map();
      for (const item of items)
        for (const name of /* @__PURE__ */ new Set([
          item.title,
          item.path.split("/").pop().replace(/\.md$/, "")
        ])) {
          const group = names.get(name) || /* @__PURE__ */ new Set();
          group.add(item.path);
          names.set(name, group);
        }
      return { paths, names };
    };
    const projectLookup = index(projects), areaLookup = index(areas);
    const resolve = (raw, source, lookup) => {
      if (!raw) return "";
      const full = raw.endsWith(".md") ? raw : raw + ".md";
      if (lookup.paths.has(full)) return full;
      const aliases = lookup.names.get(raw);
      if (!raw.includes("/") && aliases && aliases.size > 1) return raw;
      const linked = this.app.metadataCache.getFirstLinkpathDest(raw, source);
      if (linked && lookup.paths.has(linked.path)) return linked.path;
      return aliases?.size === 1 ? [...aliases][0] : raw;
    };
    this.cached = {
      tasks: [...this.tasks.values()].map((t) => ({
        ...t,
        project: resolve(t.project, t.path, projectLookup)
      })),
      projects: projects.map((p) => ({ ...p, area: resolve(p.area, p.path, areaLookup) })),
      areas
    };
    this.projectIndex = new Map(this.cached.projects.map((p) => [p.path, p]));
    this.areaIndex = new Map(areas.map((a) => [a.path, a]));
    return this.cached;
  }
  project(path) {
    this.snapshot();
    return this.projectIndex.get(path);
  }
  areaTitle(path) {
    this.snapshot();
    return this.areaIndex.get(path)?.title || "";
  }
  async load() {
    const files = this.app.vault.getMarkdownFiles();
    const present = new Set(files.map((file) => file.path));
    for (const path of /* @__PURE__ */ new Set([
      ...this.tasks.keys(),
      ...this.projects.keys(),
      ...this.areas.keys()
    ]))
      if (!present.has(path)) this.remove(path, false);
    const errors = [];
    for (let i = 0; i < files.length; i += 24) {
      const results = await Promise.allSettled(
        files.slice(i, i + 24).map((f) => this.refresh(f, false))
      );
      for (const result of results)
        if (result.status === "rejected")
          errors.push(
            String(result.reason instanceof Error ? result.reason.message : result.reason)
          );
    }
    this.emit();
    if (errors.length) throw new Error(errors.join("\n"));
  }
  remove(path, emit = true, descendants = !path.endsWith(".md")) {
    this.cached = void 0;
    const paths = descendants ? /* @__PURE__ */ new Set([
      path,
      ...this.revisions.keys(),
      ...this.tasks.keys(),
      ...this.projects.keys(),
      ...this.areas.keys()
    ]) : [path];
    for (const key of paths) {
      if (key !== path && !key.startsWith(path + "/")) continue;
      this.revisions.set(key, (this.revisions.get(key) || 0) + 1);
      this.tasks.delete(key);
      this.projects.delete(key);
      this.areas.delete(key);
    }
    if (emit) this.emit();
  }
  async refresh(file, emit = true) {
    const path = file.path;
    const rev = (this.revisions.get(path) || 0) + 1;
    this.revisions.set(path, rev);
    const text = await this.app.vault.read(file);
    const header = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
    const had = this.tasks.has(path) || this.projects.has(path) || this.areas.has(path);
    if (!header.includes("topSchema") && !had) return;
    let fm;
    try {
      fm = frontmatter(text);
    } catch (error) {
      if (this.revisions.get(path) !== rev) return;
      this.remove(path, emit);
      throw new Error(
        `Invalid planner metadata: ${path}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (this.revisions.get(path) !== rev) return;
    this.cached = void 0;
    this.tasks.delete(path);
    this.projects.delete(path);
    this.areas.delete(path);
    if (fm.topSchema !== void 0 && Number(fm.topSchema) > 1) {
      if (emit) this.emit();
      throw new Error(`Unsupported future planner schema: ${path}`);
    }
    if (Number(fm.topSchema) === 1) {
      if (fm.type === "task") this.tasks.set(path, normalizeTask(path, fm));
      if (fm.type === "project") this.projects.set(path, normalizeProject(path, fm));
      if (fm.type === "area") this.areas.set(path, normalizeArea(path, fm));
    }
    if (emit) this.emit();
  }
};

// src/services/tasks.ts
var import_obsidian2 = require("obsidian");
var TaskService = class {
  constructor(app, repo, folder) {
    this.app = app;
    this.repo = repo;
    this.folder = folder;
  }
  queues = /* @__PURE__ */ new Map();
  undoStack = [];
  undoQueue = Promise.resolve();
  get canUndo() {
    return this.undoStack.length > 0;
  }
  file(path) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof import_obsidian2.TFile)) throw new Error(`Note not found: ${path}`);
    return f;
  }
  async ensureFolder(path) {
    let cursor = "";
    for (const part of (0, import_obsidian2.normalizePath)(path).split("/").filter(Boolean)) {
      cursor = cursor ? cursor + "/" + part : part;
      const current = this.app.vault.getAbstractFileByPath(cursor);
      if (current && !(current instanceof import_obsidian2.TFolder))
        throw new Error(`A file blocks the planner folder: ${cursor}`);
      if (!current)
        try {
          await this.app.vault.createFolder(cursor);
        } catch (error) {
          if (!(this.app.vault.getAbstractFileByPath(cursor) instanceof import_obsidian2.TFolder)) throw error;
        }
    }
  }
  remember(entry) {
    this.undoStack.push(entry);
    if (this.undoStack.length > 50) this.undoStack.shift();
  }
  serial(path, fn) {
    const previous = this.queues.get(path) || Promise.resolve();
    const next = previous.catch(() => void 0).then(fn);
    this.queues.set(path, next);
    void next.finally(() => {
      if (this.queues.get(path) === next) this.queues.delete(path);
    }).catch(() => void 0);
    return next;
  }
  async patch(path, change, remember = true) {
    return this.serial(path, async () => {
      const file = this.file(path);
      let undo;
      await this.app.fileManager.processFrontMatter(file, (raw) => {
        const fm = raw;
        if (Number(fm.topSchema) > SCHEMA) throw new Error("Cannot edit a future planner schema.");
        if (Number(fm.topSchema) !== SCHEMA || !["task", "project", "area"].includes(String(fm.type)))
          throw new Error("This note is no longer a supported planner note.");
        const before = structuredClone(fm);
        change(fm);
        if (fm.type === "project" && fm.status !== before.status && !STATUSES.includes(fm.status))
          throw new Error("Invalid project status.");
        fm.topSchema = SCHEMA;
        const after = structuredClone(fm);
        const keys = [.../* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])].filter(
          (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
        );
        undo = { path, before, after, keys };
      });
      if (remember && undo && "keys" in undo && undo.keys.length) this.remember(undo);
      await this.repo.refresh(file);
    });
  }
  patchTask(path, change) {
    return this.patch(path, (fm) => {
      if (fm.type !== "task") throw new Error("This note is no longer a task.");
      change(fm);
    });
  }
  async createNote(type, title2, fm, body2 = "") {
    if (type === "project") fm = { ...fm, status: normalizeStatus(fm.status ?? "backlog") };
    const name = title2.trim();
    if (!name) throw new Error("A title is required.");
    const root = (0, import_obsidian2.normalizePath)(this.folder());
    if (!root || root.startsWith("/") || /[\x00-\x1f:*?"<>|]/.test(root) || root.split("/").includes("..") || root.split("/").some((x) => x.startsWith(".")))
      throw new Error("Choose a normal folder inside your vault.");
    const directory = `${root}/${type === "task" ? "Tasks" : type === "project" ? "Projects" : "Areas"}`;
    await this.ensureFolder(directory);
    let slug = name.replace(/[\\/:*?"<>|#^[\]\x00-\x1f]/g, " ").replace(/\s+/g, " ").slice(0, 80).replace(/[. ]+$/, "").trim() || type;
    while (new TextEncoder().encode(slug).length > 160)
      slug = Array.from(slug).slice(0, -1).join("");
    const path = `${directory}/${slug}--${crypto.randomUUID()}.md`;
    const file = await this.app.vault.create(
      path,
      `---
${(0, import_obsidian2.stringifyYaml)({ ...fm, type, title: name, topSchema: SCHEMA })}---

${body2 || "# " + name + "\n"}`
    );
    await this.repo.refresh(file);
    return file;
  }
  validate(draft) {
    if (draft.status !== void 0 && !STATUSES.includes(draft.status))
      throw new Error("Invalid status.");
    if (draft.description !== void 0 && (typeof draft.description !== "string" || draft.description.length > 1e5))
      throw new Error("Description must be at most 100000 characters.");
    if (!draft.title.trim()) throw new Error("A title is required.");
    if (draft.scheduledTime !== void 0 && draft.scheduledTime !== "" && timeKey(draft.scheduledTime) !== draft.scheduledTime)
      throw new Error("Invalid appointment time. Use HH:mm from 00:00 to 23:59.");
    if (draft.scheduled && dateKey(draft.scheduled) !== draft.scheduled || draft.due && dateKey(draft.due) !== draft.due)
      throw new Error("Invalid date.");
    if (draft.scheduled && draft.due && draft.due < draft.scheduled)
      throw new Error("End date must not precede the start date.");
    if (draft.plannedMinutes !== void 0 && (!Number.isFinite(draft.plannedMinutes) || draft.plannedMinutes < 0 || draft.plannedMinutes > 1e7))
      throw new Error("Invalid planned minutes.");
    if (draft.workDates !== void 0 && (!Array.isArray(draft.workDates) || draft.workDates.length > 1e3 || draft.workDates.some((d) => !d || dateKey(d) !== d || !!draft.due && d > draft.due)))
      throw new Error("Invalid work dates.");
    if (draft.recurrence && draft.workDates?.length)
      throw new Error("Work dates cannot be combined with a repeat rule.");
    if (!Number.isFinite(draft.minutes) || draft.minutes < 0)
      throw new Error("Minutes must be zero or greater.");
    if (draft.amount !== void 0 && draft.amount !== null && safeAmount(draft.amount) === null)
      throw new Error("Invalid payment amount.");
    if (draft.currency !== void 0 && !/^[A-Z]{3}$/.test(draft.currency))
      throw new Error("Use a three-letter currency code.");
    if (draft.paidOn && (dateKey(draft.paidOn) !== draft.paidOn || draft.paidOn > day()))
      throw new Error("Payment date must be today or earlier.");
    if (draft.recurrence) {
      const error = validateRule(draft.recurrence, draft.scheduled);
      if (error) throw new Error(error);
    }
  }
  async createTask(draft) {
    this.validate(draft);
    const first = draft.recurrence ? firstRepeatDate(draft.recurrence, draft.scheduled) : "";
    if (draft.recurrence && !first)
      throw new Error("The repeat rule has no occurrence within its dates.");
    return this.createNote("task", draft.title, {
      status: draft.recurrence ? "todo" : draft.status ?? "todo",
      description: draft.description ?? "",
      ...!draft.recurrence && draft.status === "done" ? { completedDate: draft.kind === "payment" ? draft.paidOn || day() : day() } : !draft.recurrence && draft.status === "failed" ? { failedDate: day() } : {},
      ...draft.recurrence && (draft.status && draft.status !== "todo" || draft.minutes > 0) ? {
        topOccurrences: {
          [first]: {
            status: draft.status ?? "todo",
            minutes: Math.round(draft.minutes),
            ...isActive(draft.status ?? "todo") ? {} : {
              resolvedOn: draft.kind === "payment" ? draft.paidOn || day() : day(),
              resolvedAt: (/* @__PURE__ */ new Date()).toISOString(),
              ...draft.kind === "payment" ? { amount: draft.amount ?? null, currency: draft.currency ?? "USD" } : {}
            }
          }
        }
      } : {},
      ...draft.recurrence && draft.status === "done" ? { complete_instances: [first] } : {},
      project: draft.project ? `[[${draft.project}]]` : "",
      scheduled: draft.scheduled || null,
      ...draft.scheduledTime !== void 0 ? { scheduledTime: draft.scheduledTime || null } : {},
      ...draft.workDates !== void 0 ? { workDates: [...new Set(draft.workDates)].sort() } : {},
      ...draft.plannedMinutes !== void 0 ? { plannedMinutes: Math.round(draft.plannedMinutes) } : {},
      due: draft.due || null,
      recurrence: draft.recurrence || null,
      taskType: draft.kind,
      ...draft.kind === "payment" ? { amount: draft.amount ?? null, currency: draft.currency ?? "USD" } : {},
      ...!draft.recurrence && draft.kind === "payment" && draft.status === "done" ? { topPayment: { amount: draft.amount ?? null, currency: draft.currency ?? "USD" } } : {},
      actualMinutes: draft.recurrence ? 0 : Math.round(draft.minutes),
      priority: draft.priority,
      dateCreated: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async saveSubscription(draft, task) {
    if (!draft.title.trim() || draft.title.length > 1e3)
      throw new Error("A title of at most 1000 characters is required.");
    if (draft.description.length > 1e5) throw new Error("Description is too long.");
    if (draft.amount !== null && (!Number.isFinite(draft.amount) || draft.amount < 0 || draft.amount > 1e12))
      throw new Error("Invalid subscription amount.");
    if (!/^[A-Z]{3}$/.test(draft.currency)) throw new Error("Use a three-letter currency code.");
    if (!["monthly", "yearly"].includes(draft.billingPeriod))
      throw new Error("Invalid billing period.");
    if (draft.scheduled && dateKey(draft.scheduled) !== draft.scheduled)
      throw new Error("Invalid date.");
    if (task && task.kind !== "subscription") throw new Error("This note is not a subscription.");
    const fm = {
      title: draft.title.trim(),
      description: draft.description,
      taskType: "subscription",
      subscriptionActive: draft.active,
      amount: draft.amount,
      currency: draft.currency,
      billingPeriod: draft.billingPeriod,
      scheduled: draft.scheduled || null,
      project: draft.project ? `[[${draft.project}]]` : "",
      status: draft.active ? "todo" : "done"
    };
    if (task)
      await this.patchTask(task.path, (current) => {
        if (String(current.taskType ?? current.kind).toLowerCase() !== "subscription")
          throw new Error("This note is no longer a subscription.");
        Object.assign(current, fm);
      });
    else await this.createNote("task", draft.title, fm);
  }
  async subscriptionActive(task, active) {
    if (task.kind !== "subscription") throw new Error("This note is not a subscription.");
    await this.patchTask(task.path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() !== "subscription")
        throw new Error("This note is no longer a subscription.");
      fm.subscriptionActive = active;
      fm.status = active ? "todo" : "done";
    });
  }
  async editTask(path, draft) {
    if (draft.kind === "subscription")
      throw new Error("Use subscription settings for expense trackers.");
    this.validate(draft);
    await this.patchTask(path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() === "subscription")
        throw new Error("Use subscription settings for expense trackers.");
      this.guardPaymentKind(fm, draft);
      Object.assign(fm, {
        title: draft.title.trim(),
        ...draft.description !== void 0 ? { description: draft.description } : {},
        project: draft.project ? `[[${draft.project}]]` : "",
        scheduled: draft.scheduled || null,
        ...draft.scheduledTime !== void 0 ? { scheduledTime: draft.scheduledTime || null } : {},
        ...draft.workDates !== void 0 ? { workDates: [...new Set(draft.workDates)].sort() } : {},
        ...draft.plannedMinutes !== void 0 ? { plannedMinutes: Math.round(draft.plannedMinutes) } : {},
        due: draft.due || null,
        recurrence: draft.recurrence || null,
        taskType: draft.kind,
        ...draft.amount !== void 0 ? { amount: draft.amount, currency: draft.currency ?? "USD" } : {},
        actualMinutes: Math.round(draft.minutes),
        priority: draft.priority
      });
    });
  }
  writeStatus(fm, item, status) {
    if (item.task.kind === "subscription" || fm.taskType === "subscription")
      throw new Error("Subscriptions have no task workflow.");
    if (!STATUSES.includes(status)) throw new Error("Invalid status.");
    if (item.recurring) {
      if (!item.key || dateKey(item.key) !== item.key)
        throw new Error("No editable occurrence selected.");
      const records = { ...fm.topOccurrences || {} };
      const old = records[item.key] || {};
      if (normalizeTask(item.task.path, fm).occurrences[item.key]?.status === status) return;
      records[item.key] = {
        ...old,
        status,
        ...fm.taskType === "payment" && status === "done" ? { amount: safeAmount(fm.amount), currency: fm.currency || "USD" } : {},
        resolvedAt: isActive(status) ? null : (/* @__PURE__ */ new Date()).toISOString(),
        resolvedOn: isActive(status) ? null : day()
      };
      fm.topOccurrences = records;
      const completed = new Set(
        Array.isArray(fm.complete_instances) ? fm.complete_instances.map(String) : []
      );
      if (status === "done") completed.add(item.key);
      else completed.delete(item.key);
      fm.complete_instances = [...completed].sort();
    } else {
      if (normalizeTask(item.task.path, fm).status === status) return;
      fm.status = status;
      delete fm.completedDate;
      delete fm.failedDate;
      if (status === "done") {
        fm.completedDate = day();
        if (fm.taskType === "payment")
          fm.topPayment = { amount: safeAmount(fm.amount), currency: fm.currency || "USD" };
      }
      if (status === "failed") fm.failedDate = day();
    }
  }
  async saveTask(item, draft, minutes, status) {
    if (item.task.kind === "subscription" || draft.kind === "subscription")
      throw new Error("Use subscription settings for expense trackers.");
    this.validate(draft);
    if (draft.recurrence && !item.recurring && !firstRepeatDate(draft.recurrence, draft.scheduled))
      throw new Error("The repeat rule has no occurrence within its dates.");
    if (!Number.isFinite(minutes) || minutes < 0)
      throw new Error("Minutes must be zero or greater.");
    if (!STATUSES.includes(status)) throw new Error("Invalid status.");
    await this.patchTask(item.task.path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() === "subscription")
        throw new Error("Use subscription settings for expense trackers.");
      this.guardPaymentKind(fm, draft);
      Object.assign(fm, {
        title: draft.title.trim(),
        ...draft.description !== void 0 ? { description: draft.description } : {},
        project: draft.project ? `[[${draft.project}]]` : "",
        scheduled: draft.scheduled || null,
        ...draft.scheduledTime !== void 0 ? { scheduledTime: draft.scheduledTime || null } : {},
        ...draft.workDates !== void 0 ? { workDates: [...new Set(draft.workDates)].sort() } : {},
        ...draft.plannedMinutes !== void 0 ? { plannedMinutes: Math.round(draft.plannedMinutes) } : {},
        due: draft.due || null,
        recurrence: draft.recurrence || null,
        taskType: draft.kind,
        ...draft.amount !== void 0 && !(item.recurring && item.task.kind === "payment" && (status === "done" || item.status === "done")) ? { amount: draft.amount, currency: draft.currency ?? "USD" } : {},
        priority: draft.priority
      });
      const recurring = !!draft.recurrence;
      if (recurring) {
        fm.actualMinutes = item.recurring ? Math.round(draft.minutes) : 0;
        if (!item.recurring) fm.status = "todo";
        const key = item.recurring ? item.key : firstRepeatDate(draft.recurrence, draft.scheduled);
        if (key) {
          const target = { ...item, recurring: true, key };
          if (status !== item.status || !item.recurring) this.writeStatus(fm, target, status);
          const records = { ...fm.topOccurrences || {} };
          records[key] = {
            ...records[key] || { status },
            minutes: Math.round(minutes),
            ...draft.kind === "payment" && status === "done" ? {
              amount: draft.amount !== void 0 ? draft.amount : item.task.amount,
              currency: draft.currency ?? item.task.currency,
              resolvedOn: draft.paidOn || records[key]?.resolvedOn || (item.status === "done" && item.recurring ? void 0 : day())
            } : {}
          };
          fm.topOccurrences = records;
        }
      } else {
        fm.actualMinutes = Math.round(minutes);
        if (status !== item.status || item.recurring)
          this.writeStatus(fm, { ...item, recurring: false }, status);
        if (draft.kind === "payment" && status === "done") {
          fm.topPayment = {
            amount: draft.amount !== void 0 ? draft.amount : item.task.amount,
            currency: draft.currency ?? item.task.currency
          };
          fm.completedDate = draft.paidOn || fm.completedDate || (item.status === "done" && !item.recurring ? void 0 : day());
        }
      }
    });
  }
  guardPaymentKind(fm, draft, oldKind = String(fm.taskType ?? fm.kind)) {
    const current = normalizeTask("", fm);
    const hasHistory = fm.topPayment || !current.recurrence && current.status === "done" || Object.values(current.occurrences).some((r) => r.status === "done" || "amount" in r);
    if (oldKind === "payment" && hasHistory && !!draft.recurrence !== !!fm.recurrence)
      throw new Error("Keep the recurrence mode while payment history exists.");
    if (oldKind === "payment" && draft.kind !== "payment" && hasHistory)
      throw new Error("Keep the payment type while payment history exists.");
  }
  async charge(task, billingDate2, amount, currency, paidOn) {
    if (dateKey(billingDate2) !== billingDate2 || !billingDate2 || dateKey(paidOn) !== paidOn || !paidOn || paidOn > day())
      throw new Error("Payment date must be today or earlier.");
    if (safeAmount(amount) === null) throw new Error("Invalid payment amount.");
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Use a three-letter currency code.");
    await this.patchTask(task.path, (fm) => {
      if (String(fm.taskType ?? fm.kind) !== "subscription")
        throw new Error("This note is not a subscription.");
      const records = { ...fm.topCharges || {} };
      if (records[billingDate2]) throw new Error("This billing date is already recorded.");
      records[billingDate2] = { amount, currency, paidOn };
      fm.topCharges = records;
    });
  }
  async removeCharge(task, key) {
    await this.patchTask(task.path, (fm) => {
      if (String(fm.taskType ?? fm.kind) !== "subscription")
        throw new Error("This note is not a subscription.");
      const records = { ...fm.topCharges || {} };
      delete records[key];
      fm.topCharges = records;
    });
  }
  async status(item, status) {
    await this.patchTask(item.task.path, (fm) => this.writeStatus(fm, item, status));
  }
  async minutes(item, value) {
    if (item.task.kind === "subscription")
      throw new Error("Use subscription settings for expense trackers.");
    if (!Number.isFinite(value) || value < 0) throw new Error("Minutes must be zero or greater.");
    await this.patchTask(item.task.path, (fm) => {
      if (item.recurring) {
        const records = { ...fm.topOccurrences || {} };
        records[item.key] = {
          ...records[item.key] || { status: item.status },
          minutes: Math.round(value)
        };
        fm.topOccurrences = records;
      } else fm.actualMinutes = Math.round(value);
    });
  }
  async budget(path, amount, currency) {
    if (amount !== null && safeAmount(amount) === null) throw new Error("Invalid budget.");
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Use a three-letter currency code.");
    await this.patch(path, (fm) => {
      if (fm.type !== "project" && fm.type !== "area") throw new Error("Invalid budget.");
      fm.monthlyBudget = amount;
      fm.budgetCurrency = currency;
    });
  }
  async move(item, target) {
    if (item.task.kind === "subscription")
      throw new Error("Use subscription settings for expense trackers.");
    if (!target || dateKey(target) !== target) throw new Error("Invalid date.");
    await this.patchTask(item.task.path, (fm) => {
      if (item.recurring) {
        const moves = { ...fm.topMoves || {} };
        if (target === item.key) delete moves[item.key];
        else moves[item.key] = target;
        fm.topMoves = moves;
      } else if (item.calendarRole === "deadline") {
        const task = normalizeTask(item.task.path, fm);
        if ([task.scheduled, ...task.workDates || []].filter(Boolean).some((d) => d > target))
          throw new Error("Invalid work dates.");
        fm.due = target;
      } else if (item.calendarRole === "work") {
        const task = normalizeTask(item.task.path, fm);
        if (task.due && target > task.due) throw new Error("Invalid work dates.");
        if (item.date === task.scheduled) fm.scheduled = target;
        else
          fm.workDates = [
            ...new Set((task.workDates || []).map((d) => d === item.date ? target : d))
          ].sort();
      } else {
        const length = item.task.scheduled && item.task.due ? Math.max(0, distance(item.task.scheduled, item.task.due)) : 0;
        fm.scheduled = target;
        if (item.task.due) fm.due = addDays(target, length);
      }
    });
  }
  async skip(item) {
    if (item.task.kind === "subscription")
      throw new Error("Use subscription settings for expense trackers.");
    if (!item.recurring) throw new Error("This is not a recurring occurrence.");
    await this.patchTask(item.task.path, (fm) => {
      fm.topSkipped = [
        .../* @__PURE__ */ new Set([...Array.isArray(fm.topSkipped) ? fm.topSkipped.map(String) : [], item.key])
      ];
    });
  }
  async stopSeries(path, today = day()) {
    await this.patchTask(path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() === "subscription")
        throw new Error("Use subscription settings for expense trackers.");
      fm.topSeriesEnd = today;
    });
  }
  async resumeSeries(path) {
    await this.patchTask(path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() === "subscription")
        throw new Error("Use subscription settings for expense trackers.");
      delete fm.topSeriesEnd;
      fm.status = "todo";
    });
  }
  async trash(path, expectedType) {
    await this.serial(path, async () => {
      const file = this.file(path);
      const content = await this.app.vault.read(file);
      const fm = frontmatter(content);
      if (Number(fm.topSchema) > SCHEMA) throw new Error("Cannot edit a future planner schema.");
      if (Number(fm.topSchema) !== SCHEMA || !["task", "project", "area"].includes(String(fm.type)) || expectedType && fm.type !== expectedType)
        throw new Error("This note is no longer the same planner type.");
      await this.app.fileManager.trashFile(file);
      this.remember({ path, content });
      this.repo.remove(path);
    });
  }
  undo() {
    const next = this.undoQueue.catch(() => void 0).then(() => this.undoLast());
    this.undoQueue = next;
    return next;
  }
  async undoLast() {
    const entry = this.undoStack.at(-1);
    if (!entry) return;
    if ("content" in entry) {
      if (this.app.vault.getAbstractFileByPath(entry.path))
        throw new Error("Undo blocked: a note already exists at this path.");
      await this.ensureFolder(entry.path.split("/").slice(0, -1).join("/"));
      const f = await this.app.vault.create(entry.path, entry.content);
      const index = this.undoStack.indexOf(entry);
      if (index >= 0) this.undoStack.splice(index, 1);
      await this.repo.refresh(f);
    } else {
      await this.patch(
        entry.path,
        (fm) => {
          if (entry.keys.some((k) => JSON.stringify(fm[k]) !== JSON.stringify(entry.after[k])))
            throw new Error("Undo blocked: these fields were changed elsewhere.");
          for (const key of entry.keys) {
            if (Object.prototype.hasOwnProperty.call(entry.before, key))
              fm[key] = structuredClone(entry.before[key]);
            else delete fm[key];
          }
        },
        false
      );
      const index = this.undoStack.indexOf(entry);
      if (index >= 0) this.undoStack.splice(index, 1);
      this.repo.emit();
    }
  }
};

// src/services/importer.ts
var LegacyImporter = class {
  constructor(app, repo, service) {
    this.app = app;
    this.repo = repo;
    this.service = service;
  }
  running = false;
  async run() {
    if (this.running) throw new Error("Import is already running.");
    this.running = true;
    try {
      return await this.execute();
    } finally {
      this.running = false;
    }
  }
  async execute() {
    const result = { tasks: 0, projects: 0, areas: 0, warnings: [], skipped: 0 };
    const data = [];
    const imported = /* @__PURE__ */ new Map();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const text = await this.app.vault.cachedRead(file);
      const header = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || "";
      if (!/^(Tasks|Projects)\//i.test(file.path) && !header.includes("topLegacySource")) continue;
      const fm = frontmatter(text);
      if (fm.topLegacySource) imported.set(String(fm.topLegacySource), file.path);
      if (fm.topSchema || !/^(Tasks|Projects)\//i.test(file.path)) continue;
      const isProject = fm.type === "project" || file.basename === "_project";
      const isTask = !isProject && (fm.type === "task" || strings(fm.tags).some((t) => t.replace(/^#/, "") === "task") || fm.status !== void 0);
      if (isProject || isTask) data.push({ file, fm, text });
    }
    const areas = new Map(this.repo.snapshot().areas.map((a) => [a.title, a.path]));
    for (const entry of data.filter(
      (d) => d.fm.type === "project" || d.file.basename === "_project"
    )) {
      if (imported.has(entry.file.path)) {
        result.skipped++;
        continue;
      }
      const name = String(entry.fm.area || entry.file.path.split("/")[1] || "General");
      let area = areas.get(name);
      if (!area) {
        const f2 = await this.service.createNote("area", name, {});
        area = f2.path;
        areas.set(name, area);
        result.areas++;
      }
      const fm = { ...entry.fm, area: `[[${area}]]`, topLegacySource: entry.file.path };
      const f = await this.service.createNote(
        "project",
        title(entry.fm, entry.file.path),
        fm,
        body(entry.text)
      );
      imported.set(entry.file.path, f.path);
      result.projects++;
    }
    for (const entry of data.filter(
      (d) => d.fm.type !== "project" && d.file.basename !== "_project"
    )) {
      if (imported.has(entry.file.path)) {
        result.skipped++;
        continue;
      }
      const normalized = normalizeTask(entry.file.path, entry.fm);
      const raw = link(entry.fm.project ?? entry.fm.projects);
      const exact = raw.endsWith(".md") ? raw : raw + ".md";
      const resolved = imported.get(exact) || imported.get(this.app.metadataCache.getFirstLinkpathDest(raw, entry.file.path)?.path || "");
      if (raw && !resolved)
        result.warnings.push(`Unresolved project: ${entry.file.path} \u2192 ${raw}. Assigned to inbox.`);
      if (strings(entry.fm.projects).length > 1)
        result.warnings.push(
          `Multiple projects: ${entry.file.path}. The first is active; all original links are retained in topLegacyProjects.`
        );
      const scheduled = normalized.scheduled || (normalized.recurrence ? normalized.due || day() : "");
      if (normalized.recurrence && !normalized.scheduled)
        result.warnings.push(`Missing repeat start: ${entry.file.path}. Used ${scheduled}.`);
      if (normalized.unsupportedRepeat)
        result.warnings.push(
          `Check recurrence in ${entry.file.path}: ${normalized.unsupportedRepeat}`
        );
      const occurrences = structuredClone(normalized.occurrences);
      let historicMinutes = 0;
      for (const rawEntry of Array.isArray(entry.fm.timeEntries) ? entry.fm.timeEntries : []) {
        if (!rawEntry || typeof rawEntry !== "object") continue;
        const time = rawEntry;
        if (!time.endTime) {
          result.warnings.push(
            `Unfinished timer in ${entry.file.path}. Original entry retained; no duration invented.`
          );
          continue;
        }
        const start = new Date(String(time.startTime)), end = new Date(String(time.endTime));
        const minutes = Math.round((end.valueOf() - start.valueOf()) / 6e4);
        if (Number.isFinite(minutes) && minutes > 0) {
          if (normalized.recurrence) {
            const key = dateKey(time.startTime);
            if (key) {
              const record = occurrences[key] || { status: "todo" };
              occurrences[key] = { ...record, minutes: (record.minutes || 0) + minutes };
            }
          } else historicMinutes += minutes;
        }
      }
      const fm = {
        ...entry.fm,
        status: normalized.status,
        project: resolved ? `[[${resolved}]]` : "",
        scheduled: scheduled || null,
        due: normalized.due || null,
        recurrence: normalized.recurrence || null,
        taskType: normalized.kind,
        topOccurrences: occurrences,
        topLegacySource: entry.file.path,
        topLegacyProjects: entry.fm.projects ?? null,
        actualMinutes: entry.fm.actualMinutes === void 0 ? historicMinutes : normalized.minutes
      };
      if (normalized.recurrence && fm.completedDate && normalized.status === "todo")
        delete fm.completedDate;
      const f = await this.service.createNote("task", normalized.title, fm, body(entry.text));
      imported.set(entry.file.path, f.path);
      result.tasks++;
    }
    return result;
  }
};
function body(text) {
  return text.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").replace(/^\s*\n/, "");
}

// src/ui/view.ts
var import_obsidian5 = require("obsidian");

// src/core/selectors.ts
function expand(task, from, to) {
  if (task.kind === "subscription" || task.unsupportedRepeat) return [];
  try {
    if (!task.recurrence) {
      const date = task.scheduled || task.workDates?.[0] || task.due;
      const end = task.due && task.due >= date ? task.due : date;
      if (!date || date > to || end < from) return [];
      return [
        { task, key: "", date, end, status: task.status, minutes: task.minutes, recurring: false }
      ];
    }
    const keys = new Set(repeatDates(task.recurrence, task.scheduled, from, to));
    for (const k of Object.keys(task.moves))
      if (task.moves[k] >= from && task.moves[k] <= to) keys.add(k);
    for (const k of Object.keys(task.occurrences)) {
      const date = task.moves[k] || k;
      if (date >= from && date <= to) keys.add(k);
    }
    const until = recurrenceEnd(task.recurrence);
    const skipped = new Set(task.skipped);
    const output = [];
    for (const k of keys) {
      const date = task.moves[k] || k;
      const record = task.occurrences[k];
      if (skipped.has(k) || until && k > until && isActive(record?.status ?? task.status) || date < from || date > to || k < task.scheduled && !record || task.seriesEnd && k > task.seriesEnd && !record || !isActive(task.status) && !record)
        continue;
      output.push({
        task,
        key: k,
        date,
        end: date,
        status: record?.status ?? task.status,
        minutes: record?.minutes ?? 0,
        recurring: true
      });
    }
    return output.sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    if (!(e instanceof Error) || e.name !== "RecurrenceLimitError") throw e;
    task.unsupportedRepeat = e.message;
    return [];
  }
}
function isOverdue(item, today) {
  return isActive(item.status) && item.task.kind !== "subscription" && !!item.end && item.end < today;
}
function compareItems(a, b, withinDay = false) {
  return (withinDay ? 0 : a.date.localeCompare(b.date)) || (a.task.scheduledTime || "24:00").localeCompare(b.task.scheduledTime || "24:00") || Number(TERMINAL.has(a.status)) - Number(TERMINAL.has(b.status)) || Number(b.task.priority === "high") - Number(a.task.priority === "high") || a.task.title.localeCompare(b.task.title);
}
function sortItems(items, withinDay = false) {
  return items.sort((a, b) => compareItems(a, b, withinDay));
}
function todayItems(tasks, today, limits) {
  const result = {
    overdue: [],
    today: [],
    counts: { overdue: 0, today: 0 }
  };
  const add = (group, item) => {
    result.counts[group]++;
    const items = result[group];
    if (!limits) {
      items.push(item);
      return;
    }
    const limit = Math.max(0, limits[group]);
    if (!limit || items.length >= limit && compareItems(item, items[items.length - 1], group === "today") >= 0)
      return;
    let low = 0, high = items.length;
    while (low < high) {
      const mid = low + high >>> 1;
      if (compareItems(items[mid], item, group === "today") <= 0) low = mid + 1;
      else high = mid;
    }
    items.splice(low, 0, item);
    if (items.length > limit) items.pop();
  };
  for (const task of tasks) {
    if (task.kind === "subscription") continue;
    if (!task.recurrence) {
      const work = new Set([task.scheduled, ...task.workDates || []].filter(Boolean));
      const item = taskItem(task, today);
      if (isOverdue(item, today)) add("overdue", item);
      else if (work.has(today) || task.due === today || !isActive(task.status) && task.resolvedOn === today)
        add("today", work.has(today) ? { ...item, date: today } : item);
      continue;
    }
    let from = task.scheduled && task.scheduled < today ? task.scheduled : task.due && task.due < today ? task.due : today;
    if (task.recurrence && !task.unsupportedRepeat) {
      for (const date of Object.values(task.moves)) if (date < from) from = date;
      for (const key of Object.keys(task.occurrences)) {
        const date = task.moves[key] || key;
        if (date < from) from = date;
      }
    }
    const entries = expand(task, from, today);
    if (task.recurrence && !task.unsupportedRepeat) {
      const existing = new Set(entries.map((item) => item.key));
      for (const [key, record] of Object.entries(task.occurrences)) {
        if (isActive(record.status) || existing.has(key) || task.skipped.includes(key) || dateKey(record.resolvedOn || record.resolvedAt) !== today)
          continue;
        const date = task.moves[key] || key;
        entries.push({
          task,
          key,
          date,
          end: date,
          status: record.status,
          minutes: record.minutes || 0,
          recurring: true
        });
      }
    }
    if (!task.recurrence && !entries.length && !isActive(task.status) && task.resolvedOn === today)
      entries.push(taskItem(task, today));
    for (const item of entries) {
      if (isOverdue(item, today)) add("overdue", item);
      else if (item.date <= today && item.end >= today || !isActive(item.status) && (item.recurring ? dateKey(
        task.occurrences[item.key]?.resolvedOn || task.occurrences[item.key]?.resolvedAt
      ) : task.resolvedOn) === today)
        add("today", item);
    }
  }
  return {
    overdue: sortItems(result.overdue),
    today: sortItems(result.today, true),
    counts: result.counts
  };
}
function taskItem(task, today) {
  if (task.kind === "subscription")
    return {
      task,
      key: "",
      date: task.scheduled,
      end: task.scheduled,
      status: task.status,
      minutes: 0,
      recurring: false
    };
  if (task.recurrence && task.unsupportedRepeat)
    return { task, key: "", date: "", end: "", status: task.status, minutes: 0, recurring: true };
  try {
    if (task.recurrence && !task.unsupportedRepeat) {
      let overdue;
      if (isActive(task.status) && task.scheduled < today) {
        const skipped = new Set(task.skipped);
        queryRule(task.recurrence, task.scheduled, task.scheduled).between(
          utc(task.scheduled),
          utc(today),
          true,
          (date2) => {
            const key = date2.toISOString().slice(0, 10);
            if (task.seriesEnd && key > task.seriesEnd) return false;
            if (key >= today) return false;
            if (!task.moves[key] && !skipped.has(key) && isActive(task.occurrences[key]?.status ?? task.status)) {
              overdue = {
                task,
                key,
                date: key,
                end: key,
                status: task.occurrences[key]?.status ?? task.status,
                minutes: task.occurrences[key]?.minutes ?? 0,
                recurring: true
              };
              return false;
            }
            return true;
          }
        );
      }
      const until = recurrenceEnd(task.recurrence);
      for (const key of /* @__PURE__ */ new Set([...Object.keys(task.moves), ...Object.keys(task.occurrences)])) {
        const date2 = task.moves[key] || key;
        const record = task.occurrences[key];
        if (date2 >= today || until && key > until || task.skipped.includes(key) || !isActive(record?.status ?? task.status) || !isActive(task.status) && !record || key < task.scheduled && !record || task.seriesEnd && key > task.seriesEnd && !record)
          continue;
        if (!overdue || date2 < overdue.date)
          overdue = {
            task,
            key,
            date: date2,
            end: date2,
            status: task.occurrences[key]?.status ?? task.status,
            minutes: record?.minutes ?? 0,
            recurring: true
          };
      }
      if (overdue) return overdue;
      const current = expand(task, today, today).find((o) => o.key === today) || expand(task, today, today)[0];
      if (current) return current;
      if (isActive(task.status)) {
        const moved = Object.entries(task.moves).filter(
          ([key, date2]) => date2 >= today && (!until || key <= until) && !task.skipped.includes(key) && isActive(task.occurrences[key]?.status ?? task.status) && (key >= task.scheduled || !!task.occurrences[key]) && (!task.seriesEnd || key <= task.seriesEnd || !!task.occurrences[key])
        ).map(([key, date2]) => ({
          task,
          key,
          date: date2,
          end: date2,
          status: task.occurrences[key]?.status ?? task.status,
          minutes: task.occurrences[key]?.minutes ?? 0,
          recurring: true
        })).sort((a, b) => a.date.localeCompare(b.date));
        const rule = queryRule(task.recurrence, task.scheduled, today);
        let next = rule.after(utc(today), true);
        let inspected = 0;
        while (next) {
          if (++inspected > 256) {
            const e = new Error(
              "Too many resolved future repeats; simplify the series or shorten its history."
            );
            e.name = "RecurrenceLimitError";
            throw e;
          }
          const key = next.toISOString().slice(0, 10);
          if (task.seriesEnd && key > task.seriesEnd) break;
          if (!task.moves[key] && !task.skipped.includes(key) && isActive(task.occurrences[key]?.status ?? task.status)) {
            const date2 = key;
            const candidate = {
              task,
              key,
              date: date2,
              end: date2,
              status: task.occurrences[key]?.status ?? task.status,
              minutes: task.occurrences[key]?.minutes ?? 0,
              recurring: true
            };
            return moved[0] && moved[0].date < date2 ? moved[0] : candidate;
          }
          next = rule.after(next, false);
        }
        if (moved[0]) return moved[0];
      }
      const last = expand(task, task.scheduled < today ? task.scheduled : today, today).at(-1);
      if (last) return last;
      return {
        task,
        key: "",
        date: "",
        end: "",
        status: task.status,
        minutes: task.minutes,
        recurring: true
      };
    }
    const date = task.scheduled || task.workDates?.[0] || task.due;
    return {
      task,
      key: "",
      date,
      end: task.due || [date, ...task.workDates || []].sort().at(-1) || date,
      status: task.status,
      minutes: task.minutes,
      recurring: false
    };
  } catch (e) {
    if (!(e instanceof Error) || e.name !== "RecurrenceLimitError") throw e;
    task.unsupportedRepeat = e.message;
    return { task, key: "", date: "", end: "", status: task.status, minutes: 0, recurring: true };
  }
}

// src/core/calendar.ts
function calendarDays(view, focus, month) {
  return view === "day" ? [focus] : view === "week" ? periodDates(calendarPeriod(focus, 7).from, 7) : monthGrid(month);
}
function workDays(task) {
  return [...new Set([task.scheduled, ...task.workDates || []].filter(Boolean))].sort();
}
function calendarItems(task, from, to) {
  if (task.kind === "subscription") return [];
  if (task.recurrence)
    return expand(task, from, to).map((i) => ({ ...i, calendarRole: "work" }));
  const work = workDays(task);
  const dates = [...new Set([...work, task.due].filter(Boolean))].sort();
  return dates.filter((d) => d >= from && d <= to).map((date) => ({
    task,
    key: "",
    date,
    end: task.due || work.at(-1) || date,
    status: task.status,
    minutes: task.minutes,
    recurring: false,
    calendarRole: work.includes(date) ? "work" : "deadline"
  }));
}
function dayLoad(tasks, date, capacity) {
  let minutes = 0, unestimated = 0;
  for (const task of tasks) {
    if (!isActive(task.status) || task.kind === "payment" || task.kind === "subscription") continue;
    const dates = workDays(task);
    const planned = task.recurrence ? calendarItems(task, date, date).some((i) => isActive(i.status)) : dates.includes(date) || !dates.length && task.due === date;
    if (!planned) continue;
    if (!task.plannedMinutes) unestimated++;
    else {
      const count = task.recurrence ? 1 : Math.max(1, dates.length);
      const index = task.recurrence || !dates.length ? 0 : dates.indexOf(date);
      minutes += Math.floor(task.plannedMinutes / count) + (index < task.plannedMinutes % count ? 1 : 0);
    }
  }
  return {
    date,
    minutes: Math.round(minutes),
    unestimated,
    capacity,
    over: minutes > capacity
  };
}

// src/core/subscriptions.ts
function billingDate(task, month) {
  const anchor = task.scheduled;
  if (task.kind !== "subscription" || !task.subscriptionActive || !dateKey(anchor)) return "";
  if (task.billingPeriod === "yearly" && month.slice(5, 7) !== anchor.slice(5, 7)) return "";
  const last = utc(shiftMonth(month, 1));
  last.setUTCDate(0);
  const date = month.slice(0, 7) + "-" + String(Math.min(Number(anchor.slice(8)), last.getUTCDate())).padStart(2, "0");
  return date >= anchor ? date : "";
}
function paymentOn(task, date) {
  return !!dateKey(date) && billingDate(task, date) === date && !task.charges?.[date];
}
function subscriptionPayments(task, from, to) {
  if (!dateKey(from) || !dateKey(to) || from > to) return [];
  const result = [];
  let month = from.slice(0, 7) + "-01";
  const last = to.slice(0, 7) + "-01";
  for (let count = 0; month <= last && count < 13; count++, month = shiftMonth(month, 1)) {
    const date = billingDate(task, month);
    if (date && date >= from && date <= to && !task.charges?.[date]) result.push(date);
  }
  return result;
}
function nextPaymentDate(task, from) {
  if (!dateKey(from)) return "";
  const start = task.scheduled > from ? task.scheduled : from;
  for (let offset = 0; offset <= 12; offset++) {
    const date = billingDate(task, shiftMonth(start, offset));
    if (date && date >= from && !task.charges?.[date]) return date;
  }
  return "";
}
function monthlyCosts(tasks) {
  const totals = /* @__PURE__ */ new Map();
  for (const t of tasks) {
    if (t.kind !== "subscription" || !t.subscriptionActive || t.amount === null) continue;
    const amount = t.billingPeriod === "yearly" ? t.amount / 12 : t.amount;
    totals.set(
      t.currency,
      Math.min(Number.MAX_SAFE_INTEGER, (totals.get(t.currency) || 0) + amount)
    );
  }
  return new Map([...totals].sort(([a], [b]) => a.localeCompare(b)));
}

// src/core/expenses.ts
var expenseValue = (item) => {
  const record = item.recurring ? item.task.occurrences[item.key] : item.task.payment;
  return item.status === "done" && record && "amount" in record ? { amount: record.amount ?? null, currency: record.currency || item.task.currency } : { amount: item.task.amount, currency: item.task.currency };
};
function actualExpenses(tasks) {
  const result = [];
  for (const task of tasks) {
    if (task.kind === "subscription") {
      for (const [key, r] of Object.entries(task.charges || {}))
        result.push({
          task,
          key,
          date: r.paidOn,
          amount: r.amount,
          currency: r.currency,
          paid: true
        });
    } else if (task.kind === "payment") {
      if (task.recurrence) {
        for (const [key, r] of Object.entries(task.occurrences)) {
          if (r.status !== "done" || task.skipped.includes(key)) continue;
          const item = {
            task,
            key,
            date: task.moves[key] || key,
            end: task.moves[key] || key,
            status: r.status,
            minutes: r.minutes || 0,
            recurring: true
          };
          result.push({
            task,
            key,
            date: dateKey(r.resolvedOn) || dateKey(r.resolvedAt),
            ...expenseValue(item),
            paid: true,
            item
          });
        }
      } else if (task.status === "done") {
        const item = {
          task,
          key: "",
          date: task.scheduled || task.due,
          end: task.due || task.scheduled,
          status: task.status,
          minutes: task.minutes,
          recurring: false
        };
        result.push({
          task,
          key: "",
          date: task.resolvedOn,
          ...expenseValue(item),
          paid: true,
          item
        });
      }
    }
  }
  return result.sort(
    (a, b) => b.date.localeCompare(a.date) || a.task.path.localeCompare(b.task.path) || a.key.localeCompare(b.key)
  );
}
function plannedExpenses(tasks, from, to) {
  const result = [];
  for (const task of tasks) {
    if (task.kind === "subscription") {
      for (const date of subscriptionPayments(task, from, to))
        result.push({
          task,
          key: date,
          date,
          amount: task.amount,
          currency: task.currency,
          paid: false
        });
    } else if (task.kind === "payment") {
      for (const item of expand(task, from, to))
        if (isActive(item.status) && item.date >= from && item.date <= to)
          result.push({
            task,
            key: item.key,
            date: item.date,
            ...expenseValue(item),
            paid: false,
            item
          });
    }
  }
  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || a.task.path.localeCompare(b.task.path)
  );
}
function expenseTotals(entries) {
  const result = /* @__PURE__ */ new Map();
  for (const e of entries)
    if (e.amount !== null) {
      result.set(
        e.currency,
        Math.min(
          Number.MAX_SAFE_INTEGER,
          Math.round(((result.get(e.currency) || 0) + e.amount) * 1e6) / 1e6
        )
      );
    }
  return result;
}
function financialAnalytics(tasks, today, days) {
  const { from, to } = calendarPeriod(today, days);
  const all = actualExpenses(tasks), actual = all.filter((e) => e.date >= from && e.date <= to);
  const planned = plannedExpenses(tasks, from, to);
  const missing = all.filter((e) => !e.date || e.amount === null);
  const entriesByDay = /* @__PURE__ */ new Map();
  for (const entry of actual) {
    const entries = entriesByDay.get(entry.date) || [];
    entries.push(entry);
    entriesByDay.set(entry.date, entries);
  }
  const currencies = [...new Set([...actual, ...planned].map((e) => e.currency))].sort();
  return {
    from,
    to,
    actual,
    planned,
    missing,
    currencies,
    actualTotals: expenseTotals(actual),
    plannedTotals: expenseTotals(planned),
    activity: periodDates(today, days).map((date) => {
      return { date, totals: expenseTotals(entriesByDay.get(date) || []) };
    })
  };
}

// src/core/budgets.ts
function periodBudget(monthly, from, to) {
  if (!from || !to || dateKey(from) !== from || dateKey(to) !== to || to < from) return 0;
  let amount = 0;
  for (let start = from; start <= to; ) {
    const monthStart = start.slice(0, 7) + "-01";
    const y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
    const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    const end = to < next ? to : addDays(next, -1);
    amount += monthly * (distance(start, end) + 1) / distance(monthStart, next);
    start = next;
  }
  return Math.round(amount * 1e6) / 1e6;
}
function budgetReport(tasks, projects, areas, from, to) {
  const actual = actualExpenses(tasks).filter((e) => e.date >= from && e.date <= to);
  const planned = plannedExpenses(tasks, from, to);
  const projectAreas = new Map(projects.map((p) => [p.path, p.area]));
  return [
    ...projects.map((p) => ({ ...p, scope: "project" })),
    ...areas.map((a) => ({ ...a, scope: "area" }))
  ].filter((s) => s.monthlyBudget !== null && s.monthlyBudget !== void 0).map((scope) => {
    const currency = scope.budgetCurrency || "USD";
    const matches = (path) => scope.scope === "project" ? path === scope.path : projectAreas.get(path) === scope.path;
    const paid = actual.filter((e) => matches(e.task.project));
    const pending = planned.filter((e) => matches(e.task.project));
    const spent = paid.filter((e) => e.currency === currency).reduce((sum2, e) => sum2 + (e.amount || 0), 0);
    const forecast = pending.filter((e) => e.currency === currency).reduce((sum2, e) => sum2 + (e.amount || 0), 0);
    const limit = periodBudget(scope.monthlyBudget, from, to);
    return {
      scope,
      currency,
      limit,
      spent,
      forecast,
      remaining: limit - spent,
      committed: limit - spent - forecast,
      other: [
        ...new Set(
          [...paid, ...pending].filter((e) => e.currency !== currency).map((e) => e.currency)
        )
      ],
      unpriced: [...paid, ...pending].filter((e) => e.amount === null).length
    };
  });
}

// src/core/board.ts
function boardWindow(scope, today) {
  if (scope === "week") {
    const start = addDays(today, -((utc(today).getUTCDay() + 6) % 7));
    return [start, addDays(start, 6)];
  }
  if (scope === "month") {
    const start = today.slice(0, 7) + "-01";
    return [start, addDays(shiftMonth(start, 1), -1)];
  }
  return [today, today];
}
function boardItems(tasks, today, scope) {
  const [from, to] = boardWindow(scope, today);
  const items = [];
  for (const task of tasks) {
    if (task.kind === "subscription") continue;
    const item = taskItem(task, today);
    const active = isActive(item.status);
    const record = item.recurring ? task.occurrences[item.key] : void 0;
    const resolved = item.recurring ? dateKey(record?.resolvedOn || record?.resolvedAt) : task.resolvedOn;
    const date = active ? item.date : resolved || item.date;
    const end = active ? item.end : date;
    if (scope === "all" || (scope === "undated" ? !task.scheduled && !task.workDates?.length && !task.due : !!date && (date <= to && end >= from || active && end < from)))
      items.push(item);
  }
  return sortItems(items);
}

// src/ui/dom.ts
var import_obsidian3 = require("obsidian");

// src/ui/i18n.ts
var en = {
  collapseMenu: "Collapse menu",
  expandMenu: "Expand menu",
  quickOptions: "Options",
  plannedMinutes: "Estimated time, min",
  estimate: "Estimate",
  taskPlan: "Plan",
  taskSpent: "Spent",
  workload: "Planned workload",
  workloadPlanned: "Planned",
  workloadAvailable: "Available for the day",
  workloadNoEstimates: "Time not estimated",
  workloadUnknownTasks: "Tasks without estimates",
  workloadOverloadedDays: "Overloaded days",
  capacity: "Available minutes per day",
  uiScale: "Planner interface size",
  uiScaleHelp: "Scales fonts, spacing and calendar density inside Tiny Planner only.",
  filters: "Filters",
  unestimated: "Without estimate",
  deadline: "Deadline",
  calendarDay: "Day",
  calendarWeek: "Week",
  calendarMonth: "Month",
  currentPeriod: "Current period",
  budgets: "Budgets",
  monthlyBudget: "Monthly budget",
  budgetRemaining: "Remaining",
  budgetCommitted: "After planned payments",
  budgetSpent: "Spent",
  budgetPlanned: "Planned payments",
  budgetLimit: "Period limit",
  budgetOther: "Other currencies",
  noBudgets: "Set a monthly budget in a project or area.",
  editBudget: "Edit budget",
  navPlan: "Planning",
  navOrganize: "Projects",
  navReview: "Overview",
  navHelp: "Help",
  projectCounts: "completed",
  manualContents: "Contents",
  clockHours: "Hours",
  clockMinutes: "Minutes",
  applyTime: "Set time",
  clearTime: "Clear time",
  chooseTime: "Choose time",
  manualTab: "Guide",
  clearDate: "Clear date",
  pickerMonth: "Month",
  pickerYear: "Year",
  appointmentTime: "Time \xB7 optional",
  appointmentHelp: "Local time in HH:mm. For recurring tasks it applies to the whole series. No reminder is sent.",
  highPriority: "High priority",
  firstRepeat: "First repeat",
  taskCreated: "Task saved",
  allItems: "All",
  skipped: "Skipped",
  openPlanner: "Open planner",
  undoCommand: "Undo last planner change",
  repeatUntil: "Repeat through \xB7 inclusive",
  searchSubscriptions: "Search expenses\u2026",
  paymentDate: "Next payment",
  billingMonth: "month",
  billingYear: "year",
  addSubscription: "Add subscription",
  amount: "Amount per billing period",
  currency: "Currency \xB7 ISO code",
  billingPeriod: "Billing period",
  nextPayment: "First payment \xB7 optional",
  activeSubscription: "Active",
  cancelledSubscription: "Cancelled",
  cancelSubscription: "Cancel subscription",
  resumeSubscription: "Resume subscription",
  monthlyEstimate: "Monthly subscription cost",
  subscriptionHelp: "The monthly estimate includes active subscriptions, with annual prices divided by 12. Actual charges appear separately in payment history when recorded. Currencies remain separate.",
  unpriced: "Price not set",
  allSubscriptions: "All subscriptions",
  week: "This week",
  month: "This month",
  boardPeriodHint: "Overdue work is included. Undated tasks are in their own view.",
  subscriptionsNoMatch: "No subscriptions in this list. Change the filter.",
  subscriptionsEmpty: "Add a subscription to track recurring costs.",
  boardScope: "How recurring cards work",
  kanban: "Boards",
  backlog: "Backlog",
  todo: "To do",
  "in-progress": "In progress",
  boardHelp: "One card per task. For recurring tasks, the card represents the earliest pending repeat, today\u2019s repeat or the next repeat. Changing status affects that repeat. An exhausted series remains read-only until its rule is changed. Done and Failed cards enter a dated board by their resolution day; if it was not recorded, their planned day is used. A later deadline does not keep closed work on Today. All keeps the full history.",
  description: "Description",
  dateFormat: "Date format",
  dateFormatHelp: "Applies to date entry and display. Stored dates remain compatible.",
  boardEmpty: "No tasks in this column",
  boardPrev: "Previous cards",
  boardNext: "Next cards",
  today: "Today",
  inbox: "Inbox",
  upcoming: "Upcoming",
  calendar: "Calendar",
  projects: "Areas & projects",
  subscriptions: "Expenses",
  statistics: "Statistics",
  taskNotes: "Tasks",
  taskProgress: "Completed",
  timeTotal: "Recorded time",
  timeActivity: "Time spent",
  savedTime: "All saved minutes",
  openTime: "Open work",
  unallocatedTime: "Legacy series time \xB7 no occurrence",
  statsDetails: "Additional metrics",
  projectDetails: "Project table",
  projectTotal: "Projects",
  oneOff: "One-off tasks",
  seriesCount: "Recurring series",
  recurringDone: "Completed repeats \xB7 all time",
  recurringFailed: "Failed repeats \xB7 all time",
  overdueOneOff: "Overdue one-off tasks",
  inboxCount: "Tasks in Inbox",
  noDateCount: "Tasks without a date",
  undatedCount: "Resolutions without a date \xB7 all time",
  activity: "Task completion",
  period: "Period",
  paymentAmount: "Amount",
  days365: "Year",
  businessStats: "Work",
  periodSummary: "Period summary",
  overallSummary: "Overall statistics",
  allTime: "All time",
  taskStatuses: "Task statuses",
  workloadThisWeek: "This week\u2019s workload",
  expenseSections: "Expense sections",
  paymentIssues: "Payments to review",
  undatedExpenses: "Payments without a recorded date",
  expensesAnalytics: "View financial statistics",
  financialStats: "Finances",
  addPayment: "Add expense",
  editPayment: "Edit payment",
  pendingPayment: "Awaiting payment",
  markPaymentFailed: "Mark as unpaid",
  returnToPlan: "Return to payment plan",
  payments: "Payments",
  paymentDone: "Paid",
  paymentFailed: "Not paid",
  paidOn: "Payment date",
  actualCost: "Paid",
  plannedCost: "Upcoming payments",
  recordCharge: "Record payment",
  billingDate: "Billing date",
  removeCharge: "Undo payment",
  expenseHistory: "Paid expenses",
  expensesHelp: "Paid payments and recorded subscription charges count as spending. Scheduled charges are forecasts. Use areas for departments and projects for cost allocation. Currencies are kept separate.",
  financeMissing: "Records with missing amount or payment date",
  forecast: "Upcoming payments",
  dailySpending: "Spending over time",
  byProjectCosts: "Spending by project",
  chooseCurrency: "Chart currency",
  periodRangeHelp: "The controls select the current calendar week (Monday\u2013Sunday), month, quarter or year, including its full date range. Week and month charts show days, quarter charts show weeks, and year charts show months. Every day is available in the detail table.",
  paymentHelp: "Done means paid; reopening removes the expense from totals. Recurring payments save the amount for each paid repeat.",
  chargeHelp: "Choose the scheduled billing date to avoid counting the same charge twice. Payment date records when you actually paid. This is a manual record.",
  subscriptionsSection: "Subscriptions",
  subscriptionCatalogHelp: "Recurring subscriptions. The monthly estimate is independent of the selected period; scheduled charges in the selected calendar period are included in the payment plan.",
  overduePayments: "Overdue payments",
  longTasks: "Long tasks",
  close: "Close",
  hideCompleted: "Hide completed",
  showCompleted: "Show completed",
  hideRecurring: "Hide recurring",
  showRecurring: "Show recurring",
  unpricedPayments: "Payments without an amount",
  undatedPayments: "Pending payments without a date",
  financeEmpty: "No spending recorded in this period.",
  forecastEmpty: "No upcoming payments in this period.",
  days7: "Week",
  days30: "Month",
  days90: "Quarter",
  timePeriod: "Time spent",
  minuteUnit: "min",
  hourUnit: "h",
  statsEmpty: "Your statistics start here",
  statsEmptyHelp: "Add a task or project. Charts will update as you work.",
  statsFilteredEmpty: "No matching tasks or projects",
  statsFilteredHelp: "Change or clear the filters to see your statistics.",
  activityEmpty: "No dated completions in this period.",
  numericDetails: "Daily details",
  projectProgress: "Progress by project",
  projectEmpty: "No projects in this selection.",
  previousPage: "Previous page",
  nextPage: "Next page",
  page: "Page",
  statsHelp: "Progress = completed / all one-off tasks, including failed tasks. Recurring series are counted separately. History uses the scheduled day (the moved day for repeats), then the deadline or closure date if no schedule exists; records without any date stay in all-time totals. Payments and subscriptions are excluded from work progress and time. Filters apply to all figures.",
  statsTimeHelp: "Closed work time includes Done and Failed tasks and saved repeats. Reopening removes their time from closed totals and dated charts while preserving manually entered minutes. More figures shows all saved time, open work and legacy series time without an occurrence. Period charts use planned work days; closure dates remain saved separately. Skipped repeats are excluded.",
  add: "Add task",
  quick: "What needs to be done?",
  title: "Title",
  project: "Project",
  noProject: "No project",
  subscriptionCancelAction: "Cancel",
  subscriptionResumeAction: "Resume",
  area: "Area",
  noArea: "No area",
  date: "Date",
  due: "Deadline",
  repeat: "Repeat",
  kind: "Type",
  minutes: "Minutes spent",
  priority: "Priority",
  normal: "Normal",
  high: "High",
  save: "Save",
  cancel: "Cancel",
  details: "Details",
  tomorrow: "Tomorrow",
  noDate: "No date",
  search: "Search tasks\u2026",
  overdue: "Overdue",
  empty: "Nothing here. Add a task above.",
  done: "Completed",
  open: "Open",
  failed: "Failed",
  complete: "Complete / reopen",
  fail: "Mark failed / reopen",
  editEntity: "Edit",
  edit: "Edit task",
  remove: "Delete",
  note: "Open note",
  reschedule: "Reschedule",
  undo: "Undo",
  all: "All areas",
  allProjects: "All projects",
  addArea: "New area",
  addProject: "New project",
  daily: "Daily",
  weekly: "Weekly",
  weekdays: "Weekdays",
  monthly: "Monthly",
  yearly: "Yearly",
  never: "Does not repeat",
  custom: "Custom RRULE",
  task: "Task",
  meeting: "Meeting",
  payment: "Payment",
  status: "Status",
  subscription: "Subscription",
  occurrence: "This occurrence",
  series: "Whole series",
  stop: "Stop future repeats",
  resume: "Resume repeats",
  deleteTitle: "Delete task",
  deleteText: "The note goes to the vault trash. Undo can restore it.",
  skipText: "Delete only this occurrence or move the whole series note to trash.",
  import: "Import old TOP notes",
  importText: "Copy notes from Tasks/ and Projects/ into the new planner. Original notes remain unchanged. Repeated imports skip previously imported files.",
  importStart: "Import copies",
  imported: "Import complete",
  warnings: "Warnings",
  settings: "Settings",
  folder: "Planner folder",
  folderHelp: "New Markdown notes are stored here. Existing planner notes remain available when this changes.",
  language: "Language",
  help: "Enter adds a task. Click its title for details. Drag calendar tasks onto a day; hold them over a month arrow to switch months.",
  showMore: "Show more",
  previous: "Previous month",
  next: "Next month",
  thisMonth: "This month",
  seriesHint: "Status and spent minutes apply to this occurrence. Start date, appointment time and repeat rule apply to the whole series.",
  stopped: "Series stopped",
  active: "Active",
  paused: "On hold",
  archived: "Archived",
  archive: "Archive project",
  chooseDate: "Choose a date",
  invalid: "Check the fields",
  refresh: "Refresh",
  clear: "Clear filters",
  total: "Total",
  unresolved: "Project unavailable",
  history: "Resolved today",
  manual: "Spent time is entered manually in minutes; no timer.",
  noOccurrence: "No remaining occurrence; edit the repeat rule to resume."
};
var ru = {
  collapseMenu: "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043C\u0435\u043D\u044E",
  expandMenu: "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043C\u0435\u043D\u044E",
  quickOptions: "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B",
  plannedMinutes: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u0438, \u043C\u0438\u043D",
  estimate: "\u041E\u0446\u0435\u043D\u043A\u0430",
  taskPlan: "\u041F\u043B\u0430\u043D",
  taskSpent: "\u041F\u043E\u0442\u0440\u0430\u0447\u0435\u043D\u043E",
  workload: "\u041F\u043B\u0430\u043D\u043E\u0432\u0430\u044F \u043D\u0430\u0433\u0440\u0443\u0437\u043A\u0430",
  workloadPlanned: "\u0412 \u043F\u043B\u0430\u043D\u0435",
  workloadAvailable: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043D\u0430 \u0434\u0435\u043D\u044C",
  workloadNoEstimates: "\u0412\u0440\u0435\u043C\u044F \u043D\u0435 \u043E\u0446\u0435\u043D\u0435\u043D\u043E",
  workloadUnknownTasks: "\u0417\u0430\u0434\u0430\u0447 \u0431\u0435\u0437 \u043E\u0446\u0435\u043D\u043A\u0438",
  workloadOverloadedDays: "\u0414\u043D\u0435\u0439 \u0441 \u043F\u0435\u0440\u0435\u0433\u0440\u0443\u0437\u043A\u043E\u0439",
  capacity: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0432 \u0434\u0435\u043D\u044C, \u043C\u0438\u043D",
  uiScale: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430",
  uiScaleHelp: "\u041C\u0435\u043D\u044F\u0435\u0442 \u0448\u0440\u0438\u0444\u0442\u044B, \u043E\u0442\u0441\u0442\u0443\u043F\u044B \u0438 \u043F\u043B\u043E\u0442\u043D\u043E\u0441\u0442\u044C \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043D\u0443\u0442\u0440\u0438 Tiny Planner.",
  filters: "\u0424\u0438\u043B\u044C\u0442\u0440\u044B",
  unestimated: "\u0411\u0435\u0437 \u043E\u0446\u0435\u043D\u043A\u0438",
  deadline: "\u0414\u0435\u0434\u043B\u0430\u0439\u043D",
  calendarDay: "\u0414\u0435\u043D\u044C",
  calendarWeek: "\u041D\u0435\u0434\u0435\u043B\u044F",
  calendarMonth: "\u041C\u0435\u0441\u044F\u0446",
  currentPeriod: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434",
  budgets: "\u0411\u044E\u0434\u0436\u0435\u0442\u044B",
  monthlyBudget: "\u0411\u044E\u0434\u0436\u0435\u0442 \u043D\u0430 \u043C\u0435\u0441\u044F\u0446",
  budgetRemaining: "\u041E\u0441\u0442\u0430\u0442\u043E\u043A",
  budgetCommitted: "\u041F\u043E\u0441\u043B\u0435 \u043F\u043B\u0430\u043D\u043E\u0432\u044B\u0445 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439",
  budgetSpent: "\u041F\u043E\u0442\u0440\u0430\u0447\u0435\u043D\u043E",
  budgetPlanned: "\u041F\u043B\u0430\u043D\u043E\u0432\u044B\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438",
  budgetLimit: "\u041B\u0438\u043C\u0438\u0442 \u043F\u0435\u0440\u0438\u043E\u0434\u0430",
  budgetOther: "\u0414\u0440\u0443\u0433\u0438\u0435 \u0432\u0430\u043B\u044E\u0442\u044B",
  noBudgets: "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0431\u044E\u0434\u0436\u0435\u0442 \u043D\u0430 \u043C\u0435\u0441\u044F\u0446 \u0432 \u043F\u0440\u043E\u0435\u043A\u0442\u0435 \u0438\u043B\u0438 \u0441\u0444\u0435\u0440\u0435.",
  editBudget: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0431\u044E\u0434\u0436\u0435\u0442",
  navPlan: "\u041F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
  navOrganize: "\u041F\u0440\u043E\u0435\u043A\u0442\u044B",
  navReview: "\u041E\u0431\u0437\u043E\u0440",
  navHelp: "\u041F\u043E\u043C\u043E\u0449\u044C",
  projectCounts: "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E",
  manualContents: "\u0421\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435",
  clockHours: "\u0427\u0430\u0441\u044B",
  clockMinutes: "\u041C\u0438\u043D\u0443\u0442\u044B",
  applyTime: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0432\u0440\u0435\u043C\u044F",
  clearTime: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0432\u0440\u0435\u043C\u044F",
  chooseTime: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0432\u0440\u0435\u043C\u044F",
  manualTab: "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F",
  clearDate: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0434\u0430\u0442\u0443",
  pickerMonth: "\u041C\u0435\u0441\u044F\u0446",
  pickerYear: "\u0413\u043E\u0434",
  appointmentTime: "\u0412\u0440\u0435\u043C\u044F \xB7 \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E",
  appointmentHelp: "\u041C\u0435\u0441\u0442\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0427\u0427:\u041C\u041C. \u0423 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0435\u0439\u0441\u044F \u0437\u0430\u0434\u0430\u0447\u0438 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A\u043E \u0432\u0441\u0435\u0439 \u0441\u0435\u0440\u0438\u0438. \u0411\u0435\u0437 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F.",
  highPriority: "\u0412\u044B\u0441\u043E\u043A\u0438\u0439 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442",
  firstRepeat: "\u041F\u0435\u0440\u0432\u044B\u0439 \u043F\u043E\u0432\u0442\u043E\u0440",
  taskCreated: "\u0417\u0430\u0434\u0430\u0447\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430",
  allItems: "\u0412\u0441\u0451",
  skipped: "\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E",
  openPlanner: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A",
  undoCommand: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435",
  repeatUntil: "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0442\u044C \u043F\u043E \xB7 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E",
  searchSubscriptions: "\u041D\u0430\u0439\u0442\u0438 \u0440\u0430\u0441\u0445\u043E\u0434\u2026",
  paymentDate: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
  billingMonth: "\u043C\u0435\u0441\u044F\u0446",
  billingYear: "\u0433\u043E\u0434",
  addSubscription: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443",
  amount: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438",
  currency: "\u0412\u0430\u043B\u044E\u0442\u0430 \xB7 ISO-\u043A\u043E\u0434",
  billingPeriod: "\u041F\u0435\u0440\u0438\u043E\u0434 \u043E\u043F\u043B\u0430\u0442\u044B",
  nextPayment: "\u041F\u0435\u0440\u0432\u043E\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \xB7 \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E",
  activeSubscription: "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442",
  cancelledSubscription: "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430",
  cancelSubscription: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443",
  resumeSubscription: "\u0412\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443",
  monthlyEstimate: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A \u0432 \u043C\u0435\u0441\u044F\u0446",
  subscriptionHelp: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0437\u0430 \u043C\u0435\u0441\u044F\u0446 \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438, \u0441 \u0433\u043E\u0434\u043E\u0432\u043E\u0439 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C\u044E, \u0434\u0435\u043B\u0451\u043D\u043D\u043E\u0439 \u043D\u0430 12. \u041E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0432 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u043E\u043F\u043B\u0430\u0442. \u0420\u0430\u0437\u043D\u044B\u0435 \u0432\u0430\u043B\u044E\u0442\u044B \u043D\u0435 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u044E\u0442\u0441\u044F.",
  unpriced: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430",
  allSubscriptions: "\u0412\u0441\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438",
  week: "\u042D\u0442\u0430 \u043D\u0435\u0434\u0435\u043B\u044F",
  month: "\u042D\u0442\u043E\u0442 \u043C\u0435\u0441\u044F\u0446",
  boardPeriodHint: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B. \u0417\u0430\u0434\u0430\u0447\u0438 \u0431\u0435\u0437 \u0434\u0430\u0442\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E.",
  subscriptionsNoMatch: "\u0412 \u044D\u0442\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A. \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440.",
  subscriptionsEmpty: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443 \u0434\u043B\u044F \u0443\u0447\u0451\u0442\u0430 \u0440\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u044B\u0445 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432.",
  boardScope: "\u041A\u0430\u043A \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0445\u0441\u044F \u0437\u0430\u0434\u0430\u0447",
  kanban: "\u0414\u043E\u0441\u043A\u0438",
  backlog: "\u041E\u0442\u043B\u043E\u0436\u0435\u043D\u043E",
  todo: "\u041A \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044E",
  "in-progress": "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435",
  boardHelp: "\u041E\u0434\u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043D\u0430 \u0437\u0430\u0434\u0430\u0447\u0443. \u0423 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0445\u0441\u044F \u0437\u0430\u0434\u0430\u0447 \u043F\u043E\u043A\u0430\u0437\u0430\u043D \u0441\u0430\u043C\u044B\u0439 \u0440\u0430\u043D\u043D\u0438\u0439 \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0439 \u043F\u043E\u0432\u0442\u043E\u0440, \u043F\u043E\u0432\u0442\u043E\u0440 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0438\u043B\u0438 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439. \u0421\u0442\u0430\u0442\u0443\u0441 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0430. \u0418\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u043D\u0430\u044F \u0441\u0435\u0440\u0438\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F \u0434\u043E \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043F\u0440\u0430\u0432\u0438\u043B\u0430. \u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0438 \u043F\u0440\u043E\u0432\u0430\u043B\u0435\u043D\u043D\u044B\u0435 \u0434\u0435\u043B\u0430 \u043F\u043E\u043F\u0430\u0434\u0430\u044E\u0442 \u043D\u0430 \u0434\u043E\u0441\u043A\u0443 \u043F\u0435\u0440\u0438\u043E\u0434\u0430 \u043F\u043E \u0434\u0430\u0442\u0435 \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u044F; \u0435\u0441\u043B\u0438 \u043E\u043D\u0430 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u0430 \u2014 \u043F\u043E \u043F\u043B\u0430\u043D\u043E\u0432\u043E\u0439 \u0434\u0430\u0442\u0435. \u0411\u043E\u043B\u0435\u0435 \u043F\u043E\u0437\u0434\u043D\u0438\u0439 \u0434\u0435\u0434\u043B\u0430\u0439\u043D \u043D\u0435 \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0442\u043E\u0435 \u0434\u0435\u043B\u043E \u043D\u0430 \xAB\u0421\u0435\u0433\u043E\u0434\u043D\u044F\xBB. \u0412 \xAB\u0412\u0441\u0435\xBB \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0432\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F.",
  description: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
  dateFormat: "\u0424\u043E\u0440\u043C\u0430\u0442 \u0434\u0430\u0442\u044B",
  dateFormatHelp: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u0432\u0432\u043E\u0434\u0435 \u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438. \u0412 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445 \u0434\u0430\u0442\u044B \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 ISO.",
  boardEmpty: "\u0412 \u044D\u0442\u043E\u0439 \u043A\u043E\u043B\u043E\u043D\u043A\u0435 \u043D\u0435\u0442 \u0437\u0430\u0434\u0430\u0447",
  boardPrev: "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438",
  boardNext: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438",
  today: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F",
  inbox: "\u0412\u0445\u043E\u0434\u044F\u0449\u0438\u0435",
  upcoming: "\u0411\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0434\u043D\u0438",
  calendar: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C",
  projects: "\u0421\u0444\u0435\u0440\u044B \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u044B",
  subscriptions: "\u0420\u0430\u0441\u0445\u043E\u0434\u044B",
  statistics: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430",
  taskNotes: "\u0417\u0430\u0434\u0430\u0447\u0438",
  taskProgress: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E",
  timeTotal: "\u0417\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F",
  timeActivity: "\u0417\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F",
  savedTime: "\u0412\u0441\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043C\u0438\u043D\u0443\u0442\u044B",
  openTime: "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0434\u0435\u043B\u0430",
  unallocatedTime: "\u0421\u0442\u0430\u0440\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0441\u0435\u0440\u0438\u0438 \xB7 \u0431\u0435\u0437 \u043F\u043E\u0432\u0442\u043E\u0440\u0430",
  statsDetails: "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438",
  projectDetails: "\u0422\u0430\u0431\u043B\u0438\u0446\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432",
  projectTotal: "\u041F\u0440\u043E\u0435\u043A\u0442\u044B",
  oneOff: "\u0420\u0430\u0437\u043E\u0432\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438",
  seriesCount: "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F \u0441\u0435\u0440\u0438\u0438",
  recurringDone: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \xB7 \u0432\u0441\u0435\u0433\u043E",
  recurringFailed: "\u041D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \xB7 \u0437\u0430 \u0432\u0441\u0451 \u0432\u0440\u0435\u043C\u044F",
  overdueOneOff: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E \u0440\u0430\u0437\u043E\u0432\u044B\u0445 \u0437\u0430\u0434\u0430\u0447",
  inboxCount: "\u0417\u0430\u0434\u0430\u0447\u0438 \u0432\u043E \u0432\u0445\u043E\u0434\u044F\u0449\u0438\u0445",
  noDateCount: "\u0417\u0430\u0434\u0430\u0447\u0438 \u0431\u0435\u0437 \u0434\u0430\u0442\u044B",
  undatedCount: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0431\u0435\u0437 \u0434\u0430\u0442\u044B \xB7 \u0432\u0441\u0435\u0433\u043E",
  activity: "\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F",
  period: "\u041F\u0435\u0440\u0438\u043E\u0434",
  paymentAmount: "\u0421\u0443\u043C\u043C\u0430",
  days365: "\u0413\u043E\u0434",
  businessStats: "\u0414\u0435\u043B\u0430",
  periodSummary: "\u0418\u0442\u043E\u0433\u0438 \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434",
  overallSummary: "\u041E\u0431\u0449\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430",
  allTime: "\u0417\u0430 \u0432\u0441\u0451 \u0432\u0440\u0435\u043C\u044F",
  taskStatuses: "\u0421\u0442\u0430\u0442\u0443\u0441\u044B \u0437\u0430\u0434\u0430\u0447",
  workloadThisWeek: "\u041D\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u043D\u0435\u0434\u0435\u043B\u0438",
  expenseSections: "\u0420\u0430\u0437\u0434\u0435\u043B\u044B \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432",
  paymentIssues: "\u0422\u0440\u0435\u0431\u0443\u044E\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F",
  undatedExpenses: "\u041E\u043F\u043B\u0430\u0442\u044B \u0431\u0435\u0437 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0439 \u0434\u0430\u0442\u044B",
  expensesAnalytics: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u0443\u044E \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443",
  financialStats: "\u0424\u0438\u043D\u0430\u043D\u0441\u044B",
  addPayment: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0430\u0441\u0445\u043E\u0434",
  editPayment: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043B\u0430\u0442\u0451\u0436",
  pendingPayment: "\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043E\u043F\u043B\u0430\u0442\u044B",
  markPaymentFailed: "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043D\u0435\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043D\u044B\u043C",
  returnToPlan: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0432 \u043F\u043B\u0430\u043D",
  payments: "\u041F\u043B\u0430\u0442\u0435\u0436\u0438",
  paymentDone: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E",
  paymentFailed: "\u041D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E",
  paidOn: "\u0414\u0430\u0442\u0430 \u043E\u043F\u043B\u0430\u0442\u044B",
  actualCost: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E",
  plannedCost: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438",
  recordCharge: "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443",
  billingDate: "\u0414\u0430\u0442\u0430 \u043F\u043E \u0433\u0440\u0430\u0444\u0438\u043A\u0443",
  removeCharge: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443",
  expenseHistory: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B",
  expensesHelp: "\u0412 \u0442\u0440\u0430\u0442\u044B \u0432\u0445\u043E\u0434\u044F\u0442 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438 \u0438 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A. \u0411\u0443\u0434\u0443\u0449\u0438\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u2014 \u043F\u0440\u043E\u0433\u043D\u043E\u0437. \u0421\u0444\u0435\u0440\u044B \u043F\u043E\u0434\u043E\u0439\u0434\u0443\u0442 \u0434\u043B\u044F \u043E\u0442\u0434\u0435\u043B\u043E\u0432, \u043F\u0440\u043E\u0435\u043A\u0442\u044B \u2014 \u0434\u043B\u044F \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0439 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432. \u0412\u0430\u043B\u044E\u0442\u044B \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E.",
  financeMissing: "\u0417\u0430\u043F\u0438\u0441\u0438 \u0431\u0435\u0437 \u0441\u0443\u043C\u043C\u044B \u0438\u043B\u0438 \u0434\u0430\u0442\u044B \u043E\u043F\u043B\u0430\u0442\u044B",
  forecast: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438",
  dailySpending: "\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432",
  byProjectCosts: "\u0420\u0430\u0441\u0445\u043E\u0434\u044B \u043F\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C",
  chooseCurrency: "\u0412\u0430\u043B\u044E\u0442\u0430 \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u044B",
  periodRangeHelp: "\u041F\u0435\u0440\u0438\u043E\u0434\u044B \u2014 \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0435 \u043D\u0435\u0434\u0435\u043B\u044F (\u043F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A\u2013\u0432\u043E\u0441\u043A\u0440\u0435\u0441\u0435\u043D\u044C\u0435), \u043C\u0435\u0441\u044F\u0446, \u043A\u0432\u0430\u0440\u0442\u0430\u043B \u0438 \u0433\u043E\u0434, \u0441 \u043D\u0430\u0447\u0430\u043B\u0430 \u0434\u043E \u043A\u043E\u043D\u0446\u0430. \u041D\u0435\u0434\u0435\u043B\u044F \u0438 \u043C\u0435\u0441\u044F\u0446 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043F\u043E \u0434\u043D\u044F\u043C, \u043A\u0432\u0430\u0440\u0442\u0430\u043B \u2014 \u043F\u043E \u043D\u0435\u0434\u0435\u043B\u044F\u043C, \u0433\u043E\u0434 \u2014 \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C. \u0412\u0441\u0435 \u0434\u043D\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432 \u0442\u0430\u0431\u043B\u0438\u0446\u0435.",
  paymentHelp: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E; \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0435 \u0443\u0431\u0438\u0440\u0430\u0435\u0442 \u0440\u0430\u0441\u0445\u043E\u0434 \u0438\u0437 \u0438\u0442\u043E\u0433\u043E\u0432. \u0423 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0445\u0441\u044F \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439 \u0441\u0443\u043C\u043C\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0439 \u043E\u043F\u043B\u0430\u0442\u044B.",
  chargeHelp: "\u0414\u0430\u0442\u0430 \u043F\u043E \u0433\u0440\u0430\u0444\u0438\u043A\u0443 \u0437\u0430\u0449\u0438\u0449\u0430\u0435\u0442 \u043E\u0442 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0433\u043E \u0443\u0447\u0451\u0442\u0430 \u043E\u0434\u043D\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F. \u0414\u0430\u0442\u0430 \u043E\u043F\u043B\u0430\u0442\u044B \u2014 \u0434\u0435\u043D\u044C, \u043A\u043E\u0433\u0434\u0430 \u0432\u044B \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0437\u0430\u043F\u043B\u0430\u0442\u0438\u043B\u0438. \u041E\u0442\u043C\u0435\u0442\u043A\u0430 \u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E.",
  subscriptionsSection: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0438",
  subscriptionCatalogHelp: "\u0420\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u044B\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438. \u041E\u0446\u0435\u043D\u043A\u0430 \u0437\u0430 \u043C\u0435\u0441\u044F\u0446 \u043D\u0435 \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430; \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u043D\u043E\u0433\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u0432 \u043F\u043B\u0430\u043D \u043E\u043F\u043B\u0430\u0442.",
  overduePayments: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438",
  longTasks: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438",
  close: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
  hideCompleted: "\u0421\u043A\u0440\u044B\u0442\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435",
  showCompleted: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435",
  hideRecurring: "\u0421\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F",
  showRecurring: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F",
  unpricedPayments: "\u041F\u043B\u0430\u0442\u0435\u0436\u0438 \u0431\u0435\u0437 \u0441\u0443\u043C\u043C\u044B",
  undatedPayments: "\u041F\u043B\u0430\u0442\u0435\u0436\u0438 \u0431\u0435\u0437 \u0434\u0430\u0442\u044B",
  financeEmpty: "\u041D\u0435\u0442 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043D\u044B\u0445 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432 \u0437\u0430 \u044D\u0442\u043E\u0442 \u043F\u0435\u0440\u0438\u043E\u0434.",
  forecastEmpty: "\u041D\u0435\u0442 \u043F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0445 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439 \u0437\u0430 \u044D\u0442\u043E\u0442 \u043F\u0435\u0440\u0438\u043E\u0434.",
  days7: "\u041D\u0435\u0434\u0435\u043B\u044F",
  days30: "\u041C\u0435\u0441\u044F\u0446",
  days90: "\u041A\u0432\u0430\u0440\u0442\u0430\u043B",
  timePeriod: "\u0417\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F",
  minuteUnit: "\u043C\u0438\u043D",
  hourUnit: "\u0447",
  statsEmpty: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438",
  statsEmptyHelp: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0438\u043B\u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u044B \u0434\u043B\u044F \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0435\u0439.",
  statsFilteredEmpty: "\u041D\u0435\u0442 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0437\u0430\u0434\u0430\u0447 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432",
  statsFilteredHelp: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u0438\u043B\u0438 \u0441\u0431\u0440\u043E\u0441\u044C\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u044B, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443.",
  activityEmpty: "\u0412 \u044D\u0442\u043E\u043C \u043F\u0435\u0440\u0438\u043E\u0434\u0435 \u043D\u0435\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0439 \u0441 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0439 \u0434\u0430\u0442\u043E\u0439.",
  numericDetails: "\u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u0434\u043D\u044F\u043C",
  projectProgress: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u043F\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C",
  projectEmpty: "\u0412 \u044D\u0442\u043E\u0439 \u0432\u044B\u0431\u043E\u0440\u043A\u0435 \u043D\u0435\u0442 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432.",
  previousPage: "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430",
  nextPage: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430",
  page: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430",
  statsHelp: "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 = \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 / \u0432\u0441\u0435 \u0440\u0430\u0437\u043E\u0432\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u043F\u0440\u043E\u0432\u0430\u043B\u0435\u043D\u043D\u044B\u0435. \u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F \u0441\u0435\u0440\u0438\u0438 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0434\u0435\u043D\u044C, \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0451\u043D\u043D\u044B\u0445 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \u2014 \u0434\u0435\u043D\u044C \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0430. \u0415\u0441\u043B\u0438 \u043F\u043B\u0430\u043D\u0430 \u043D\u0435\u0442, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0441\u0440\u043E\u043A \u0438\u043B\u0438 \u0434\u0430\u0442\u0430 \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u044F; \u0437\u0430\u043F\u0438\u0441\u0438 \u0441\u043E\u0432\u0441\u0435\u043C \u0431\u0435\u0437 \u0434\u0430\u0442\u044B \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0432 \u043E\u0431\u0449\u0438\u0445 \u0438\u0442\u043E\u0433\u0430\u0445. \u041F\u043B\u0430\u0442\u0435\u0436\u0438 \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u0438\u0437 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430 \u0434\u0435\u043B \u0438 \u0443\u0447\u0451\u0442\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u0438. \u0424\u0438\u043B\u044C\u0442\u0440\u044B \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0442 \u043D\u0430 \u0432\u0441\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438.",
  statsTimeHelp: "\u0412\u0440\u0435\u043C\u044F \u0437\u0430\u043A\u0440\u044B\u0442\u044B\u0445 \u0434\u0435\u043B \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0438 \u043F\u0440\u043E\u0432\u0430\u043B\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044B. \u041F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0435 \u0443\u0431\u0438\u0440\u0430\u0435\u0442 \u0432\u0440\u0435\u043C\u044F \u0438\u0437 \u0437\u0430\u043A\u0440\u044B\u0442\u044B\u0445 \u0438\u0442\u043E\u0433\u043E\u0432 \u0438 \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C, \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044F \u0432\u0432\u0435\u0434\u0451\u043D\u043D\u044B\u0435 \u043C\u0438\u043D\u0443\u0442\u044B. \u0414\u0440\u0443\u0433\u0438\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u0432\u0441\u0451 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F, \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0434\u0435\u043B\u0430 \u0438 \u0441\u0442\u0430\u0440\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0441\u0435\u0440\u0438\u0438 \u0431\u0435\u0437 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u043A \u043F\u043E\u0432\u0442\u043E\u0440\u0443. \u0414\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0434\u0435\u043D\u044C, \u0430 \u0434\u0430\u0442\u0430 \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0423\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044B \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u044B.",
  add: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443",
  quick: "\u0427\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C?",
  title: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435",
  project: "\u041F\u0440\u043E\u0435\u043A\u0442",
  noProject: "\u0411\u0435\u0437 \u043F\u0440\u043E\u0435\u043A\u0442\u0430",
  subscriptionCancelAction: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C",
  subscriptionResumeAction: "\u0412\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
  area: "\u0421\u0444\u0435\u0440\u0430",
  noArea: "\u0411\u0435\u0437 \u0441\u0444\u0435\u0440\u044B",
  date: "\u0414\u0430\u0442\u0430",
  due: "\u0414\u0435\u0434\u043B\u0430\u0439\u043D",
  repeat: "\u041F\u043E\u0432\u0442\u043E\u0440",
  kind: "\u0422\u0438\u043F",
  minutes: "\u041F\u043E\u0442\u0440\u0430\u0447\u0435\u043D\u043E \u043C\u0438\u043D\u0443\u0442",
  priority: "\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442",
  normal: "\u041E\u0431\u044B\u0447\u043D\u044B\u0439",
  high: "\u0412\u044B\u0441\u043E\u043A\u0438\u0439",
  save: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
  cancel: "\u041E\u0442\u043C\u0435\u043D\u0430",
  details: "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435",
  tomorrow: "\u0417\u0430\u0432\u0442\u0440\u0430",
  noDate: "\u0411\u0435\u0437 \u0434\u0430\u0442\u044B",
  search: "\u041D\u0430\u0439\u0442\u0438 \u0437\u0430\u0434\u0430\u0447\u0443\u2026",
  overdue: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E",
  empty: "\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u0432\u044B\u0448\u0435.",
  done: "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E",
  open: "\u041E\u0442\u043A\u0440\u044B\u0442\u043E",
  failed: "\u041D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E",
  complete: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C / \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442\u044C",
  fail: "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043D\u0435\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 / \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442\u044C",
  editEntity: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
  edit: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443",
  remove: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
  note: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0443",
  reschedule: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438",
  undo: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
  all: "\u0412\u0441\u0435 \u0441\u0444\u0435\u0440\u044B",
  allProjects: "\u0412\u0441\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u044B",
  addArea: "\u041D\u043E\u0432\u0430\u044F \u0441\u0444\u0435\u0440\u0430",
  addProject: "\u041D\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0435\u043A\u0442",
  daily: "\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E",
  weekly: "\u0415\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u043E",
  weekdays: "\u041F\u043E \u0431\u0443\u0434\u043D\u044F\u043C",
  monthly: "\u0415\u0436\u0435\u043C\u0435\u0441\u044F\u0447\u043D\u043E",
  yearly: "\u0415\u0436\u0435\u0433\u043E\u0434\u043D\u043E",
  never: "\u0411\u0435\u0437 \u043F\u043E\u0432\u0442\u043E\u0440\u0430",
  custom: "\u0421\u0432\u043E\u0439 RRULE",
  task: "\u0417\u0430\u0434\u0430\u0447\u0430",
  meeting: "\u0412\u0441\u0442\u0440\u0435\u0447\u0430",
  payment: "\u041F\u043B\u0430\u0442\u0451\u0436",
  status: "\u0421\u0442\u0430\u0442\u0443\u0441",
  subscription: "\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430",
  occurrence: "\u0422\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C",
  series: "\u0412\u0441\u044F \u0441\u0435\u0440\u0438\u044F",
  stop: "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u044B",
  resume: "\u0412\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u044B",
  deleteTitle: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443",
  deleteText: "\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430. \xAB\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435\xBB \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442 \u0435\u0451.",
  skipText: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C \u0438\u043B\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0432\u0441\u0435\u0439 \u0441\u0435\u0440\u0438\u0438.",
  import: "\u0418\u043C\u043F\u043E\u0440\u0442 \u0437\u0430\u043C\u0435\u0442\u043E\u043A TOP",
  importText: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043F\u0438\u0438 \u0437\u0430\u043C\u0435\u0442\u043E\u043A \u0438\u0437 Tasks/ \u0438 Projects/ \u0432 \u043D\u043E\u0432\u043E\u043C \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0435. \u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F. \u041F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0439 \u0438\u043C\u043F\u043E\u0440\u0442 \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442 \u0443\u0436\u0435 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0451\u043D\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B.",
  importStart: "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u043F\u0438\u0438",
  imported: "\u0418\u043C\u043F\u043E\u0440\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D",
  warnings: "\u041F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F",
  settings: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
  folder: "\u041F\u0430\u043F\u043A\u0430 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430",
  folderHelp: "\u041D\u043E\u0432\u044B\u0435 Markdown-\u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u0441\u044E\u0434\u0430. \u041F\u0440\u0438 \u0441\u043C\u0435\u043D\u0435 \u043F\u0430\u043F\u043A\u0438 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.",
  language: "\u042F\u0437\u044B\u043A",
  help: "Enter \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0443. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u0434\u0435\u0442\u0430\u043B\u0435\u0439. \u0412 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435 \u043F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u043D\u0430 \u0434\u0435\u043D\u044C; \u0437\u0430\u0434\u0435\u0440\u0436\u0438\u0442\u0435 \u0435\u0451 \u043D\u0430\u0434 \u0441\u0442\u0440\u0435\u043B\u043A\u043E\u0439 \u043C\u0435\u0441\u044F\u0446\u0430 \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0430.",
  showMore: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451",
  previous: "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u043C\u0435\u0441\u044F\u0446",
  next: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043C\u0435\u0441\u044F\u0446",
  thisMonth: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043C\u0435\u0441\u044F\u0446",
  seriesHint: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0438 \u0437\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u043C\u0438\u043D\u0443\u0442\u044B \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A \u044D\u0442\u043E\u043C\u0443 \u044D\u043A\u0437\u0435\u043C\u043F\u043B\u044F\u0440\u0443. \u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u0430\u0442\u0430, \u0432\u0440\u0435\u043C\u044F \u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u2014 \u043A\u043E \u0432\u0441\u0435\u0439 \u0441\u0435\u0440\u0438\u0438.",
  stopped: "\u041F\u043E\u0432\u0442\u043E\u0440\u044B \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u044B",
  active: "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439",
  paused: "\u041D\u0430 \u043F\u0430\u0443\u0437\u0435",
  archived: "\u0412 \u0430\u0440\u0445\u0438\u0432\u0435",
  archive: "\u0410\u0440\u0445\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442",
  chooseDate: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0430\u0442\u0443",
  invalid: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u043B\u044F",
  refresh: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
  clear: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B",
  total: "\u0412\u0441\u0435\u0433\u043E",
  unresolved: "\u041F\u0440\u043E\u0435\u043A\u0442 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
  history: "\u0417\u0430\u043A\u0440\u044B\u0442\u043E \u0441\u0435\u0433\u043E\u0434\u043D\u044F",
  manual: "\u0417\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u0432 \u043C\u0438\u043D\u0443\u0442\u0430\u0445; \u0442\u0430\u0439\u043C\u0435\u0440\u0430 \u043D\u0435\u0442.",
  noOccurrence: "\u042D\u043A\u0437\u0435\u043C\u043F\u043B\u044F\u0440\u043E\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0442; \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u043E, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C."
};
function words(lang) {
  return lang === "ru" ? ru : en;
}
var russianErrors = {
  "Keep the recurrence mode while payment history exists.": "\u041D\u0435 \u043C\u0435\u043D\u044F\u0439\u0442\u0435 \u0440\u0430\u0437\u043E\u0432\u044B\u0439 \u043F\u043B\u0430\u0442\u0451\u0436 \u043D\u0430 \u0441\u0435\u0440\u0438\u044E \u0438\u043B\u0438 \u043D\u0430\u043E\u0431\u043E\u0440\u043E\u0442, \u0435\u0441\u043B\u0438 \u0435\u0441\u0442\u044C \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u043F\u043B\u0430\u0442. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u043B\u0430\u0442\u0451\u0436.",
  "Invalid payment amount.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u043F\u043B\u0430\u0442\u0435\u0436\u0430.",
  "Payment date must be today or earlier.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0443\u044E \u0434\u0430\u0442\u0443 \u043E\u043F\u043B\u0430\u0442\u044B \u043D\u0435 \u043F\u043E\u0437\u0436\u0435 \u0441\u0435\u0433\u043E\u0434\u043D\u044F\u0448\u043D\u0435\u0433\u043E \u0434\u043D\u044F.",
  "This billing date is already recorded.": "\u0421\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430 \u044D\u0442\u0443 \u0434\u0430\u0442\u0443 \u0443\u0436\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E. \u0415\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0432 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u043E\u043F\u043B\u0430\u0442.",
  "Keep the payment type while payment history exists.": "\u0414\u043B\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u043E\u043F\u043B\u0430\u0442 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u0438\u043F \xAB\u041F\u043B\u0430\u0442\u0451\u0436\xBB.",
  "A title is required.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435.",
  "A title of at most 1000 characters is required.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u0438\u043D\u043E\u0439 \u0434\u043E 1000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.",
  "Invalid status.": "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441.",
  "Invalid project status.": "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043F\u0440\u043E\u0435\u043A\u0442\u0430.",
  "Invalid date.": "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0434\u0430\u0442\u0430.",
  "End date must not precede the start date.": "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0440\u0430\u043D\u044C\u0448\u0435 \u0434\u0430\u0442\u044B \u043D\u0430\u0447\u0430\u043B\u0430.",
  "Invalid appointment time. Use HH:mm from 00:00 to 23:59.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u0440\u0435\u043C\u044F \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0427\u0427:\u041C\u041C \u043E\u0442 00:00 \u0434\u043E 23:59.",
  "Invalid work dates.": "\u0414\u043D\u0438 \u0440\u0430\u0431\u043E\u0442\u044B \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u043C\u0438 \u0434\u0430\u0442\u0430\u043C\u0438 \u043D\u0435 \u043F\u043E\u0437\u0434\u043D\u0435\u0435 \u0434\u0435\u0434\u043B\u0430\u0439\u043D\u0430.",
  "Work dates cannot be combined with a repeat rule.": "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u043D\u0438 \u0440\u0430\u0431\u043E\u0442\u044B \u043D\u0435\u043B\u044C\u0437\u044F \u0441\u043E\u0432\u043C\u0435\u0449\u0430\u0442\u044C \u0441 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435\u043C.",
  "Invalid planned minutes.": "\u041F\u043B\u0430\u043D\u043E\u0432\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0447\u0438\u0441\u043B\u043E\u043C \u043E\u0442 0 \u0434\u043E 10000000 \u043C\u0438\u043D\u0443\u0442.",
  "Invalid budget.": "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0431\u044E\u0434\u0436\u0435\u0442.",
  "Minutes must be zero or greater.": "\u0417\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u043C\u0438\u043D\u0443\u0442\u044B \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043D\u0435\u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C.",
  "Description must be at most 100000 characters.": "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0442\u044C 100 000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.",
  "Description is too long.": "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0442\u044C 100 000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.",
  "Cannot edit a future planner schema.": "\u041D\u0435\u043B\u044C\u0437\u044F \u0438\u0437\u043C\u0435\u043D\u044F\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0441 \u0431\u043E\u043B\u0435\u0435 \u043D\u043E\u0432\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0435\u0439 \u0441\u0445\u0435\u043C\u044B \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430.",
  "This note is no longer a supported planner note.": "\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u043E\u0439 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430.",
  "This note is no longer a task.": "\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0437\u0430\u0434\u0430\u0447\u0435\u0439.",
  "This note is no longer the same planner type.": "\u0422\u0438\u043F \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0435\u0451 \u0437\u0430\u043D\u043E\u0432\u043E.",
  "Choose a normal folder inside your vault.": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u044B\u0447\u043D\u0443\u044E \u043F\u0430\u043F\u043A\u0443 \u0432\u043D\u0443\u0442\u0440\u0438 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430.",
  "Invalid subscription amount.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0443\u044E \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438.",
  "Use a three-letter currency code.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0442\u0440\u0451\u0445\u0431\u0443\u043A\u0432\u0435\u043D\u043D\u044B\u0439 \u043A\u043E\u0434 \u0432\u0430\u043B\u044E\u0442\u044B, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 RUB.",
  "Invalid billing period.": "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434 \u043E\u043F\u043B\u0430\u0442\u044B.",
  "This note is not a subscription.": "\u042D\u0442\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u043E\u0439.",
  "This note is no longer a subscription.": "\u042D\u0442\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u043E\u0439.",
  "Use subscription settings for expense trackers.": "\u0418\u0437\u043C\u0435\u043D\u044F\u0439\u0442\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B \u0432 \u0444\u043E\u0440\u043C\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438.",
  "Subscriptions have no task workflow.": "\u0423 \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A \u043D\u0435\u0442 \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u0432 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u0437\u0430\u0434\u0430\u0447.",
  "No editable occurrence selected.": "\u041D\u0435\u0442 \u044D\u043A\u0437\u0435\u043C\u043F\u043B\u044F\u0440\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u0430, \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0433\u043E \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F.",
  "This is not a recurring occurrence.": "\u042D\u0442\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u044D\u043A\u0437\u0435\u043C\u043F\u043B\u044F\u0440\u043E\u043C \u043F\u043E\u0432\u0442\u043E\u0440\u0430.",
  "Undo blocked: a note already exists at this path.": "\u041E\u0442\u043C\u0435\u043D\u0430 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430: \u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u043F\u0443\u0442\u0438 \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  "Undo blocked: these fields were changed elsewhere.": "\u041E\u0442\u043C\u0435\u043D\u0430 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430: \u044D\u0442\u0438 \u043F\u043E\u043B\u044F \u0431\u044B\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u044B \u0432\u043D\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430.",
  "Import is already running.": "\u0418\u043C\u043F\u043E\u0440\u0442 \u0443\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F.",
  "A recurring task needs a start date.": "\u0414\u043B\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0435\u0439\u0441\u044F \u0437\u0430\u0434\u0430\u0447\u0438 \u043D\u0443\u0436\u043D\u0430 \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u0430\u0442\u0430.",
  "Recurring tasks must start in 1900 or later.": "\u041D\u0430\u0447\u0430\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0432 1900 \u0433\u043E\u0434\u0443 \u0438\u043B\u0438 \u043F\u043E\u0437\u0436\u0435.",
  "Recurrence rule is too long.": "\u041F\u0440\u0430\u0432\u0438\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u043E\u0435.",
  "Invalid or duplicate recurrence field.": "\u0412 \u043F\u0440\u0430\u0432\u0438\u043B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u0435\u0441\u0442\u044C \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0438\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0435\u0435\u0441\u044F \u043F\u043E\u043B\u0435.",
  "RRULE supports one occurrence per calendar day; set appointment time in the time field.": "RRULE \u0437\u0430\u0434\u0430\u0451\u0442 \u043E\u0434\u0438\u043D \u043F\u043E\u0432\u0442\u043E\u0440 \u0432 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0439 \u0434\u0435\u043D\u044C. \u0412\u0440\u0435\u043C\u044F \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0432 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u043C \u043F\u043E\u043B\u0435.",
  "Month/day constraints cannot produce a calendar date.": "\u0423\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0435 \u043C\u0435\u0441\u044F\u0446 \u0438 \u0434\u0435\u043D\u044C \u043D\u0435 \u043E\u0431\u0440\u0430\u0437\u0443\u044E\u0442 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u0443\u044E \u0434\u0430\u0442\u0443.",
  "Invalid BYDAY value.": "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 BYDAY \u0432 \u043F\u0440\u0430\u0432\u0438\u043B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u0430.",
  "Use a daily, weekly, monthly or yearly rule.": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0439, \u0435\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u044B\u0439, \u0435\u0436\u0435\u043C\u0435\u0441\u044F\u0447\u043D\u044B\u0439 \u0438\u043B\u0438 \u0435\u0436\u0435\u0433\u043E\u0434\u043D\u044B\u0439 \u043F\u043E\u0432\u0442\u043E\u0440.",
  "Recurrence interval must be positive.": "\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C.",
  "Ordinal weekdays require a monthly/yearly rule without BYWEEKNO.": "\u041D\u043E\u043C\u0435\u0440 \u0434\u043D\u044F \u043D\u0435\u0434\u0435\u043B\u0438 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u043C\u0435\u0441\u044F\u0447\u043D\u043E\u043C \u0438\u043B\u0438 \u0433\u043E\u0434\u043E\u0432\u043E\u043C \u043F\u0440\u0430\u0432\u0438\u043B\u0435 \u0431\u0435\u0437 BYWEEKNO.",
  "Invalid recurrence end date.": "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0434\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432.",
  "Recurrence end date must not precede the start date.": "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0440\u0430\u043D\u044C\u0448\u0435 \u0434\u0430\u0442\u044B \u043D\u0430\u0447\u0430\u043B\u0430.",
  "The repeat rule has no occurrence within its dates.": "\u0412 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u043C \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0435 \u043D\u0435\u0442 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432. \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u0434\u0430\u0442\u044B \u0438\u043B\u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u043E.",
  "Recurrence exceeds the safe calculation budget; shorten its history.": "\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u043F\u0440\u0435\u0434\u0435\u043B \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432. \u0421\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0434\u0430\u0442.",
  "Recurrence exceeds the safe calculation budget; simplify the rule or shorten its history.": "\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u043F\u0440\u0435\u0434\u0435\u043B \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432. \u0423\u043F\u0440\u043E\u0441\u0442\u0438\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u043E \u0438\u043B\u0438 \u0441\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0434\u0430\u0442.",
  "Too many resolved future repeats; simplify the series or shorten its history.": "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u043A\u0440\u044B\u0442\u044B\u0445 \u0431\u0443\u0434\u0443\u0449\u0438\u0445 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432. \u0423\u043F\u0440\u043E\u0441\u0442\u0438\u0442\u0435 \u0441\u0435\u0440\u0438\u044E \u0438\u043B\u0438 \u0441\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0434\u0430\u0442."
};
function messageText(message, language) {
  if (language !== "ru") return message;
  if (russianErrors[message]) return russianErrors[message];
  if (message.includes("\n"))
    return message.split("\n").map((line) => messageText(line, language)).join("\n");
  const patterns = [
    [/^Invalid date\. (.+)$/, (m) => `\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0434\u0430\u0442\u0430. \u0424\u043E\u0440\u043C\u0430\u0442: ${m[1]}`],
    [
      /^(COUNT|INTERVAL) must be a positive integer no greater than 100000\.$/,
      (m) => `${m[1]} \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C \u043E\u0442 1 \u0434\u043E 100 000.`
    ],
    [/^Invalid (BY\w+) value\.$/, (m) => `\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 ${m[1]} \u0432 \u043F\u0440\u0430\u0432\u0438\u043B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u0430.`],
    [/^Note not found: (.+)$/, (m) => `\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: ${m[1]}`],
    [
      /^A file blocks the planner folder: (.+)$/,
      (m) => `\u0424\u0430\u0439\u043B \u043C\u0435\u0448\u0430\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044E \u043F\u0430\u043F\u043A\u0438 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430: ${m[1]}`
    ],
    [
      /^Unsupported future planner schema: (.+)$/,
      (m) => `\u0411\u043E\u043B\u0435\u0435 \u043D\u043E\u0432\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0441\u0445\u0435\u043C\u044B \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430: ${m[1]}`
    ],
    [
      /^Invalid planner metadata: (.+)$/,
      (m) => `\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430: ${m[1].split(": ")[0]}`
    ],
    [
      /^Unresolved project: (.+) → (.+)\. Assigned to inbox\.$/,
      (m) => `\u041F\u0440\u043E\u0435\u043A\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${m[1]} \u2192 ${m[2]}. \u0417\u0430\u0434\u0430\u0447\u0430 \u043F\u043E\u043C\u0435\u0449\u0435\u043D\u0430 \u0432\u043E \u0432\u0445\u043E\u0434\u044F\u0449\u0438\u0435.`
    ],
    [
      /^Multiple projects: (.+)\. The first is active; all original links are retained in topLegacyProjects\.$/,
      (m) => `\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432: ${m[1]}. \u0412\u044B\u0431\u0440\u0430\u043D \u043F\u0435\u0440\u0432\u044B\u0439; \u0432\u0441\u0435 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0441\u0441\u044B\u043B\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B \u0432 topLegacyProjects.`
    ],
    [
      /^Missing repeat start: (.+)\. Used (.+)\.$/,
      (m) => `\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E \u043D\u0430\u0447\u0430\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432: ${m[1]}. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0430 \u0434\u0430\u0442\u0430 ${m[2]}.`
    ],
    [
      /^Check recurrence in (.+): (.+)$/,
      (m) => `\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0432\u0442\u043E\u0440 \u0432 ${m[1]}: ${messageText(m[2], language)}`
    ],
    [
      /^Unfinished timer in (.+)\. Original entry retained; no duration invented\.$/,
      (m) => `\u041D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0439 \u0442\u0430\u0439\u043C\u0435\u0440 \u0432 ${m[1]}. \u0418\u0441\u0445\u043E\u0434\u043D\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430; \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u0430.`
    ]
  ];
  for (const [pattern, render] of patterns) {
    const match = message.match(pattern);
    if (match) return render(match);
  }
  console.error("[Tiny Planner]", message);
  return "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0438 \u0432 \u043A\u043E\u043D\u0441\u043E\u043B\u0438 Obsidian.";
}

// src/ui/dom.ts
function el(parent, tag, cls = "", text = "") {
  const node = parent.ownerDocument.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  parent.appendChild(node);
  return node;
}
function datedHeading(parent, title2, range2, cls = "", titleClass = "") {
  const heading = el(parent, "div", "tp-stats-heading tp-dated-heading" + (cls ? " " + cls : ""));
  el(heading, "h2", titleClass, title2);
  el(heading, "span", "tp-muted tp-period-range", range2);
  return heading;
}
function button(parent, text, action, cls = "") {
  const b = el(parent, "button", cls, text);
  b.type = "button";
  b.addEventListener("click", action);
  return b;
}
function iconButton(parent, icon, label, action, cls = "") {
  const b = button(parent, "", action, cls);
  b.classList.add("tp-icon-button");
  (0, import_obsidian3.setIcon)(b, icon);
  b.title = label;
  b.setAttribute("aria-label", label);
  return b;
}
function input(parent, type, value = "", placeholder = "") {
  const i = el(parent, "input");
  i.type = type;
  i.value = value;
  i.placeholder = placeholder;
  return i;
}
function field(parent, label) {
  const l = el(parent, "label", "tp-field");
  el(l, "span", "", label);
  return l;
}
function select(parent, options, value) {
  const s = el(parent, "select");
  for (const [v, t] of options) {
    const o = el(s, "option", "", t);
    o.value = v;
  }
  s.value = value;
  return s;
}
function dateInput(parent, value, format = "dmy", language = "ru") {
  const wrapper = el(parent, "div", "tp-date-control");
  const i = input(wrapper, "text", formatDate(value, format) || value);
  i.classList.add("tp-date");
  i.dataset.dateFormat = format;
  i.placeholder = format === "iso" ? "YYYY-MM-DD" : format === "mdy" ? "MM/DD/YYYY" : "DD.MM.YYYY";
  i.setAttribute("aria-label", i.placeholder);
  i.autocomplete = "off";
  i.inputMode = "numeric";
  i.maxLength = 10;
  i.addEventListener("input", () => i.setCustomValidity(""));
  i.addEventListener("blur", () => {
    const key = parseDate(i.value, format);
    if (key) i.value = formatDate(key, format);
  });
  attachCalendar(wrapper, i, language);
  return i;
}
function readDate(i) {
  const result = parseDate(i.value, i.dataset.dateFormat);
  if (i.value.trim() && !result) {
    i.setCustomValidity(i.placeholder);
    i.reportValidity();
    throw new Error(`Invalid date. ${i.placeholder}`);
  }
  return result;
}
function writeDate(i, key) {
  i.value = formatDate(key, i.dataset.dateFormat);
  i.setCustomValidity("");
  i.dispatchEvent(new i.ownerDocument.defaultView.Event("change", { bubbles: true }));
}
function timeInput(parent, value, label, language = "ru") {
  const wrapper = el(parent, "div", "tp-time-control");
  const i = input(wrapper, "text", value, language === "ru" ? "\u0427\u0427:\u041C\u041C" : "HH:mm");
  i.inputMode = "numeric";
  i.classList.add("tp-time");
  i.setAttribute("aria-label", label);
  i.autocomplete = "off";
  i.maxLength = 5;
  i.addEventListener("input", () => i.setCustomValidity(""));
  i.addEventListener("blur", () => {
    const key = timeKey(i.value);
    if (key) i.value = key;
  });
  attachClock(wrapper, i, language);
  return i;
}
function readTime(i) {
  const key = timeKey(i.value);
  if (i.value.trim() && !key)
    throw new Error("Invalid appointment time. Use HH:mm from 00:00 to 23:59.");
  return key;
}
function attachCalendar(wrapper, input2, language) {
  const w = words(language);
  const locale = language === "ru" ? "ru-RU" : "en-US";
  const popup = el(wrapper, "div", "tp-picker-popup");
  popup.setAttribute("popover", "auto");
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", w.chooseDate);
  popup.hidden = true;
  let month = day().slice(0, 7) + "-01";
  let focusDay = "";
  const close = (restore = true) => {
    if (popup.hidePopover) {
      try {
        popup.hidePopover();
      } catch {
      }
    }
    popup.hidden = true;
    popup.dataset.open = "false";
    trigger.setAttribute("aria-expanded", "false");
    if (restore) input2.focus();
  };
  const choose = (key) => {
    writeDate(input2, key);
    close();
  };
  const render = (focusControl = "") => {
    popup.replaceChildren();
    const header = el(popup, "div", "tp-picker-header");
    const previous = iconButton(header, "chevron-left", w.previous, () => {
      month = shiftMonth(month, -1);
      render("previous");
    });
    previous.dataset.pickerControl = "previous";
    const monthSelect = select(
      header,
      Array.from({ length: 12 }, (_, n) => [
        String(n + 1).padStart(2, "0"),
        new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
          utc(`2026-${String(n + 1).padStart(2, "0")}-01`)
        )
      ]),
      month.slice(5, 7)
    );
    monthSelect.setAttribute("aria-label", w.pickerMonth);
    monthSelect.dataset.pickerControl = "month";
    const year = Number(month.slice(0, 4));
    const years = [.../* @__PURE__ */ new Set([...Array.from({ length: 201 }, (_, n) => 1900 + n), year])].sort(
      (a, b) => a - b
    );
    const yearSelect = select(
      header,
      years.map((n) => [String(n).padStart(4, "0"), String(n)]),
      month.slice(0, 4)
    );
    yearSelect.setAttribute("aria-label", w.pickerYear);
    yearSelect.dataset.pickerControl = "year";
    monthSelect.addEventListener("change", () => {
      month = `${month.slice(0, 4)}-${monthSelect.value}-01`;
      render("month");
    });
    yearSelect.addEventListener("change", () => {
      month = `${yearSelect.value}-${month.slice(5, 7)}-01`;
      render("year");
    });
    const next = iconButton(header, "chevron-right", w.next, () => {
      month = shiftMonth(month, 1);
      render("next");
    });
    next.dataset.pickerControl = "next";
    previous.disabled = !dateKey(shiftMonth(month, -1));
    next.disabled = !dateKey(shiftMonth(month, 1));
    const weekdays = el(popup, "div", "tp-picker-weekdays");
    for (let n = 0; n < 7; n++)
      el(
        weekdays,
        "span",
        "",
        new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
          utc(addDays("2026-10-05", n))
        )
      );
    const days = el(popup, "div", "tp-picker-days");
    const selected = parseDate(input2.value, input2.dataset.dateFormat);
    const candidate = focusDay || selected || day();
    const tabbable = candidate.slice(0, 7) === month.slice(0, 7) ? candidate : month;
    for (const key of monthGrid(month)) {
      const b = button(days, String(Number(key.slice(8))), () => choose(key), "tp-picker-day");
      b.dataset.pickerDay = key;
      b.setAttribute("aria-label", formatDate(key, input2.dataset.dateFormat));
      b.setAttribute("aria-pressed", String(key === selected));
      if (key === day()) b.setAttribute("aria-current", "date");
      b.classList.toggle("tp-picker-outside", key.slice(0, 7) !== month.slice(0, 7));
      b.tabIndex = key === tabbable ? 0 : -1;
      b.addEventListener("keydown", (e) => {
        const delta = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -7,
          ArrowDown: 7
        };
        if (delta[e.key] !== void 0) {
          e.preventDefault();
          focusDay = addDays(key, delta[e.key]);
          if (focusDay.slice(0, 7) !== month.slice(0, 7)) month = focusDay.slice(0, 7) + "-01";
          render("day");
        }
      });
    }
    const actions = el(popup, "div", "tp-picker-actions");
    button(actions, w.today, () => choose(day()));
    button(actions, w.clearDate, () => choose(""));
    if (focusControl)
      popup.querySelector(
        focusControl === "day" ? `[data-picker-day="${focusDay}"]` : `[data-picker-control="${focusControl}"]`
      )?.focus();
  };
  const trigger = iconButton(
    wrapper,
    "calendar",
    w.chooseDate,
    () => {
      if (popup.dataset.open === "true") {
        close();
        return;
      }
      const selected = parseDate(input2.value, input2.dataset.dateFormat);
      month = (selected || day()).slice(0, 7) + "-01";
      focusDay = "";
      render();
      popup.hidden = false;
      popup.dataset.open = "true";
      if (popup.showPopover) popup.showPopover();
      trigger.setAttribute("aria-expanded", "true");
      const box = trigger.getBoundingClientRect();
      const viewport = wrapper.ownerDocument.defaultView;
      const width = popup.getBoundingClientRect().width || 280;
      const height = popup.getBoundingClientRect().height || 290;
      popup.style.left = `${Math.max(8, Math.min(box.right - width, viewport.innerWidth - width - 8))}px`;
      popup.style.top = `${Math.max(8, Math.min(box.bottom + 6, viewport.innerHeight - height - 8))}px`;
      popup.querySelector('.tp-picker-day[tabindex="0"]')?.focus();
    },
    "tp-date-picker-button"
  );
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  popup.addEventListener("toggle", (e) => {
    if (e.newState === "closed") {
      popup.dataset.open = "false";
      trigger.setAttribute("aria-expanded", "false");
    }
  });
  popup.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });
}
function attachClock(wrapper, input2, language) {
  const w = words(language);
  const popup = el(wrapper, "div", "tp-picker-popup tp-clock-popup");
  popup.setAttribute("popover", "auto");
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", w.chooseTime);
  popup.hidden = true;
  const close = (restore = true) => {
    if (popup.hidePopover) {
      try {
        popup.hidePopover();
      } catch {
      }
    }
    popup.replaceChildren();
    popup.hidden = true;
    popup.dataset.open = "false";
    trigger.setAttribute("aria-expanded", "false");
    if (restore) input2.focus();
  };
  const apply = (value) => {
    input2.value = value;
    input2.setCustomValidity("");
    input2.dispatchEvent(new input2.ownerDocument.defaultView.Event("change", { bubbles: true }));
    close();
  };
  const trigger = iconButton(
    wrapper,
    "clock",
    w.chooseTime,
    () => {
      if (popup.dataset.open === "true") {
        close();
        return;
      }
      const value = timeKey(input2.value) || "09:00";
      const grid = el(popup, "div", "tp-clock-grid");
      const hours = select(
        field(grid, w.clockHours),
        Array.from({ length: 24 }, (_, n) => [
          String(n).padStart(2, "0"),
          String(n).padStart(2, "0")
        ]),
        "09"
      );
      hours.setAttribute("aria-label", w.clockHours);
      const minutes = select(
        field(grid, w.clockMinutes),
        Array.from({ length: 60 }, (_, n) => [
          String(n).padStart(2, "0"),
          String(n).padStart(2, "0")
        ]),
        "00"
      );
      minutes.setAttribute("aria-label", w.clockMinutes);
      const actions = el(popup, "div", "tp-picker-actions");
      button(actions, w.clearTime, () => apply(""));
      button(actions, w.applyTime, () => apply(`${hours.value}:${minutes.value}`), "mod-cta");
      hours.value = value.slice(0, 2);
      minutes.value = value.slice(3, 5);
      popup.hidden = false;
      popup.dataset.open = "true";
      if (popup.showPopover) popup.showPopover();
      trigger.setAttribute("aria-expanded", "true");
      const box = trigger.getBoundingClientRect();
      const viewport = wrapper.ownerDocument.defaultView;
      const size = popup.getBoundingClientRect();
      const width = size.width || 260, height = size.height || 170;
      popup.style.left = `${Math.max(8, Math.min(box.right - width, viewport.innerWidth - width - 8))}px`;
      popup.style.top = `${Math.max(8, Math.min(box.bottom + 6, viewport.innerHeight - height - 8))}px`;
      hours.focus();
    },
    "tp-time-picker-button"
  );
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  popup.addEventListener("toggle", (e) => {
    if (e.newState === "closed") {
      popup.replaceChildren();
      popup.dataset.open = "false";
      trigger.setAttribute("aria-expanded", "false");
    }
  });
  popup.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });
}
function stabilizeButton(target, labels) {
  const text = target.textContent || "";
  target.textContent = "";
  target.classList.add("tp-stable-button");
  target.dataset.labelA = labels[0];
  target.dataset.labelB = labels[1];
  el(target, "span", "tp-button-label", text);
}

// src/core/analytics.ts
var counts = () => ({ open: 0, done: 0, failed: 0 });
var sum = (a, b) => Math.min(Number.MAX_SAFE_INTEGER, a + (Number.isFinite(b) && b > 0 ? b : 0));
var isSeries = (task) => !!task.recurrence;
function loggedMinutes(task) {
  if (task.kind === "subscription" || task.kind === "payment") return 0;
  let minutes = sum(0, task.minutes);
  if (isSeries(task)) {
    const skipped = new Set(task.skipped);
    for (const [key, record] of Object.entries(task.occurrences))
      if (!skipped.has(key)) minutes = sum(minutes, record.minutes || 0);
  }
  return minutes;
}
function completion(c) {
  const total = c.open + c.done + c.failed;
  return total ? Math.round(c.done / total * 100) : null;
}
function analytics(tasks, projects, today, days, knownProjectPaths = new Set(projects.map((p) => p.path))) {
  const result = {
    tasks: tasks.filter((t) => t.kind !== "subscription" && t.kind !== "payment").length,
    workflow: Object.fromEntries(STATUSES.map((s) => [s, 0])),
    finite: counts(),
    series: 0,
    history: counts(),
    overdue: 0,
    noDate: 0,
    inbox: 0,
    unsupported: 0,
    minutes: 0,
    undated: 0,
    recordedMinutes: 0,
    openMinutes: 0,
    unallocatedMinutes: 0,
    projects: projects.map((project) => ({
      project,
      tasks: 0,
      finite: counts(),
      series: 0,
      minutes: 0
    })),
    projectStatuses: Object.fromEntries(STATUSES.map((s) => [s, 0])),
    activity: periodDates(today, days).map((date) => ({
      date,
      done: 0,
      failed: 0,
      minutes: 0
    })),
    period: { done: 0, failed: 0, minutes: 0 }
  };
  const byProject = new Map(result.projects.map((p) => [p.project.path, p]));
  const byDay = new Map(result.activity.map((d) => [d.date, d]));
  for (const p of projects) {
    const status = p.status;
    if (Object.prototype.hasOwnProperty.call(result.projectStatuses, status))
      result.projectStatuses[status]++;
  }
  const event = (status, date, minutes) => {
    if (status !== "done" && status !== "failed") return;
    if (!date) result.undated++;
    const d = byDay.get(date);
    if (!d) return;
    d[status]++;
    d.minutes = sum(d.minutes, minutes);
    result.period[status]++;
    result.period.minutes = sum(result.period.minutes, minutes);
  };
  for (const task of tasks) {
    if (task.kind === "subscription" || task.kind === "payment") continue;
    const p = byProject.get(task.project);
    if (p) p.tasks++;
    if (!knownProjectPaths.has(task.project)) result.inbox++;
    if (!task.scheduled && !task.workDates?.length && !task.due) result.noDate++;
    if (task.unsupportedRepeat) result.unsupported++;
    let minutes = isSeries(task) || isActive(task.status) ? 0 : sum(0, task.minutes);
    result.recordedMinutes = sum(result.recordedMinutes, loggedMinutes(task));
    if (isSeries(task)) {
      result.unallocatedMinutes = sum(result.unallocatedMinutes, task.minutes);
      result.series++;
      if (p) p.series++;
      const skipped = new Set(task.skipped);
      for (const [key, record] of Object.entries(task.occurrences)) {
        if (skipped.has(key)) continue;
        result.history[record.status === "done" || record.status === "failed" ? record.status : "open"]++;
        if (isActive(record.status))
          result.openMinutes = sum(result.openMinutes, record.minutes || 0);
        else minutes = sum(minutes, record.minutes || 0);
        event(
          record.status,
          dateKey(task.moves[key]) || dateKey(key) || dateKey(record.resolvedOn) || dateKey(record.resolvedAt),
          record.minutes || 0
        );
      }
    } else {
      if (isActive(task.status)) result.openMinutes = sum(result.openMinutes, task.minutes);
      result.workflow[task.status]++;
      result.finite[task.status === "done" || task.status === "failed" ? task.status : "open"]++;
      if (p) p.finite[task.status === "done" || task.status === "failed" ? task.status : "open"]++;
      event(
        task.status,
        dateKey(task.scheduled) || dateKey(task.workDates?.[0]) || dateKey(task.due) || dateKey(task.resolvedOn),
        minutes
      );
      const end = task.due || task.scheduled || task.workDates?.at(-1);
      if (isActive(task.status) && end && end < today) result.overdue++;
    }
    result.minutes = sum(result.minutes, minutes);
    if (p) p.minutes = sum(p.minutes, minutes);
  }
  return result;
}

// src/ui/dashboard.ts
var PAGE_SIZE = 12;
function svgNode(parent, tag, attrs = {}, text = "") {
  const n = parent.ownerDocument.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) n.setAttribute(key, String(value));
  if (text) n.textContent = text;
  parent.appendChild(n);
  return n;
}
function dashboard(parent, data, state, w, locale, filtered, refresh, editProject, projectLabel, dateFormat = "dmy") {
  const formatter = new Intl.NumberFormat(locale);
  const n = (value) => formatter.format(value);
  const time = (minutes) => `${n(Math.floor(minutes / 60))} ${w.hourUnit} ${n(minutes % 60)} ${w.minuteUnit}`;
  const finiteTotal = data.finite.open + data.finite.done + data.finite.failed;
  const root = el(parent, "div", "tp-dashboard");
  periodHeading(
    root,
    w.periodSummary,
    `${formatDate(data.activity[0].date, dateFormat)} \u2014 ${formatDate(data.activity.at(-1).date, dateFormat)}`,
    state,
    w,
    refresh,
    parent
  );
  if (!data.tasks && !data.projects.length) {
    const empty2 = el(root, "div", "tp-stats-empty");
    el(empty2, "h2", "", filtered ? w.statsFilteredEmpty : w.statsEmpty);
    el(empty2, "p", "tp-muted", filtered ? w.statsFilteredHelp : w.statsEmptyHelp);
  }
  const metrics = el(root, "div", "tp-metrics");
  const metric = (key, label, value, hint) => {
    const card = el(metrics, "section", "tp-metric");
    card.dataset.metric = key;
    el(card, "h2", "tp-muted", label);
    el(card, "strong", "tp-metric-value", value);
    if (hint) el(card, "span", "tp-muted", hint);
  };
  metric(
    "tasks",
    w.taskNotes,
    n(data.tasks),
    `${w.oneOff}: ${n(finiteTotal)} \xB7 ${w.seriesCount}: ${n(data.series)}`
  );
  const rate = completion(data.finite);
  metric(
    "progress",
    w.taskProgress,
    rate === null ? "\u2014" : `${n(rate)}%`,
    `${n(data.finite.done)} / ${n(finiteTotal)} \xB7 ${w.oneOff.toLocaleLowerCase()}`
  );
  metric("time", w.timeTotal, time(data.minutes), "");
  metric(
    "projects",
    w.projectTotal,
    n(data.projects.length),
    `${w.active}: ${n(data.projectStatuses.todo + data.projectStatuses["in-progress"])}`
  );
  const charts = el(root, "div", "tp-stats-charts");
  const statusPanel = el(charts, "section", "tp-stats-panel tp-workflow-panel");
  el(statusPanel, "h2", "", w.taskStatuses);
  const ring = svgNode(statusPanel, "svg", {
    viewBox: "0 0 220 180",
    class: "tp-workflow-ring",
    role: "img",
    "aria-label": STATUSES.map((s) => `${w[s]}: ${n(data.workflow[s])}`).join(", ")
  });
  svgNode(ring, "circle", {
    cx: 110,
    cy: 90,
    r: 64,
    fill: "none",
    "stroke-width": 18,
    class: "tp-ring-track"
  });
  let offset = 0;
  const circumference = 2 * Math.PI * 64;
  for (const status of STATUSES) {
    const share = finiteTotal ? data.workflow[status] / finiteTotal : 0;
    if (!share) continue;
    const segment = svgNode(ring, "circle", {
      cx: 110,
      cy: 90,
      r: 64,
      fill: "none",
      "stroke-width": 18,
      stroke: `var(--tp-status-${status})`,
      "stroke-dasharray": `${share * circumference} ${circumference}`,
      "stroke-dashoffset": -offset * circumference,
      transform: "rotate(-90 110 90)"
    });
    svgNode(segment, "title", {}, `${w[status]}: ${n(data.workflow[status])}`);
    offset += share;
  }
  svgNode(
    ring,
    "text",
    { x: 110, y: 94, "text-anchor": "middle", class: "tp-ring-value" },
    rate === null ? "\u2014" : `${n(rate)}%`
  );
  svgNode(
    ring,
    "text",
    { x: 110, y: 115, "text-anchor": "middle", class: "tp-chart-label" },
    w.done
  );
  const stack = el(statusPanel, "div", "tp-status-chart");
  stack.setAttribute("role", "img");
  stack.setAttribute(
    "aria-label",
    STATUSES.map((s) => `${w[s]}: ${n(data.workflow[s])}`).join(", ")
  );
  for (const status of STATUSES) {
    const row = el(stack, "div", "tp-workflow-stat");
    row.dataset.status = status;
    el(row, "span", "", w[status]);
    el(row, "strong", "", n(data.workflow[status]));
    const track = el(row, "div", "tp-workflow-track");
    track.setAttribute("aria-hidden", "true");
    el(track, "span").style.width = `${finiteTotal ? data.workflow[status] / finiteTotal * 100 : 0}%`;
  }
  const number = (list, label, value, cls = "") => {
    const group = el(list, "div", cls);
    el(group, "dt", "", label);
    el(group, "dd", "", n(value));
  };
  const activity = el(charts, "section", "tp-stats-panel tp-activity");
  const head = el(activity, "div", "tp-stats-heading");
  el(head, "h2", "", w.activity);
  const totals = el(activity, "dl", "tp-activity-totals");
  for (const status of ["done", "failed"]) {
    const item = el(totals, "div", "tp-activity-total tp-total-" + status);
    el(item, "dt", "", w[status]);
    el(item, "dd", "", n(data.period[status]));
  }
  const duration = el(totals, "div", "tp-activity-total tp-total-time");
  el(duration, "dt", "", w.timePeriod);
  el(duration, "dd", "", time(data.period.minutes));
  const buckets = periodBuckets(
    data.activity.map((d) => d.date),
    state.days
  );
  const points = buckets.map((bucket) => {
    const days = data.activity.slice(bucket.start, bucket.end);
    return {
      ...bucket,
      done: days.reduce((n2, d) => n2 + d.done, 0),
      failed: days.reduce((n2, d) => n2 + d.failed, 0),
      minutes: days.reduce((n2, d) => n2 + d.minutes, 0)
    };
  });
  fitChart(
    activity,
    points.map((d) => ({
      ...d,
      values: [d.done, d.failed],
      title: `${formatDate(d.from, dateFormat)} \u2014 ${formatDate(d.to, dateFormat)} \xB7 ${w.done}: ${n(d.done)} \xB7 ${w.failed}: ${n(d.failed)}`
    })),
    ["tp-chart-done", "tp-chart-failed"],
    "tp-activity-chart",
    w.activity,
    dateFormat,
    locale,
    "line"
  );
  if (!data.period.done && !data.period.failed)
    el(activity, "p", "tp-muted tp-chart-empty", w.activityEmpty);
  el(activity, "h2", "tp-time-chart-heading", w.timeActivity);
  fitChart(
    activity,
    points.map((d) => ({
      ...d,
      values: [d.minutes],
      title: `${formatDate(d.from, dateFormat)} \u2014 ${formatDate(d.to, dateFormat)} \xB7 ${time(d.minutes)}`
    })),
    ["tp-chart-time"],
    "tp-time-chart",
    w.timeActivity,
    dateFormat,
    locale,
    "line"
  );
  const details = el(activity, "details", "tp-activity-details");
  details.open = state.details;
  details.addEventListener("toggle", () => {
    if (details.isConnected) state.details = details.open;
  });
  el(details, "summary", "", w.numericDetails);
  const scroll = el(details, "div", "tp-stats-table-wrap");
  const table = el(scroll, "table", "tp-stats-table");
  el(table, "caption", "tp-visually-hidden", w.numericDetails);
  const th = el(el(table, "thead"), "tr");
  for (const label of [w.date, w.done, w.failed, w.minutes]) el(th, "th", "", label).scope = "col";
  const tbody = el(table, "tbody");
  for (const d of [...data.activity].reverse()) {
    const row = el(tbody, "tr");
    el(row, "th", "", formatDate(d.date, dateFormat)).scope = "row";
    for (const value of [d.done, d.failed, d.minutes]) el(row, "td", "", n(value));
  }
  const overall = el(root, "section", "tp-stats-overview");
  const overallHead = el(overall, "div", "tp-stats-heading");
  el(overallHead, "h2", "", w.overallSummary);
  el(overallHead, "span", "tp-muted", w.allTime);
  overall.append(metrics, statusPanel);
  charts.after(overall);
  const projectPanel = el(root, "section", "tp-stats-panel tp-project-panel");
  const projectHead = el(projectPanel, "div", "tp-stats-heading");
  el(projectHead, "h2", "", w.projectProgress);
  el(projectHead, "span", "tp-muted", w.allTime);
  el(projectHead, "span", "tp-muted", `${w.projectTotal}: ${n(data.projects.length)}`);
  if (!data.projects.length) el(projectPanel, "p", "tp-muted", w.projectEmpty);
  else {
    const pages = Math.ceil(data.projects.length / PAGE_SIZE);
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    const overview = el(projectPanel, "div", "tp-project-overview");
    overview.setAttribute("role", "list");
    for (const p of data.projects.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE)) {
      const row2 = el(overview, "div", "tp-project-chart-row");
      row2.setAttribute("role", "listitem");
      const name = button(
        row2,
        projectLabel(p.project),
        () => editProject(p.project),
        "tp-text-button"
      );
      name.title = projectLabel(p.project);
      const total = p.finite.open + p.finite.done + p.finite.failed;
      el(
        row2,
        "span",
        "tp-project-completed",
        `${n(p.finite.done)} / ${n(total)} ${w.projectCounts}`
      );
      el(row2, "strong", "", total ? `${completion(p.finite)}%` : "\u2014");
      const track = el(row2, "div", "tp-project-chart-track");
      track.setAttribute("aria-hidden", "true");
      el(track, "span", "tp-chart-done").style.width = `${completion(p.finite) || 0}%`;
    }
    const projectDetails = el(projectPanel, "details", "tp-project-details");
    projectDetails.open = !!state.projectDetails;
    projectDetails.addEventListener("toggle", () => {
      if (projectDetails.isConnected) state.projectDetails = projectDetails.open;
    });
    el(projectDetails, "summary", "", w.projectDetails);
    const wrap = el(projectDetails, "div", "tp-stats-table-wrap");
    const table2 = el(wrap, "table", "tp-stats-table tp-project-stats");
    el(table2, "caption", "tp-visually-hidden", w.projectProgress);
    const row = el(el(table2, "thead"), "tr");
    for (const label of [w.project, w.taskNotes, w.taskProgress, w.seriesCount, w.minutes])
      el(row, "th", "", label).scope = "col";
    const body2 = el(table2, "tbody");
    for (const p of data.projects.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE)) {
      const tr = el(body2, "tr");
      tr.dataset.project = p.project.path;
      const name = el(tr, "th");
      name.scope = "row";
      const projectButton = button(
        name,
        projectLabel(p.project),
        () => editProject(p.project),
        "tp-text-button"
      );
      projectButton.title = p.project.path;
      el(name, "small", "tp-muted", w[p.project.status]);
      el(tr, "td", "", n(p.tasks));
      const progress = el(tr, "td");
      const total = p.finite.done + p.finite.open + p.finite.failed;
      const rate2 = completion(p.finite);
      el(progress, "span", "", rate2 === null ? "\u2014" : `${n(rate2)}%`);
      el(
        progress,
        "small",
        "tp-muted",
        `${n(p.finite.done)} / ${n(total)} \xB7 ${w.failed}: ${n(p.finite.failed)}`
      );
      el(tr, "td", "", n(p.series));
      el(tr, "td", "", n(p.minutes));
    }
    if (pages > 1) {
      const pager = el(projectPanel, "div", "tp-stats-pager");
      const navigate = (delta, direction) => {
        state.page += delta;
        refresh();
        const same = parent.querySelector(`[data-page-action="${direction}"]`);
        const target = same?.disabled ? parent.querySelector(".tp-stats-pager button:not(:disabled)") : same;
        target?.focus({ preventScroll: true });
      };
      const prev = button(pager, "\u2190", () => navigate(-1, "previous"));
      prev.disabled = state.page === 0;
      prev.dataset.pageAction = "previous";
      prev.setAttribute("aria-label", w.previousPage);
      el(pager, "span", "tp-muted", `${w.page} ${n(state.page + 1)} / ${n(pages)}`);
      const next = button(pager, "\u2192", () => navigate(1, "next"));
      next.disabled = state.page === pages - 1;
      next.dataset.pageAction = "next";
      next.setAttribute("aria-label", w.nextPage);
    }
  }
  const extraDetails = el(root, "details", "tp-stats-disclosure");
  extraDetails.open = !!state.extraDetails;
  extraDetails.addEventListener("toggle", () => {
    if (extraDetails.isConnected) state.extraDetails = extraDetails.open;
  });
  el(extraDetails, "summary", "", w.statsDetails);
  const extra = el(extraDetails, "dl", "tp-stats-extra tp-stats-numbers");
  for (const [label, value] of [
    [w.overdueOneOff, data.overdue],
    [w.seriesCount, data.series],
    [w.recurringDone, data.history.done],
    [w.recurringFailed, data.history.failed],
    [w.savedTime, data.recordedMinutes],
    [w.openTime + " \xB7 " + w.minuteUnit, data.openMinutes],
    [w.unallocatedTime + " \xB7 " + w.minuteUnit, data.unallocatedMinutes],
    [w.inboxCount, data.inbox],
    [w.noDateCount, data.noDate],
    [w.undatedCount, data.undated],
    ...["backlog", "todo", "in-progress", "done", "failed"].map(
      (s) => [w[s] + " \xB7 " + w.projectTotal.toLocaleLowerCase(), data.projectStatuses[s]]
    )
  ])
    number(extra, label, value);
}
function periodHeading(parent, title2, range2, state, w, refresh, focusRoot) {
  const heading = el(parent, "div", "tp-stats-heading tp-period-heading");
  el(heading, "h2", "", title2);
  const context = el(heading, "div", "tp-period-context");
  periodChooser(context, state, w, refresh, focusRoot);
  el(context, "span", "tp-muted tp-period-range", range2);
  return heading;
}
function periodChooser(parent, state, w, refresh, focusRoot) {
  const periods = el(parent, "div", "tp-periods");
  periods.setAttribute("role", "group");
  periods.setAttribute("aria-label", w.period);
  for (const days of [7, 30, 90, 365]) {
    const b = button(
      periods,
      w[days === 7 ? "days7" : days === 30 ? "days30" : days === 90 ? "days90" : "days365"],
      () => {
        state.days = days;
        refresh();
        focusRoot.querySelector(`[data-period="${days}"]`)?.focus({ preventScroll: true });
      }
    );
    b.title = w.currentPeriod + " \xB7 " + b.textContent;
    b.dataset.period = String(days);
    b.setAttribute("aria-pressed", String(state.days === days));
  }
}
function periodBuckets(dates, days) {
  const buckets = [];
  for (let start = 0; start < dates.length; ) {
    let end = start + 1;
    if (days === 90) end = Math.min(start + 7, dates.length);
    else if (days === 365)
      while (end < dates.length && dates[end].slice(0, 7) === dates[start].slice(0, 7)) end++;
    buckets.push({ start, end, from: dates[start], to: dates[end - 1] });
    start = end;
  }
  return buckets;
}
function fitChart(parent, points, colors, cls, label, dateFormat, locale, mode = "bar") {
  if (!points.length) return;
  const frame = el(parent, "div", "tp-fit-chart");
  const padding = parent.ownerDocument.defaultView?.getComputedStyle(parent);
  const width = Math.max(
    160,
    (parent.clientWidth || 640) - (parseFloat(padding?.paddingLeft || "") || 0) - (parseFloat(padding?.paddingRight || "") || 0)
  );
  const columns = Math.max(3, Math.floor((width - 60) / 26));
  const rows = mode === "line" ? 1 : Math.max(1, Math.ceil(points.length / columns));
  const perRow = Math.ceil(points.length / rows);
  const maximum = Math.max(
    1,
    ...points.map(
      (p) => mode === "line" ? Math.max(0, ...p.values) : p.values.reduce((a, b) => a + b, 0)
    )
  );
  const max = cls === "tp-activity-chart" ? Math.max(4, Math.ceil(maximum / 4) * 4) : maximum;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, notation: "compact" });
  for (let offset = 0; offset < points.length; offset += perRow) {
    const part = points.slice(offset, offset + perRow);
    const chart = svgNode(frame, "svg", {
      viewBox: `0 0 ${width} 230`,
      width: "100%",
      height: 230,
      class: cls,
      role: "img",
      "aria-label": label
    });
    svgNode(
      chart,
      "title",
      {},
      `${label} \xB7 ${formatDate(part[0].from, dateFormat)} \u2014 ${formatDate(part.at(-1).to, dateFormat)}`
    );
    const left = cls === "tp-finance-chart" ? Math.max(
      48,
      ...[0, max / 2, max].map((value) => number.format(value).length * 7.5 + 12)
    ) : 48, bottom = 170, plot = mode === "line" ? 150 : 140, step = (width - left - 12) / part.length;
    for (const value of [0, max / 2, max]) {
      const y = bottom - value / max * plot;
      svgNode(chart, "line", { x1: left, x2: width - 12, y1: y, y2: y, class: "tp-chart-grid" });
      svgNode(
        chart,
        "text",
        { x: left - 6, y: y + 4, "text-anchor": "end", class: "tp-chart-label" },
        number.format(value)
      );
    }
    const xAt = (index) => mode === "line" ? left + 18 + (part.length > 1 ? (width - left - 48) * index / (part.length - 1) : (width - left - 48) / 2) : left + (index + 0.5) * step;
    if (mode === "line") {
      colors.forEach((color, series) => {
        const path = part.map(
          (p, i) => `${i ? "L" : "M"} ${xAt(i)} ${bottom - (p.values[series] || 0) / max * plot}`
        ).join(" ");
        svgNode(chart, "path", { d: path, class: `tp-chart-line ${color}`, "aria-hidden": "true" });
      });
    }
    part.forEach((p, i) => {
      let y = bottom;
      p.values.forEach((value, index) => {
        if (mode === "line") {
          const point = svgNode(chart, "circle", {
            cx: xAt(i),
            cy: bottom - value / max * plot,
            r: value ? 3 : 2,
            class: `tp-chart-point ${colors[index]}`,
            "data-value": value,
            "data-series": index,
            "data-date": p.from,
            "data-through": p.to,
            tabindex: 0,
            role: "img",
            "aria-label": p.title
          });
          svgNode(point, "title", {}, p.title);
        } else {
          if (!value) return;
          const height = value / max * plot;
          y -= height;
          const bar = svgNode(chart, "rect", {
            x: left + (i + 0.15) * step,
            y,
            width: step * 0.7,
            height,
            rx: 2,
            class: colors[index]
          });
          svgNode(bar, "title", {}, p.title);
        }
      });
      const x = xAt(i);
      const monthly = p.from.slice(0, 7) === p.to.slice(0, 7) && p.end - p.start > 7;
      const text = monthly ? new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(
        /* @__PURE__ */ new Date(p.from + "T00:00:00Z")
      ) : dateFormat === "iso" ? p.from.slice(5) : dateFormat === "mdy" ? p.from.slice(5, 7) + "/" + p.from.slice(8) : p.from.slice(8) + "." + p.from.slice(5, 7);
      const tick = svgNode(
        chart,
        "text",
        {
          x,
          y: bottom + 18,
          class: "tp-chart-label tp-day-tick",
          "text-anchor": mode === "line" ? "middle" : "start",
          ...mode === "bar" ? { transform: `rotate(45 ${x} ${bottom + 18})` } : {},
          "data-date": p.from,
          "data-through": p.to
        },
        mode === "bar" || i === 0 || i === part.length - 1 || i % Math.max(1, Math.ceil(part.length / Math.max(2, Math.floor((width - left) / 62)))) === 0 && (cls !== "tp-finance-chart" || (part.length - 1 - i) * (width - left - 48) / Math.max(1, part.length - 1) >= 44) ? text : ""
      );
      svgNode(
        tick,
        "title",
        {},
        `${formatDate(p.from, dateFormat)} \u2014 ${formatDate(p.to, dateFormat)}`
      );
    });
  }
}

// src/ui/finance.ts
function money(amount, currency, locale) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(
    amount
  ) + " " + currency;
}
function financeDashboard(parent, tasks, today, state, w, locale, dateFormat, refresh, projectLabel, openExpenses) {
  const data = financialAnalytics(tasks, today, state.days);
  const root = el(parent, "div", "tp-finance");
  const range2 = `${formatDate(data.from, dateFormat)} \u2014 ${formatDate(data.to, dateFormat)}`;
  const head = periodHeading(root, w.periodSummary, range2, state, w, refresh, parent);
  const manage = button(head, w.subscriptions, openExpenses, "tp-text-button");
  manage.dataset.financeLedger = "true";
  financeOverview(root, data, w, locale, dateFormat);
  if (data.missing.length)
    el(root, "p", "tp-warning", `${w.financeMissing}: ${data.missing.length}`);
  const undated = tasks.filter(
    (t) => t.kind === "payment" && !t.scheduled && !t.due && t.status !== "done" && t.status !== "failed"
  ).length;
  if (undated) el(root, "p", "tp-muted", `${w.undatedPayments}: ${undated}`);
  const unknown = data.planned.filter((e) => e.amount === null).length;
  if (unknown) el(root, "p", "tp-muted", `${w.unpricedPayments}: ${unknown}`);
  if (!data.currencies.includes(state.currency)) state.currency = data.currencies[0] || "USD";
  const panel = el(root, "section", "tp-stats-panel tp-finance-activity");
  const chartHead = el(panel, "div", "tp-stats-heading");
  el(chartHead, "h2", "", w.dailySpending);
  const charts = el(panel, "div", "tp-finance-series");
  const buckets = periodBuckets(
    data.activity.map((d) => d.date),
    state.days
  );
  const seriesPanels = data.currencies.map((code) => {
    const series = el(charts, "section", "tp-finance-currency");
    series.dataset.currency = code;
    const heading = el(series, "div", "tp-finance-currency-heading");
    el(heading, "h3", "", code);
    el(heading, "strong", "", money(data.actualTotals.get(code) || 0, code, locale));
    return { code, series };
  });
  for (const { code, series } of seriesPanels) {
    const points = buckets.map((bucket) => {
      const amount = data.activity.slice(bucket.start, bucket.end).reduce((sum2, d) => sum2 + (d.totals.get(code) || 0), 0);
      return {
        ...bucket,
        values: [amount],
        title: `${formatDate(bucket.from, dateFormat)} \u2014 ${formatDate(bucket.to, dateFormat)} \xB7 ${money(amount, code, locale)}`
      };
    });
    fitChart(
      series,
      points,
      ["tp-chart-time"],
      "tp-finance-chart",
      w.dailySpending + " \xB7 " + code,
      dateFormat,
      locale,
      "line"
    );
    if (!data.actual.some((e) => e.currency === code)) el(series, "p", "tp-muted", w.financeEmpty);
  }
  if (!data.currencies.length) el(panel, "p", "tp-muted", w.financeEmpty);
  if (data.currencies.length) {
    const daily = el(panel, "details", "tp-finance-daily tp-activity-details");
    el(daily, "summary", "", w.numericDetails);
    const dailyList = el(daily, "div", "tp-finance-daily-list");
    for (const d of [...data.activity].reverse()) {
      const row = el(dailyList, "div", "tp-expense-record");
      el(row, "span", "", formatDate(d.date, dateFormat));
      const amounts = el(row, "div", "tp-finance-daily-values");
      for (const code of data.currencies) {
        const value = el(amounts, "strong", "", money(d.totals.get(code) || 0, code, locale));
        value.dataset.currency = code;
      }
    }
  }
  const allocation = el(root, "section", "tp-stats-panel");
  const allocationHead = datedHeading(allocation, w.byProjectCosts, range2);
  const currency = select(
    allocationHead,
    (data.currencies.length ? data.currencies : ["USD"]).map((c) => [c, c]),
    state.currency
  );
  currency.setAttribute("aria-label", w.chooseCurrency);
  currency.dataset.financeCurrency = "true";
  currency.addEventListener("change", () => {
    state.currency = currency.value;
    refresh();
    parent.querySelector("[data-finance-currency]")?.focus({ preventScroll: true });
  });
  const groups = /* @__PURE__ */ new Map();
  for (const e of data.actual) {
    const label = projectLabel(e.task);
    const entries = groups.get(label) || [];
    entries.push(e);
    groups.set(label, entries);
  }
  const costs = [...groups].map(([label, entries]) => ({ label, amount: expenseTotals(entries).get(state.currency) || 0 })).filter((g) => g.amount > 0).sort((a, b) => b.amount - a.amount);
  for (const g of costs.slice(0, state.limit)) {
    const row = el(allocation, "div", "tp-cost-allocation");
    el(row, "span", "", g.label);
    el(row, "strong", "", money(g.amount, state.currency, locale));
    const track = el(row, "div", "tp-project-chart-track");
    el(track, "span").style.width = `${g.amount / (data.actualTotals.get(state.currency) || 1) * 100}%`;
  }
  if (costs.length > state.limit)
    button(allocation, w.showMore, () => {
      state.limit += 40;
      refresh();
    });
}
function expenseHistory(parent, entries, w, locale, dateFormat, projectLabel, edit, undo, limit, more, range2) {
  const section = el(parent, "section", "tp-expense-history tp-stats-panel");
  if (range2) datedHeading(section, w.expenseHistory, range2);
  else el(section, "h2", "", w.expenseHistory);
  if (!entries.length) el(section, "p", "tp-muted", w.financeEmpty);
  for (const e of entries.slice(0, limit)) {
    const row = el(section, "div", "tp-expense-record");
    row.dataset.path = e.task.path;
    row.dataset.key = e.key;
    button(row, e.task.title, () => edit(e), "tp-text-button");
    el(
      row,
      "span",
      "tp-muted",
      `${e.date ? formatDate(e.date, dateFormat) : w.noDate} \xB7 ${projectLabel(e.task)}`
    );
    el(row, "strong", "", e.amount === null ? w.unpriced : money(e.amount, e.currency, locale));
    button(row, w.removeCharge, () => undo(e), "tp-text-button");
  }
  if (entries.length > limit) button(section, w.showMore, more);
}
function financeOverview(parent, data, w, locale, dateFormat) {
  const metrics = el(parent, "div", "tp-finance-metrics");
  const metric = (label, totals, range2) => {
    const card = el(metrics, "section", "tp-metric");
    datedHeading(card, label, range2, "tp-metric-heading", "tp-muted");
    if (!totals.size) el(card, "strong", "tp-metric-value", "\u2014");
    for (const [currency, amount] of totals)
      el(card, "strong", "tp-finance-total", money(amount, currency, locale));
  };
  metric(
    w.actualCost,
    data.actualTotals,
    `${formatDate(data.from, dateFormat)} \u2014 ${formatDate(data.to, dateFormat)}`
  );
  metric(
    w.plannedCost,
    data.plannedTotals,
    `${formatDate(data.from, dateFormat)} \u2014 ${formatDate(data.to, dateFormat)}`
  );
}

// src/ui/manual.ts
var manualId = 0;
function manual(parent, language, author, version) {
  const w = words(language);
  const t = (en2, ru2) => language === "ru" ? ru2 : en2;
  const root = el(parent, "article", "tp-manual");
  root.lang = language === "ru" ? "ru" : "en";
  el(
    root,
    "p",
    "tp-manual-intro",
    t(
      "Tiny Planner is a personal planner for Obsidian: tasks, projects, a calendar and recurring work in one place. It helps you see what to do and when, while keeping completion history in your vault.",
      "Tiny Planner \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0434\u0435\u043B\u0430 \u0432 Obsidian: \u0437\u0430\u0434\u0430\u0447\u0438, \u043F\u0440\u043E\u0435\u043A\u0442\u044B, \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u044B \u0441\u043E\u0431\u0440\u0430\u043D\u044B \u0432 \u043E\u0434\u043D\u043E\u043C \u043C\u0435\u0441\u0442\u0435. \u0412\u044B \u0432\u0438\u0434\u0438\u0442\u0435, \u0447\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0438 \u043A\u043E\u0433\u0434\u0430, \u0430 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0432 \u0432\u0430\u0448\u0435\u043C \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435."
    )
  );
  const contents = el(root, "nav", "tp-manual-contents");
  const prefix = `tp-manual-${++manualId}`;
  const contentsHeading = el(contents, "h2", "", w.manualContents);
  contentsHeading.id = `${prefix}-contents`;
  contents.setAttribute("aria-labelledby", contentsHeading.id);
  const links = el(contents, "ol", "tp-manual-links");
  const section = (title2, paragraphs) => {
    const index = links.childElementCount + 1;
    if (index > 1) el(root, "hr", "tp-manual-divider");
    const block = el(root, "section");
    const heading = el(block, "h2", "tp-manual-heading");
    el(heading, "span", "tp-manual-number", String(index).padStart(2, "0") + " ");
    el(heading, "span", "", title2);
    heading.id = `${prefix}-chapter-${index}`;
    heading.tabIndex = -1;
    const item = el(links, "li");
    const link2 = el(item, "a", "tp-manual-link");
    link2.href = `#${heading.id}`;
    const number = el(link2, "span", "tp-manual-link-number", String(index).padStart(2, "0"));
    number.setAttribute("aria-hidden", "true");
    el(link2, "span", "", title2);
    link2.addEventListener("click", (event) => {
      event.preventDefault();
      block.scrollIntoView({ block: "start", behavior: "auto" });
      heading.focus({ preventScroll: true });
    });
    for (const paragraph of paragraphs) el(block, "p", "", paragraph);
  };
  section(t("Area \u2192 project \u2192 task", "\u0421\u0444\u0435\u0440\u0430 \u2192 \u043F\u0440\u043E\u0435\u043A\u0442 \u2192 \u0437\u0430\u0434\u0430\u0447\u0430"), [
    t(
      "An area is an ongoing part of life, such as Home or Work. A project groups work toward an outcome, such as Moving home. A task is a specific action. Tasks without a project appear in Inbox. Changing a project status does not change its tasks.",
      "\u0421\u0444\u0435\u0440\u0430 \u2014 \u0447\u0430\u0441\u0442\u044C \u0436\u0438\u0437\u043D\u0438, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u0414\u043E\u043C\xBB \u0438\u043B\u0438 \xAB\u0420\u0430\u0431\u043E\u0442\u0430\xBB. \u041F\u0440\u043E\u0435\u043A\u0442 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u0435\u0442 \u0434\u0435\u043B\u0430 \u0440\u0430\u0434\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u041F\u0435\u0440\u0435\u0435\u0437\u0434\xBB. \u0417\u0430\u0434\u0430\u0447\u0430 \u2014 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u0417\u0430\u0434\u0430\u0447\u0438 \u0431\u0435\u0437 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043F\u043E\u043F\u0430\u0434\u0430\u044E\u0442 \u0432\u043E \xAB\u0412\u0445\u043E\u0434\u044F\u0449\u0438\u0435\xBB. \u0421\u043C\u0435\u043D\u0430 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442 \u0441\u0442\u0430\u0442\u0443\u0441\u044B \u0435\u0433\u043E \u0437\u0430\u0434\u0430\u0447."
    )
  ]);
  section(t("Capture, dates and time", "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447, \u0434\u0430\u0442\u044B \u0438 \u0432\u0440\u0435\u043C\u044F"), [
    t(
      "The panel button at the top of the left menu collapses or expands navigation. When collapsed, the same chevron moves to the page header and the content uses the full width. It remains available in every section, including Guide. The choice lasts while this planner view is open. Enter a title and date in quick entry and press Enter or +. Options reveals project, time and status. The sliders button opens the full form. Click a task title to edit it. A document icon beside the task title indicates a description; hover it for a tooltip. The calendar button beside each date lets you choose a day, month and year, use today or clear the field. Typed dates may omit separators: 07102026 in DD.MM.YYYY means 07.10.2026. Settings choose the date order; ISO dates can be pasted in any mode.",
      "\u041A\u043D\u043E\u043F\u043A\u0430 \u0432\u0432\u0435\u0440\u0445\u0443 \u043B\u0435\u0432\u043E\u0433\u043E \u043C\u0435\u043D\u044E \u0441\u0432\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442 \u0438 \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0435\u0433\u043E. \u0412 \u0441\u0432\u0451\u0440\u043D\u0443\u0442\u043E\u043C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438 \u0442\u0430 \u0436\u0435 \u043A\u043D\u043E\u043F\u043A\u0430 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u0435\u0442\u0441\u044F \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B, \u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442 \u0432\u0441\u044E \u0448\u0438\u0440\u0438\u043D\u0443. \u041E\u043D\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432 \u043A\u0430\u0436\u0434\u043E\u043C \u0440\u0430\u0437\u0434\u0435\u043B\u0435, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044E. \u0412\u044B\u0431\u043E\u0440 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F, \u043F\u043E\u043A\u0430 \u043E\u0442\u043A\u0440\u044B\u0442\u0430 \u044D\u0442\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \u043F\u043B\u0430\u043D\u043D\u0435\u0440\u0430. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0434\u0430\u0442\u0443 \u0432 \u0441\u0442\u0440\u043E\u043A\u0443 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 Enter \u0438\u043B\u0438 +. \xAB\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B\xBB \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u044E\u0442 \u043F\u0440\u043E\u0435\u043A\u0442, \u0432\u0440\u0435\u043C\u044F \u0438 \u0441\u0442\u0430\u0442\u0443\u0441. \u041A\u043D\u043E\u043F\u043A\u0430 \u0441 \u043F\u043E\u043B\u0437\u0443\u043D\u043A\u0430\u043C\u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u043F\u043E\u043B\u043D\u0443\u044E \u0444\u043E\u0440\u043C\u0443. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u043E\u0440\u043C\u0443. \u0417\u043D\u0430\u0447\u043E\u043A \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430 \u0440\u044F\u0434\u043E\u043C \u0441 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\u043C \u043E\u0442\u043C\u0435\u0447\u0430\u0435\u0442 \u043D\u0430\u043B\u0438\u0447\u0438\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F; \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438 \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430. \u0417\u043D\u0430\u0447\u043E\u043A \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F \u0440\u044F\u0434\u043E\u043C \u0441 \u0434\u0430\u0442\u043E\u0439 \u043F\u043E\u0437\u0432\u043E\u043B\u044F\u0435\u0442 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0435\u043D\u044C, \u043C\u0435\u0441\u044F\u0446 \u0438 \u0433\u043E\u0434, \u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0441\u0435\u0433\u043E\u0434\u043D\u044F\u0448\u043D\u0435\u043C\u0443 \u0434\u043D\u044E \u0438\u043B\u0438 \u043E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043F\u043E\u043B\u0435. \u0414\u0430\u0442\u0443 \u043C\u043E\u0436\u043D\u043E \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u0431\u0435\u0437 \u0440\u0430\u0437\u0434\u0435\u043B\u0438\u0442\u0435\u043B\u0435\u0439: 07102026 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0414\u0414.\u041C\u041C.\u0413\u0413\u0413\u0413 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 07.10.2026. \u0424\u043E\u0440\u043C\u0430\u0442 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445; \u0434\u0430\u0442\u044B ISO \u043C\u043E\u0436\u043D\u043E \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u044C \u043F\u0440\u0438 \u043B\u044E\u0431\u043E\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0435."
    ),
    w.appointmentHelp,
    t(
      "Calendar cells put Done first, then Failed, then unfinished tasks; each group is ordered by time. Other day lists put timed tasks earliest first, followed by untimed tasks. Series time applies to all repeats and survives moves. A small ! marks high priority with a gentle pulse; closed tasks and reduced motion keep a static badge. Overdue tasks are red and labelled Overdue. Payment uses a $ marker, Meeting uses a people icon and Status uses a flag. The type marker and the high-priority ! can appear together. The area and project remain visible. Calendar cards show time and project above the title.",
      "\u0412 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0438\u0434\u0443\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438, \u0437\u0430\u0442\u0435\u043C \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435; \u0432\u043D\u0443\u0442\u0440\u0438 \u0433\u0440\u0443\u043F\u043F\u044B \u043E\u043D\u0438 \u0443\u043F\u043E\u0440\u044F\u0434\u043E\u0447\u0435\u043D\u044B \u043F\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438. \u0412 \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0445 \u0441\u043F\u0438\u0441\u043A\u0430\u0445 \u0434\u043D\u044F \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0438\u0434\u0443\u0442 \u0437\u0430\u0434\u0430\u0447\u0438 \u0441\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0435\u043C, \u0437\u0430\u0442\u0435\u043C \u0431\u0435\u0437 \u043D\u0435\u0433\u043E. \u0412\u0440\u0435\u043C\u044F \u0441\u0435\u0440\u0438\u0438 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A\u043E \u0432\u0441\u0435\u043C \u043F\u043E\u0432\u0442\u043E\u0440\u0430\u043C \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0435. \u0417\u043D\u0430\u0447\u043E\u043A ! \u043E\u0442\u043C\u0435\u0447\u0430\u0435\u0442 \u0432\u044B\u0441\u043E\u043A\u0438\u0439 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442. \u041E\u043D \u043C\u044F\u0433\u043A\u043E \u043F\u0443\u043B\u044C\u0441\u0438\u0440\u0443\u0435\u0442; \u0443 \u0437\u0430\u043A\u0440\u044B\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u0447 \u0438 \u043F\u0440\u0438 \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u043E\u0439 \u0430\u043D\u0438\u043C\u0430\u0446\u0438\u0438 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043D\u0435\u043F\u043E\u0434\u0432\u0438\u0436\u043D\u044B\u043C. \u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u044B \u043A\u0440\u0430\u0441\u043D\u044B\u043C \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u044B \xAB\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E\xBB. \u0421\u0444\u0435\u0440\u0430 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442 \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0432\u0438\u0434\u0438\u043C\u044B\u043C\u0438. \u0412 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u0445 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F \u0432\u0440\u0435\u043C\u044F \u0438 \u043F\u0440\u043E\u0435\u043A\u0442 \u0440\u0430\u0441\u043F\u043E\u043B\u043E\u0436\u0435\u043D\u044B \u043D\u0430\u0434 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\u043C. \u041F\u043B\u0430\u0442\u0451\u0436 \u043E\u0442\u043C\u0435\u0447\u0435\u043D \u0437\u043D\u0430\u043A\u043E\u043C $, \u0432\u0441\u0442\u0440\u0435\u0447\u0430 \u2014 \u0437\u043D\u0430\u0447\u043A\u043E\u043C \u043B\u044E\u0434\u0435\u0439, \u0441\u0442\u0430\u0442\u0443\u0441 \u2014 \u0444\u043B\u0430\u0436\u043A\u043E\u043C. \u041C\u0430\u0440\u043A\u0435\u0440 \u0442\u0438\u043F\u0430 \u0438 \u0432\u043E\u0441\u043A\u043B\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0437\u043D\u0430\u043A \u0432\u044B\u0441\u043E\u043A\u043E\u0433\u043E \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u0430 \u043C\u043E\u0433\u0443\u0442 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0442\u044C\u0441\u044F \u0432\u043C\u0435\u0441\u0442\u0435."
    ),
    w.manual
  ]);
  section(t("Statuses and Undo", "\u0421\u0442\u0430\u0442\u0443\u0441\u044B \u0438 \u043E\u0442\u043C\u0435\u043D\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439"), [
    t(
      "Backlog holds deferred work; To do is planned work; In progress is started work; Done and Failed are closed. The checkbox completes or reopens a task, the cross marks failure and the trash button deletes it. Undo reverses up to 50 changes in the current session; creation and import are excluded. Restarting clears Undo history. Undo preserves conflicting external edits.",
      "\xAB\u041E\u0442\u043B\u043E\u0436\u0435\u043D\u043E\xBB \u2014 \u0434\u0435\u043B\u0430 \u043D\u0430 \u043F\u043E\u0442\u043E\u043C, \xAB\u041A \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044E\xBB \u2014 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435, \xAB\u0412 \u0440\u0430\u0431\u043E\u0442\u0435\xBB \u2014 \u043D\u0430\u0447\u0430\u0442\u044B\u0435. \xAB\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E\xBB \u0438 \xAB\u041D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E\xBB \u2014 \u0437\u0430\u043A\u0440\u044B\u0442\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438. \u0413\u0430\u043B\u043E\u0447\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u0442 \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0443, \u043A\u0440\u0435\u0441\u0442\u0438\u043A \u043E\u0442\u043C\u0435\u0447\u0430\u0435\u0442 \u043D\u0435\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435, \u043A\u043E\u0440\u0437\u0438\u043D\u0430 \u0443\u0434\u0430\u043B\u044F\u0435\u0442. \u041E\u0442\u043C\u0435\u043D\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0434\u043B\u044F \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0445 50 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u0432 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0441\u0435\u0441\u0441\u0438\u0438, \u043A\u0440\u043E\u043C\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0438 \u0438\u043C\u043F\u043E\u0440\u0442\u0430. \u041F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u0442\u043C\u0435\u043D\u044B \u043E\u0447\u0438\u0449\u0430\u0435\u0442\u0441\u044F. \u041F\u0440\u0438 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0435 \u043E\u0442\u043C\u0435\u043D\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F, \u0441\u0434\u0435\u043B\u0430\u043D\u043D\u044B\u0435 \u0432\u043D\u0435 \u043F\u043B\u0430\u043D\u043D\u0435\u0440\u0430."
    )
  ]);
  section(t("Repeats and series end", "\u041F\u043E\u0432\u0442\u043E\u0440\u044B \u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0441\u0435\u0440\u0438\u0438"), [
    t(
      "Daily, weekly, weekday, monthly, yearly and custom RRULE repeats are available. Date anchors the series; Repeat through is its inclusive last day, and an empty end leaves it open-ended. A weekday series anchored on a weekend starts on Monday. The form and save confirmation show its first repeat. A range with no matching dates cannot be saved.",
      "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u043F\u043E\u0432\u0442\u043E\u0440\u044B \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u043D\u0435\u0434\u0435\u043B\u044E, \u043F\u043E \u0431\u0443\u0434\u043D\u044F\u043C, \u043C\u0435\u0441\u044F\u0446, \u0433\u043E\u0434 \u0438 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u043E RRULE. \u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u0430\u0442\u0430 \u0437\u0430\u0434\u0430\u0451\u0442 \u043E\u0442\u0441\u0447\u0451\u0442 \u0441\u0435\u0440\u0438\u0438; \xAB\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0442\u044C \u043F\u043E\xBB \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0434\u0435\u043D\u044C, \u0430 \u043F\u0443\u0441\u0442\u043E\u0435 \u043F\u043E\u043B\u0435 \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0441\u0435\u0440\u0438\u044E \u0431\u0435\u0437 \u043A\u043E\u043D\u0446\u0430. \u0415\u0441\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440 \u043F\u043E \u0431\u0443\u0434\u043D\u044F\u043C \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0432 \u0432\u044B\u0445\u043E\u0434\u043D\u043E\u0439, \u043F\u0435\u0440\u0432\u044B\u0439 \u0434\u0435\u043D\u044C \u0431\u0443\u0434\u0435\u0442 \u0432 \u043F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A. \u041F\u0435\u0440\u0432\u044B\u0439 \u043F\u043E\u0432\u0442\u043E\u0440 \u0432\u0438\u0434\u0435\u043D \u0432 \u0444\u043E\u0440\u043C\u0435 \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F. \u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0431\u0435\u0437 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0434\u0430\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F."
    ),
    w.seriesHint,
    t(
      "Completion, spent minutes, skip and move apply to the selected occurrence. Tomorrow remains independent. Deletion can target one day or the whole series. Stopping removes future generation while retaining recorded history; resuming restores the series. Monthly repeats on the 31st skip months without that day. A rule exceeding calculation limits shows a warning; simplify it or shorten its range.",
      "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435, \u043C\u0438\u043D\u0443\u0442\u044B, \u043F\u0440\u043E\u043F\u0443\u0441\u043A \u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u043F\u043E\u0432\u0442\u043E\u0440\u0443. \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0434\u0435\u043D\u044C \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u044B\u043C. \u041C\u043E\u0436\u043D\u043E \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u043E\u0434\u0438\u043D \u043F\u043E\u0432\u0442\u043E\u0440 \u0438\u043B\u0438 \u0432\u0441\u044E \u0441\u0435\u0440\u0438\u044E. \u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0443\u0431\u0438\u0440\u0430\u0435\u0442 \u0431\u0443\u0434\u0443\u0449\u0438\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044B, \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044E; \u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0441\u0435\u0440\u0438\u044E. \u0415\u0436\u0435\u043C\u0435\u0441\u044F\u0447\u043D\u044B\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044B \u043D\u0430 31-\u0435 \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E\u0442 \u043C\u0435\u0441\u044F\u0446\u044B \u0431\u0435\u0437 \u044D\u0442\u043E\u0433\u043E \u0434\u043D\u044F. \u0415\u0441\u043B\u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u043E \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u043F\u0440\u0435\u0434\u0435\u043B \u0440\u0430\u0441\u0447\u0451\u0442\u0430, \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435: \u0443\u043F\u0440\u043E\u0441\u0442\u0438\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u043E \u0438\u043B\u0438 \u0441\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D."
    )
  ]);
  section(t("Lists, calendar and boards", "\u0421\u043F\u0438\u0441\u043A\u0438, \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u0438 \u0434\u043E\u0441\u043A\u0438"), [
    w.help,
    w.boardHelp,
    w.boardPeriodHint,
    t(
      "Day, Week and Month show the chosen work days and the separate deadline. A distant deadline does not repeat a task on every intervening day. Date sets the primary work day. Additional dates already saved in the note\u2019s workDates field remain visible and are preserved when editing the task. Deadline-only cards appear at the bottom of their day without a separate lane. All names and area/project labels wrap in full; no tasks are hidden behind count buttons. Dragging a work day moves only that session; dragging a deadline moves only the deadline. A task still has one status and one total of spent minutes. Extra work days cannot be combined with a recurrence rule.",
      "\u0420\u0435\u0436\u0438\u043C\u044B \xAB\u0414\u0435\u043D\u044C\xBB, \xAB\u041D\u0435\u0434\u0435\u043B\u044F\xBB \u0438 \xAB\u041C\u0435\u0441\u044F\u0446\xBB \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0434\u043D\u0438 \u0440\u0430\u0431\u043E\u0442\u044B \u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u0434\u0435\u0434\u043B\u0430\u0439\u043D. \u0414\u0430\u043B\u0451\u043A\u0438\u0439 \u0441\u0440\u043E\u043A \u043D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442 \u0437\u0430\u0434\u0430\u0447\u0443 \u0432 \u043A\u0430\u0436\u0434\u043E\u043C \u043F\u0440\u043E\u043C\u0435\u0436\u0443\u0442\u043E\u0447\u043D\u043E\u043C \u0434\u043D\u0435. \u041F\u043E\u043B\u0435 \xAB\u0414\u0430\u0442\u0430\xBB \u0437\u0430\u0434\u0430\u0451\u0442 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C. \u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u0442\u044B, \u0443\u0436\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0432 \u043F\u043E\u043B\u0435 workDates \u0437\u0430\u043C\u0435\u0442\u043A\u0438, \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0432\u0438\u0434\u0438\u043C\u044B\u043C\u0438 \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u043F\u0440\u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438 \u0437\u0430\u0434\u0430\u0447\u0438. \u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0434\u0435\u0434\u043B\u0430\u0439\u043D\u0430 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432\u043D\u0438\u0437\u0443 \u0434\u043D\u044F, \u0431\u0435\u0437 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0439 \u043F\u043E\u043B\u043E\u0441\u044B. \u041D\u0430\u0437\u0432\u0430\u043D\u0438\u044F, \u0441\u0444\u0435\u0440\u0430 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442 \u0432\u0438\u0434\u043D\u044B \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E; \u0437\u0430\u0434\u0430\u0447 \u043F\u043E\u0434 \u043A\u043D\u043E\u043F\u043A\u0430\u043C\u0438 \u0441 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E\u043C \u043D\u0435\u0442. \u041F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u043D\u0438\u0435 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u0434\u043D\u044F \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0433\u043E, \u0430 \u0434\u0435\u0434\u043B\u0430\u0439\u043D\u0430 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0440\u043E\u043A. \u0421\u0442\u0430\u0442\u0443\u0441 \u0438 \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0437\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u043C\u0438\u043D\u0443\u0442\u044B \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0431\u0449\u0438\u043C\u0438 \u0434\u043B\u044F \u0437\u0430\u0434\u0430\u0447\u0438. \u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u043D\u0438 \u043D\u0435\u043B\u044C\u0437\u044F \u0441\u043E\u0432\u043C\u0435\u0449\u0430\u0442\u044C \u0441 \u043F\u0440\u0430\u0432\u0438\u043B\u043E\u043C \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F."
    ),
    t(
      "Hide completed and Hide recurring independently filter calendar cards. Day, Week and Month share these choices while the view stays open. Task status, planned load, time, expenses and subscription forecasts remain unchanged.",
      "\xAB\u0421\u043A\u0440\u044B\u0442\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435\xBB \u0438 \xAB\u0421\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F\xBB \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E \u0441\u043A\u0440\u044B\u0432\u0430\u044E\u0442 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F. \u0412\u044B\u0431\u043E\u0440 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0434\u043B\u044F \u0434\u043D\u044F, \u043D\u0435\u0434\u0435\u043B\u0438 \u0438 \u043C\u0435\u0441\u044F\u0446\u0430, \u043F\u043E\u043A\u0430 \u043E\u0442\u043A\u0440\u044B\u0442 \u044D\u0442\u043E\u0442 \u0432\u0438\u0434 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430. \u0421\u0442\u0430\u0442\u0443\u0441\u044B, \u043F\u043B\u0430\u043D\u043E\u0432\u0430\u044F \u043D\u0430\u0433\u0440\u0443\u0437\u043A\u0430, \u0432\u0440\u0435\u043C\u044F, \u0440\u0430\u0441\u0445\u043E\u0434\u044B \u0438 \u043F\u0440\u043E\u0433\u043D\u043E\u0437 \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A \u043D\u0435 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F."
    )
  ]);
  section(t("Planned workload", "\u041F\u043B\u0430\u043D\u043E\u0432\u0430\u044F \u043D\u0430\u0433\u0440\u0443\u0437\u043A\u0430"), [
    t(
      "Estimated time estimates the whole task and stays separate from manually recorded spent minutes. Open cards show Estimate: 3 h or Estimate: 1 h 30 min. Completed work shows Plan and, when positive spent minutes are recorded, Spent, in lists, the calendar and boards. Missing estimates and unrecorded spent time are omitted. Recurring work uses its selected occurrence\u2019s spent minutes. The estimate is divided equally across its selected work days; rounding preserves the exact total. With no work days, the estimate belongs to the deadline. A recurring occurrence receives its own full estimate. Completed and failed work, payments and subscriptions are excluded from planned load. Unknown estimates are counted separately. Daily capacity defaults to 480 minutes and can be changed in Settings; zero means no available time. Day and Today show planned time and available daily time with separate labels. Week and Month show estimated time, tasks without estimates and overloaded days. Repeated sessions of the same one-off task count once in the unknown-estimate total; recurring occurrences count separately. An empty estimate is shown as unknown, with no empty progress bar. Moving or reopening work recomputes the load without altering spent minutes.",
      "\u041E\u0446\u0435\u043D\u043A\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A\u043E \u0432\u0441\u0435\u0439 \u0437\u0430\u0434\u0430\u0447\u0435 \u0438 \u043E\u0442\u0434\u0435\u043B\u0435\u043D\u0430 \u043E\u0442 \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0437\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438. \u0423 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u0447 \u043E\u043D\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0430 \u043A\u0440\u0430\u0442\u043A\u043E: \xAB\u041E\u0446\u0435\u043D\u043A\u0430: 3 \u0447\xBB \u0438\u043B\u0438 \xAB\u041E\u0446\u0435\u043D\u043A\u0430: 1 \u0447 30 \u043C\u0438\u043D\xBB. \u0423 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0445 \u0437\u0430\u0434\u0430\u0447 \u0432 \u0441\u043F\u0438\u0441\u043A\u0430\u0445, \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435 \u0438 \u043D\u0430 \u0434\u043E\u0441\u043A\u0430\u0445 \u043F\u043E\u043A\u0430\u0437\u0430\u043D \xAB\u041F\u043B\u0430\u043D\xBB \u0438, \u0435\u0441\u043B\u0438 \u0432\u0432\u0435\u0434\u0435\u043D\u043E \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0437\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F, \xAB\u041F\u043E\u0442\u0440\u0430\u0447\u0435\u043D\u043E\xBB. \u0415\u0441\u043B\u0438 \u043E\u0446\u0435\u043D\u043A\u0430 \u0438\u043B\u0438 \u0437\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B, \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F. \u0414\u043B\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \u0431\u0435\u0440\u0443\u0442\u0441\u044F \u043C\u0438\u043D\u0443\u0442\u044B \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F. \u041E\u0446\u0435\u043D\u043A\u0430 \u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0440\u043E\u0432\u043D\u0443 \u043C\u0435\u0436\u0434\u0443 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u043C\u0438 \u0434\u043D\u044F\u043C\u0438 \u0440\u0430\u0431\u043E\u0442\u044B \u0441 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C \u0442\u043E\u0447\u043D\u043E\u0439 \u0441\u0443\u043C\u043C\u044B. \u0415\u0441\u043B\u0438 \u0440\u0430\u0431\u043E\u0447\u0438\u0445 \u0434\u043D\u0435\u0439 \u043D\u0435\u0442, \u043E\u0446\u0435\u043D\u043A\u0430 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A \u0434\u0435\u0434\u043B\u0430\u0439\u043D\u0443. \u0414\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043F\u043E\u043B\u043D\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430. \u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0438 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u0434\u0435\u043B\u0430, \u043F\u043B\u0430\u0442\u0435\u0436\u0438 \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u0432 \u043D\u0430\u0433\u0440\u0443\u0437\u043A\u0443 \u043D\u0435 \u0432\u0445\u043E\u0434\u044F\u0442; \u0437\u0430\u0434\u0430\u0447\u0438 \u0431\u0435\u0437 \u043E\u0446\u0435\u043D\u043A\u0438 \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0412 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432\u0440\u0435\u043C\u044F \u043D\u0430 \u0434\u0435\u043D\u044C: \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E 480 \u043C\u0438\u043D\u0443\u0442, \u043D\u043E\u043B\u044C \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438. \xAB\u0414\u0435\u043D\u044C\xBB \u0438 \xAB\u0421\u0435\u0433\u043E\u0434\u043D\u044F\xBB \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u043F\u043B\u0430\u043D \u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0441 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u043C\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u044F\u043C\u0438. \u0412 \u043D\u0435\u0434\u0435\u043B\u0435 \u0438 \u043C\u0435\u0441\u044F\u0446\u0435 \u0432\u0438\u0434\u043D\u044B \u043E\u0446\u0435\u043D\u0451\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F, \u0437\u0430\u0434\u0430\u0447\u0438 \u0431\u0435\u0437 \u043E\u0446\u0435\u043D\u043A\u0438 \u0438 \u0434\u043D\u0438 \u0441 \u043F\u0435\u0440\u0435\u0433\u0440\u0443\u0437\u043A\u043E\u0439. \u041E\u0434\u043D\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 \u0441 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u043C\u0438 \u0440\u0430\u0431\u043E\u0447\u0438\u043C\u0438 \u0434\u043D\u044F\u043C\u0438 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u043E\u0434\u0438\u043D \u0440\u0430\u0437 \u0432 \u043E\u0431\u0449\u0435\u043C \u0447\u0438\u0441\u043B\u0435 \u0437\u0430\u0434\u0430\u0447 \u0431\u0435\u0437 \u043E\u0446\u0435\u043D\u043A\u0438; \u043F\u043E\u0432\u0442\u043E\u0440\u044B \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u041F\u0443\u0441\u0442\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F, \u0431\u0435\u0437 \u043F\u0443\u0441\u0442\u043E\u0433\u043E \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441-\u0431\u0430\u0440\u0430. \u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u0438 \u043F\u0435\u0440\u0435\u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u0442 \u043D\u0430\u0433\u0440\u0443\u0437\u043A\u0443, \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044F \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0437\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u043C\u0438\u043D\u0443\u0442\u044B."
    )
  ]);
  section(t("Statistics", "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430"), [
    t(
      "The period selector uses the current calendar week, month, quarter or year and is shared by work statistics, financial statistics and Payments. The full date range stays beneath the period buttons; today\u2019s date sits beside the header actions. Dates in expense and budget panels belong to their headings. Work results and time are reported for that period; Overall statistics and project progress are explicitly marked All time. Spending shows every currency at once in separate line charts with the same dates and independent monetary scales. Zero days are retained; exact daily values for all currencies are available together.",
      "\u0412\u044B\u0431\u043E\u0440 \u043F\u0435\u0440\u0438\u043E\u0434\u0430 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0435 \u043D\u0435\u0434\u0435\u043B\u044E, \u043C\u0435\u0441\u044F\u0446, \u043A\u0432\u0430\u0440\u0442\u0430\u043B \u0438\u043B\u0438 \u0433\u043E\u0434 \u0438 \u043E\u0431\u0449\u0438\u0439 \u0434\u043B\u044F \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438, \u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u043E\u0439 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438 \u0438 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439. \u041F\u043E\u043B\u043D\u044B\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0434\u0430\u0442 \u0440\u0430\u0441\u043F\u043E\u043B\u043E\u0436\u0435\u043D \u043F\u043E\u0434 \u043A\u043D\u043E\u043F\u043A\u0430\u043C\u0438 \u043F\u0435\u0440\u0438\u043E\u0434\u0430, \u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F\u0448\u043D\u044F\u044F \u0434\u0430\u0442\u0430 \u2014 \u0440\u044F\u0434\u043E\u043C \u0441 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F\u043C\u0438 \u0432 \u0448\u0430\u043F\u043A\u0435. \u0412 \u0440\u0430\u0441\u0445\u043E\u0434\u0430\u0445 \u0438 \u0431\u044E\u0434\u0436\u0435\u0442\u0430\u0445 \u0434\u0430\u0442\u044B \u0432\u0445\u043E\u0434\u044F\u0442 \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0445 \u0431\u043B\u043E\u043A\u043E\u0432. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0434\u0435\u043B \u0438 \u0437\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u043F\u0435\u0440\u0438\u043E\u0434\u0443; \u043E\u0431\u0449\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0438 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u043A\u0430\u043A \xAB\u0417\u0430 \u0432\u0441\u0451 \u0432\u0440\u0435\u043C\u044F\xBB. \u0420\u0430\u0441\u0445\u043E\u0434\u044B \u0432\u043E \u0432\u0441\u0435\u0445 \u0432\u0430\u043B\u044E\u0442\u0430\u0445 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E: \u0443 \u043A\u0430\u0436\u0434\u043E\u0439 \u0432\u0430\u043B\u044E\u0442\u044B \u0441\u0432\u043E\u0439 \u0433\u0440\u0430\u0444\u0438\u043A \u0441 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u043C\u0438 \u0434\u0430\u0442\u0430\u043C\u0438 \u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u0434\u0435\u043D\u0435\u0436\u043D\u043E\u0439 \u0448\u043A\u0430\u043B\u043E\u0439. \u0414\u043D\u0438 \u0431\u0435\u0437 \u043E\u043F\u043B\u0430\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B; \u0442\u043E\u0447\u043D\u044B\u0435 \u0441\u0443\u043C\u043C\u044B \u043F\u043E \u0432\u0441\u0435\u043C \u0432\u0430\u043B\u044E\u0442\u0430\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432\u043C\u0435\u0441\u0442\u0435 \u0432 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E \u0434\u043D\u044F\u043C."
    ),
    w.statsHelp,
    w.statsTimeHelp,
    w.periodRangeHelp,
    t(
      "Completion and failed-task counts use separate lines on one scale. Closed minutes have their own line chart. Every date in the selected period is retained, including zero-value days. Quarters group days by week; years group by month. Sparse horizontal date labels keep the charts readable; exact daily numbers remain in the expandable table.",
      "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0445 \u0438 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0445 \u0434\u0435\u043B \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u043C\u0438 \u043B\u0438\u043D\u0438\u044F\u043C\u0438 \u043D\u0430 \u043E\u0434\u043D\u043E\u0439 \u0448\u043A\u0430\u043B\u0435. \u041C\u0438\u043D\u0443\u0442\u044B \u0437\u0430\u043A\u0440\u044B\u0442\u044B\u0445 \u0434\u0435\u043B \u2014 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u043B\u0438\u043D\u0435\u0439\u043D\u043E\u0439 \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u043E\u0439. \u0421\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u0432\u0441\u0435 \u0434\u0430\u0442\u044B \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u043D\u0443\u043B\u0435\u0432\u044B\u0435 \u0434\u043D\u0438. \u0412 \u043A\u0432\u0430\u0440\u0442\u0430\u043B\u0435 \u0434\u043D\u0438 \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u044E\u0442\u0441\u044F \u043F\u043E \u043D\u0435\u0434\u0435\u043B\u044F\u043C, \u0432 \u0433\u043E\u0434\u0443 \u2014 \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C. \u041F\u043E\u0434\u043F\u0438\u0441\u0438 \u0434\u0430\u0442 \u0440\u0430\u0441\u043F\u043E\u043B\u043E\u0436\u0435\u043D\u044B \u0433\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u043E \u0441 \u043F\u0440\u043E\u043C\u0435\u0436\u0443\u0442\u043A\u0430\u043C\u0438; \u0442\u043E\u0447\u043D\u044B\u0435 \u0434\u043D\u0435\u0432\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432 \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439\u0441\u044F \u0442\u0430\u0431\u043B\u0438\u0446\u0435."
    ),
    t(
      "Work statistics exclude payments and subscriptions. Expenses is for entering, editing and undoing payments, planning and subscription management. Financial statistics show totals, daily spending and project allocation without duplicating transaction lists. Actual spending uses the payment date. All currency charts remain visible; the currency selector applies only to the project breakdown. Currencies are never added together or converted.",
      "\u0412 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0414\u0435\u043B\u0430\xBB \u043F\u043B\u0430\u0442\u0435\u0436\u0438 \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u044B. \xAB\u0420\u0430\u0441\u0445\u043E\u0434\u044B\xBB \u2014 \u0432\u043D\u0435\u0441\u0435\u043D\u0438\u0435 \u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u043E\u043F\u043B\u0430\u0442, \u043F\u043B\u0430\u043D \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430\u043C\u0438. \xAB\u0424\u0438\u043D\u0430\u043D\u0441\u044B\xBB \u2014 \u0438\u0442\u043E\u0433\u0438, \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u0438 \u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u043F\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C \u0431\u0435\u0437 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F \u0441\u043F\u0438\u0441\u043A\u043E\u0432 \u043E\u043F\u043B\u0430\u0442. \u0424\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0442\u0440\u0430\u0442\u044B \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u0434\u0430\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u044B. \u0413\u0440\u0430\u0444\u0438\u043A\u0438 \u0432\u0441\u0435\u0445 \u0432\u0430\u043B\u044E\u0442 \u0432\u0438\u0434\u043D\u044B \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E; \u0432\u044B\u0431\u043E\u0440 \u0432\u0430\u043B\u044E\u0442\u044B \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043A \u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u044E \u043F\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C. \u0420\u0430\u0437\u043D\u044B\u0435 \u0432\u0430\u043B\u044E\u0442\u044B \u043D\u0435 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0438 \u043D\u0435 \u043A\u043E\u043D\u0432\u0435\u0440\u0442\u0438\u0440\u0443\u044E\u0442\u0441\u044F."
    )
  ]);
  section(t("Budgets", "\u0411\u044E\u0434\u0436\u0435\u0442\u044B"), [
    t(
      "Set an optional monthly budget and currency when editing an area or project, or choose a scope in Statistics \u2192 Finances \u2192 Budgets. An empty limit disables the budget; zero remains a valid limit. The selected current calendar month uses that limit, a quarter uses three monthly limits, and a year uses twelve. A week is prorated by the actual number of days in each month. Spent uses actual payment dates; Planned includes outstanding payment tasks and unrecorded subscription charges in that period. Remaining is the limit minus spent; After planned payments also subtracts the forecast. Area budgets include all linked projects. Area and project limits are independent and are never summed into a shared total. Other currencies and missing prices are flagged; no currency conversion occurs. The operational payment lists remain in Expenses.",
      "\u041C\u0435\u0441\u044F\u0447\u043D\u044B\u0439 \u0431\u044E\u0434\u0436\u0435\u0442 \u0438 \u0432\u0430\u043B\u044E\u0442\u0443 \u043C\u043E\u0436\u043D\u043E \u0437\u0430\u0434\u0430\u0442\u044C \u0432 \u0444\u043E\u0440\u043C\u0435 \u0441\u0444\u0435\u0440\u044B \u0438\u043B\u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043B\u0438\u0431\u043E \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442 \u0432 \xAB\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u2192 \u0424\u0438\u043D\u0430\u043D\u0441\u044B \u2192 \u0411\u044E\u0434\u0436\u0435\u0442\u044B\xBB. \u041F\u0443\u0441\u0442\u0430\u044F \u0441\u0443\u043C\u043C\u0430 \u043E\u0442\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0431\u044E\u0434\u0436\u0435\u0442; \u043D\u043E\u043B\u044C \u2014 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u043B\u0438\u043C\u0438\u0442. \u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043C\u0435\u0441\u044F\u0446 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u044D\u0442\u043E\u0442 \u043B\u0438\u043C\u0438\u0442, \u043A\u0432\u0430\u0440\u0442\u0430\u043B \u2014 \u0442\u0440\u0438 \u043C\u0435\u0441\u044F\u0447\u043D\u044B\u0445 \u043B\u0438\u043C\u0438\u0442\u0430, \u0433\u043E\u0434 \u2014 \u0434\u0432\u0435\u043D\u0430\u0434\u0446\u0430\u0442\u044C. \u041B\u0438\u043C\u0438\u0442 \u043D\u0435\u0434\u0435\u043B\u0438 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u043F\u043E\u0440\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E \u0447\u0438\u0441\u043B\u0443 \u0434\u043D\u0435\u0439 \u0432 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0445 \u043C\u0435\u0441\u044F\u0446\u0430\u0445. \u0424\u0430\u043A\u0442 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A \u0434\u0430\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u044B; \u043F\u043B\u0430\u043D \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438 \u0438 \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A \u0437\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434. \u041E\u0441\u0442\u0430\u0442\u043E\u043A \u2014 \u043B\u0438\u043C\u0438\u0442 \u043C\u0438\u043D\u0443\u0441 \u0444\u0430\u043A\u0442; \xAB\u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u043E\u043F\u043B\u0430\u0442\xBB \u0442\u0430\u043A\u0436\u0435 \u0432\u044B\u0447\u0438\u0442\u0430\u0435\u0442 \u043F\u043B\u0430\u043D. \u0412 \u0431\u044E\u0434\u0436\u0435\u0442 \u0441\u0444\u0435\u0440\u044B \u0432\u0445\u043E\u0434\u044F\u0442 \u0432\u0441\u0435 \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u044B. \u041B\u0438\u043C\u0438\u0442\u044B \u0441\u0444\u0435\u0440\u044B \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u044B \u0438 \u043D\u0435 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432 \u043E\u0431\u0449\u0438\u0439 \u0438\u0442\u043E\u0433. \u0414\u0440\u0443\u0433\u0438\u0435 \u0432\u0430\u043B\u044E\u0442\u044B \u0438 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0435 \u0441\u0443\u043C\u043C\u044B \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E, \u043A\u043E\u043D\u0432\u0435\u0440\u0442\u0430\u0446\u0438\u0438 \u043D\u0435\u0442. \u0421\u043F\u0438\u0441\u043A\u0438 \u043E\u043F\u043B\u0430\u0442 \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0432 \xAB\u0420\u0430\u0441\u0445\u043E\u0434\u0430\u0445\xBB."
    )
  ]);
  section(w.subscriptions, [
    t(
      "Expenses has two sections: Payments for upcoming payments and paid expenses, and Subscriptions for recurring cost settings. Payments to review groups overdue, undated and unsuccessful payments. The subscription catalog and monthly cost estimate do not depend on the report period. Add expense and Add subscription open their respective sections.",
      "\u0412 \xAB\u0420\u0430\u0441\u0445\u043E\u0434\u0430\u0445\xBB \u0434\u0432\u0430 \u0440\u0430\u0437\u0434\u0435\u043B\u0430: \xAB\u041F\u043B\u0430\u0442\u0435\u0436\u0438\xBB \u2014 \u043F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438 \u0438 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B; \xAB\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0438\xBB \u2014 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u044B\u0445 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0439. \u0412 \u0431\u043B\u043E\u043A\u0435 \xAB\u0422\u0440\u0435\u0431\u0443\u044E\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F\xBB \u0441\u043E\u0431\u0440\u0430\u043D\u044B \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0438, \u0437\u0430\u043F\u0438\u0441\u0438 \u0431\u0435\u0437 \u0434\u0430\u0442\u044B \u0438 \u043D\u0435\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438. \u0421\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A \u0438 \u0438\u0445 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0432 \u043C\u0435\u0441\u044F\u0446 \u043D\u0435 \u0437\u0430\u0432\u0438\u0441\u044F\u0442 \u043E\u0442 \u043F\u0435\u0440\u0438\u043E\u0434\u0430 \u043E\u0442\u0447\u0451\u0442\u0430. \xAB\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0440\u0430\u0441\u0445\u043E\u0434\xBB \u0438 \xAB\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443\xBB \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u0442 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u0440\u0430\u0437\u0434\u0435\u043B."
    ),
    w.expensesHelp,
    w.paymentHelp,
    w.chargeHelp,
    w.subscriptionHelp,
    w.subscriptionCatalogHelp,
    t(
      "Active subscriptions appear in a separate payment section at the bottom of each calendar day. First payment anchors a monthly or yearly forecast; missing month days use the last day without changing the anchor. Future dates show the full billing amount, not the monthly average. Cancelled or undated subscriptions have no calendar forecast. Subscriptions remain excluded from work lists, boards, task progress and time statistics. The cards show the next payment date; cancellation and resumption support Undo.",
      "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0432\u043D\u0438\u0437\u0443 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0434\u043D\u044F \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F. \u0414\u0430\u0442\u0430 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u043F\u043B\u0430\u0442\u0435\u0436\u0430 \u0437\u0430\u0434\u0430\u0451\u0442 \u0435\u0436\u0435\u043C\u0435\u0441\u044F\u0447\u043D\u044B\u0439 \u0438\u043B\u0438 \u0435\u0436\u0435\u0433\u043E\u0434\u043D\u044B\u0439 \u043F\u0440\u043E\u0433\u043D\u043E\u0437. \u0415\u0441\u043B\u0438 \u043D\u0443\u0436\u043D\u043E\u0433\u043E \u0447\u0438\u0441\u043B\u0430 \u043D\u0435\u0442, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0434\u0435\u043D\u044C \u043C\u0435\u0441\u044F\u0446\u0430 \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u0439 \u0434\u0430\u0442\u044B. \u0411\u0443\u0434\u0443\u0449\u0438\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u043F\u043E\u043B\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u043F\u043B\u0430\u0442\u0435\u0436\u0430, \u0430 \u043D\u0435 \u0441\u0440\u0435\u0434\u043D\u0435\u0435 \u0437\u0430 \u043C\u0435\u0441\u044F\u0446. \u0423 \u043E\u0442\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0445 \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A \u0431\u0435\u0437 \u0434\u0430\u0442\u044B \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430 \u043D\u0435\u0442. \u041E\u043D\u0438 \u043D\u0435 \u0432\u0445\u043E\u0434\u044F\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0438 \u0437\u0430\u0434\u0430\u0447, \u0434\u043E\u0441\u043A\u0438, \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0438 \u0443\u0447\u0451\u0442 \u0432\u0440\u0435\u043C\u0435\u043D\u0438. \u041D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u0432\u0438\u0434\u043D\u0430 \u0434\u0430\u0442\u0430 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u043F\u043B\u0430\u0442\u0435\u0436\u0430; \u043E\u0442\u043C\u0435\u043D\u0443 \u0438 \u0432\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C."
    )
  ]);
  section(t("Data and legacy import", "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438 \u0438\u043C\u043F\u043E\u0440\u0442"), [
    t(
      "Data lives in Obsidian Markdown notes. New areas, projects and tasks default to Planner/Areas, Planner/Projects and Planner/Tasks; settings choose the folder and language. Dataview and TaskNotes are unnecessary. The plugin works locally without an account or telemetry. Collaboration depends on your vault and synchronization.",
      "\u0414\u0430\u043D\u043D\u044B\u0435 \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u0432 \u043E\u0431\u044B\u0447\u043D\u044B\u0445 Markdown-\u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445 Obsidian. \u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u043D\u043E\u0432\u044B\u0435 \u0441\u0444\u0435\u0440\u044B, \u043F\u0440\u043E\u0435\u043A\u0442\u044B \u0438 \u0437\u0430\u0434\u0430\u0447\u0438 \u0441\u043E\u0437\u0434\u0430\u044E\u0442\u0441\u044F \u0432 Planner/Areas, Planner/Projects \u0438 Planner/Tasks. \u041F\u0430\u043F\u043A\u0430 \u0438 \u044F\u0437\u044B\u043A \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445. Dataview \u0438 TaskNotes \u043D\u0435 \u043D\u0443\u0436\u043D\u044B. \u041F\u043B\u0430\u0433\u0438\u043D \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E, \u0431\u0435\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 \u0438 \u0442\u0435\u043B\u0435\u043C\u0435\u0442\u0440\u0438\u0438. \u0421\u043E\u0432\u043C\u0435\u0441\u0442\u043D\u0430\u044F \u0440\u0430\u0431\u043E\u0442\u0430 \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u0432\u0430\u0448\u0435\u0433\u043E \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430."
    ),
    w.importText
  ]);
  section(t("About", "\u041E \u043F\u043B\u0430\u0433\u0438\u043D\u0435"), [
    `${t("Author", "\u0410\u0432\u0442\u043E\u0440")}: ${author}.`,
    ...version ? [`${t("Version", "\u0412\u0435\u0440\u0441\u0438\u044F")}: ${version}.`] : [],
    t(
      "MIT license. The source archive includes code, tests and a detailed guide.",
      "\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F MIT. \u0410\u0440\u0445\u0438\u0432 \u0438\u0441\u0445\u043E\u0434\u043D\u0438\u043A\u043E\u0432 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u043A\u043E\u0434, \u0442\u0435\u0441\u0442\u044B \u0438 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0435 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E."
    )
  ]);
}

// src/ui/modals.ts
var import_obsidian4 = require("obsidian");
var BaseModal = class extends import_obsidian4.Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.w = words(plugin.settings.language);
  }
  w;
  onOpen() {
    this.contentEl.classList.add("tp-modal");
    this.contentEl.style.setProperty(
      "--tp-ui-scale",
      String(this.plugin.normalizeUiScale(this.plugin.settings.uiScalePercent) / 100)
    );
  }
  onClose() {
    this.contentEl.replaceChildren();
  }
  async run(fn, close = true) {
    try {
      await fn();
      if (close) this.close();
    } catch (e) {
      new import_obsidian4.Notice(
        messageText(e instanceof Error ? e.message : String(e), this.plugin.settings.language)
      );
    }
  }
};
var TaskModal = class extends BaseModal {
  constructor(plugin, item, defaults = {}) {
    super(plugin);
    this.item = item;
    this.defaults = defaults;
  }
  onOpen() {
    super.onOpen();
    const w = this.w;
    const task = this.item?.task;
    if (task?.kind === "subscription") {
      this.close();
      new SubscriptionModal(this.plugin, task).open();
      return;
    }
    el(
      this.contentEl,
      "h2",
      "",
      task ? task.kind === "payment" ? w.editPayment : w.edit : this.defaults.kind === "payment" ? w.addPayment : w.add
    );
    if (this.item?.recurring)
      el(
        this.contentEl,
        "p",
        "tp-muted",
        formatDate(this.item.date, this.plugin.settings.dateFormat)
      );
    const form = el(this.contentEl, "form");
    const title2 = input(field(form, w.title), "text", task?.title ?? this.defaults.title ?? "");
    title2.required = true;
    title2.maxLength = 1e3;
    const snap = this.plugin.repo.snapshot();
    const grid = el(form, "div", "tp-form-grid");
    const project = select(
      field(grid, w.project),
      [
        ["", w.noProject],
        ...snap.projects.filter((p) => isActive(p.status) || p.path === (task?.project ?? this.defaults.project)).sort((a, b) => this.plugin.compareProjects(a, b)).map((p) => [p.path, this.plugin.projectLabel(p)])
      ],
      task?.project ?? this.defaults.project ?? ""
    );
    if (task?.project && !snap.projects.some((p) => p.path === task.project)) {
      const o = el(project, "option", "", w.unresolved + " \xB7 " + task.project);
      o.value = task.project;
      project.value = task.project;
    }
    const date = dateInput(
      field(grid, w.date),
      task?.scheduled ?? this.defaults.scheduled ?? "",
      this.plugin.settings.dateFormat,
      this.plugin.settings.language
    );
    const rule = task?.recurrence ?? this.defaults.recurrence ?? "";
    const dueLabel = field(grid, rule ? w.repeatUntil : w.due);
    const due = dateInput(
      dueLabel,
      rule ? recurrenceEnd(rule) : task?.due ?? this.defaults.due ?? "",
      this.plugin.settings.dateFormat,
      this.plugin.settings.language
    );
    const shortcuts = el(form, "div", "tp-date-shortcuts");
    button(shortcuts, w.today, () => {
      writeDate(date, day());
    });
    button(shortcuts, w.tomorrow, () => {
      writeDate(date, addDays(day(), 1));
    });
    button(shortcuts, w.noDate, () => {
      if (!repeat2.value) {
        date.value = "";
        due.value = "";
      }
    });
    const opts = [
      ["", w.never],
      ["FREQ=DAILY", w.daily],
      ["FREQ=WEEKLY", w.weekly],
      ["FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", w.weekdays],
      ["FREQ=MONTHLY", w.monthly],
      ["FREQ=YEARLY", w.yearly],
      ["custom", w.custom]
    ];
    const preset = rule.split(";").filter((part) => !part.startsWith("UNTIL=")).join(";");
    const repeat2 = select(
      field(grid, w.repeat),
      opts,
      opts.some((o) => o[0] === preset) ? preset : "custom"
    );
    const customLabel = field(form, w.custom);
    const custom = input(customLabel, "text", rule, "FREQ=WEEKLY;BYDAY=MO,TH");
    let repeating = !!repeat2.value;
    let taskDue = formatDate(task?.due ?? this.defaults.due ?? "", this.plugin.settings.dateFormat);
    let repeatEnd = formatDate(recurrenceEnd(rule), this.plugin.settings.dateFormat);
    const updateRepeat = () => {
      customLabel.hidden = repeat2.value !== "custom";
      const next = !!repeat2.value;
      if (next !== repeating) {
        if (repeating) repeatEnd = due.value;
        else taskDue = due.value;
        due.value = next ? repeatEnd : taskDue;
        due.setCustomValidity("");
        repeating = next;
      }
      dueLabel.querySelector("span").textContent = next ? w.repeatUntil : w.due;
      due.classList.toggle("tp-repeat-until", next);
      if (repeat2.value && !date.value) writeDate(date, day());
    };
    repeat2.addEventListener("change", () => {
      if (this.item?.recurring && !repeat2.value) {
        writeDate(date, this.item.date || task.scheduled);
        taskDue = "";
      }
      updateRepeat();
    });
    custom.addEventListener("change", () => {
      if (repeat2.value === "custom") writeDate(due, recurrenceEnd(custom.value));
    });
    updateRepeat();
    const recurrenceValue = (end) => {
      const raw = repeat2.value === "custom" ? custom.value.trim() : repeat2.value;
      const base = repeat2.value !== "custom" && repeat2.value === preset ? rule : raw;
      return raw ? withRecurrenceEnd(base, end) : "";
    };
    const preview = el(form, "small", "tp-muted tp-repeat-preview");
    const updatePreview = () => {
      preview.hidden = !repeat2.value;
      if (!repeat2.value) return;
      try {
        const start = parseDate(date.value, this.plugin.settings.dateFormat);
        const end = parseDate(due.value, this.plugin.settings.dateFormat);
        if (!start || due.value.trim() && !end) {
          preview.textContent = w.invalid;
          return;
        }
        const first = firstRepeatDate(recurrenceValue(end), start);
        preview.textContent = first ? `${w.firstRepeat}: ${formatDate(first, this.plugin.settings.dateFormat)}` : messageText(
          "The repeat rule has no occurrence within its dates.",
          this.plugin.settings.language
        );
      } catch (e) {
        preview.textContent = messageText(
          e instanceof Error ? e.message : String(e),
          this.plugin.settings.language
        );
      }
    };
    repeat2.addEventListener("change", updatePreview);
    custom.addEventListener("change", updatePreview);
    date.addEventListener("blur", updatePreview);
    date.addEventListener("change", updatePreview);
    due.addEventListener("blur", updatePreview);
    due.addEventListener("change", updatePreview);
    updatePreview();
    const appointment = timeInput(
      field(grid, w.appointmentTime),
      task?.scheduledTime ?? this.defaults.scheduledTime ?? "",
      w.appointmentTime,
      this.plugin.settings.language
    );
    const kind = select(
      field(grid, w.kind),
      ["task", "meeting", "payment", "status"].map((k) => [k, w[k]]),
      task?.kind ?? this.defaults.kind ?? "task"
    );
    const priority = select(
      field(grid, w.priority),
      [
        ["normal", w.normal],
        ["high", w.high]
      ],
      task?.priority ?? this.defaults.priority ?? "normal"
    );
    const planned = input(
      field(grid, w.plannedMinutes),
      "number",
      String(task?.plannedMinutes ?? this.defaults.plannedMinutes ?? 0)
    );
    planned.dataset.field = "plannedMinutes";
    planned.min = "0";
    planned.max = "10000000";
    planned.step = "1";
    const minutes = input(
      field(grid, w.minutes),
      "number",
      String(this.item?.minutes ?? task?.minutes ?? 0)
    );
    minutes.dataset.field = "minutes";
    minutes.min = "0";
    minutes.step = "1";
    const status = select(
      field(grid, w.status),
      STATUSES.map((s) => [s, w[s]]),
      this.item?.status ?? this.defaults.status ?? (this.defaults.scheduled ? "todo" : "backlog")
    );
    status.setAttribute("aria-label", w.status);
    const price = this.item ? expenseValue(this.item) : { amount: this.defaults.amount ?? null, currency: this.defaults.currency ?? "USD" };
    const amountLabel = field(grid, w.paymentAmount);
    const amount = input(amountLabel, "number", price.amount === null ? "" : String(price.amount));
    amount.dataset.field = "amount";
    amount.min = "0";
    amount.max = "1000000000000";
    amount.step = "any";
    const currencyLabel = field(grid, w.currency);
    const currency = input(currencyLabel, "text", price.currency);
    currency.maxLength = 3;
    currency.pattern = "[A-Za-z]{3}";
    const paidLabel = field(grid, w.paidOn);
    const paymentDate = dateInput(
      paidLabel,
      this.item?.status === "done" ? this.item.recurring ? task?.occurrences[this.item.key]?.resolvedOn || dateKey(task?.occurrences[this.item.key]?.resolvedAt) || "" : task?.resolvedOn || "" : day(),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language
    );
    const updatePayment = () => {
      const payment = kind.value === "payment";
      amountLabel.hidden = currencyLabel.hidden = !payment;
      amount.disabled = currency.disabled = !payment;
      currency.required = payment;
      paidLabel.hidden = !payment || status.value !== "done";
      paymentDate.disabled = paidLabel.hidden;
      paymentDate.required = !paidLabel.hidden;
      for (const option of status.options)
        option.textContent = payment && option.value === "done" ? w.paymentDone : payment && option.value === "failed" ? w.paymentFailed : w[option.value];
    };
    kind.addEventListener("change", updatePayment);
    status.addEventListener("change", updatePayment);
    updatePayment();
    for (const control of [
      project,
      status,
      kind,
      priority,
      date,
      appointment,
      due,
      repeat2,
      planned,
      minutes,
      amount,
      currency,
      paymentDate
    ]) {
      grid.appendChild(control.closest(".tp-field"));
    }
    form.insertBefore(shortcuts, grid.nextSibling);
    const description = el(field(form, w.description), "textarea", "tp-description");
    description.value = task?.description ?? this.defaults.description ?? "";
    description.rows = 3;
    description.maxLength = 1e5;
    description.placeholder = w.description;
    if (this.item?.recurring && !this.item.key) {
      minutes.disabled = true;
      if (status) status.disabled = true;
    }
    if (task?.recurrence) {
      const tools = el(form, "div", "tp-series-tools");
      const seriesToggle = button(
        tools,
        task.seriesEnd || !isActive(task.status) ? w.resume : w.stop,
        () => void this.run(
          () => task.seriesEnd || !isActive(task.status) ? this.plugin.service.resumeSeries(task.path) : this.plugin.service.stopSeries(task.path)
        )
      );
      stabilizeButton(seriesToggle, [w.stop, w.resume]);
    }
    const actions = el(form, "div", "tp-modal-actions");
    button(actions, w.cancel, () => this.close());
    const save = el(actions, "button", "mod-cta", w.save);
    save.type = "submit";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      void this.run(async () => {
        const recurrence = recurrenceValue(repeat2.value ? readDate(due) : "");
        const draft = {
          title: title2.value,
          description: description.value,
          status: status.value,
          project: project.value,
          scheduled: readDate(date),
          scheduledTime: readTime(appointment),
          workDates: recurrence ? [] : task?.workDates ?? this.defaults.workDates,
          plannedMinutes: Number(planned.value),
          due: recurrence ? "" : readDate(due),
          recurrence,
          kind: kind.value,
          ...kind.value === "payment" ? {
            amount: amount.value.trim() ? Number(amount.value) : null,
            currency: currency.value.trim().toUpperCase(),
            paidOn: status.value === "done" ? readDate(paymentDate) : ""
          } : {},
          minutes: this.item?.recurring ? task.minutes : Number(minutes.value),
          priority: priority.value
        };
        if (this.item) {
          await this.plugin.service.saveTask(
            this.item,
            draft,
            Number(minutes.value),
            status?.value ?? this.item.status
          );
        } else {
          await this.plugin.service.createTask(draft);
          const first = recurrence ? firstRepeatDate(recurrence, draft.scheduled) : "";
          new import_obsidian4.Notice(
            `${w.taskCreated}${first ? ` \xB7 ${w.firstRepeat}: ${formatDate(first, this.plugin.settings.dateFormat)}` : ""}`
          );
        }
      }).finally(() => {
        save.disabled = false;
      });
    });
    title2.focus();
  }
};
var MoveModal = class extends BaseModal {
  constructor(plugin, item) {
    super(plugin);
    this.item = item;
  }
  onOpen() {
    super.onOpen();
    el(this.contentEl, "h2", "", this.w.reschedule);
    el(this.contentEl, "p", "", this.item.task.title);
    const date = dateInput(
      field(this.contentEl, this.w.date),
      this.item.date || day(),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language
    );
    const actions = el(this.contentEl, "div", "tp-modal-actions");
    button(
      actions,
      this.w.today,
      () => void this.run(() => this.plugin.service.move(this.item, day()))
    );
    button(
      actions,
      this.w.tomorrow,
      () => void this.run(() => this.plugin.service.move(this.item, addDays(day(), 1)))
    );
    button(
      actions,
      this.w.save,
      () => void this.run(() => this.plugin.service.move(this.item, readDate(date))),
      "mod-cta"
    );
  }
};
var DeleteModal = class extends BaseModal {
  constructor(plugin, item) {
    super(plugin);
    this.item = item;
  }
  onOpen() {
    super.onOpen();
    el(this.contentEl, "h2", "", this.w.deleteTitle);
    el(this.contentEl, "p", "", this.item.task.title);
    el(this.contentEl, "p", "tp-muted", this.item.recurring ? this.w.skipText : this.w.deleteText);
    const actions = el(this.contentEl, "div", "tp-modal-actions");
    button(actions, this.w.cancel, () => this.close());
    if (this.item.recurring && this.item.key)
      button(
        actions,
        this.w.occurrence,
        () => void this.run(() => this.plugin.service.skip(this.item))
      );
    button(
      actions,
      this.item.recurring ? this.w.series : this.w.remove,
      () => void this.run(() => this.plugin.service.trash(this.item.task.path, "task")),
      "mod-warning"
    );
  }
};
var EntityModal = class extends BaseModal {
  constructor(plugin, type, entity) {
    super(plugin);
    this.type = type;
    this.entity = entity;
  }
  onOpen() {
    super.onOpen();
    el(this.contentEl, "h2", "", this.type === "area" ? this.w.area : this.w.project);
    const form = el(this.contentEl, "form");
    const title2 = input(field(form, this.w.title), "text", this.entity?.title || "");
    title2.required = true;
    let area;
    let status;
    let due;
    if (this.type === "project") {
      area = select(
        field(form, this.w.area),
        [
          ["", this.w.noArea],
          ...this.plugin.repo.snapshot().areas.map((a) => [a.path, a.title])
        ],
        this.entity?.area || ""
      );
      status = select(
        field(form, this.w.status),
        STATUSES.map((s) => [s, this.w[s]]),
        this.entity?.status || "backlog"
      );
      due = dateInput(
        field(form, this.w.due),
        this.entity?.due || "",
        this.plugin.settings.dateFormat,
        this.plugin.settings.language
      );
    }
    const budgetAmount = input(
      field(form, this.w.monthlyBudget),
      "number",
      this.entity?.monthlyBudget == null ? "" : String(this.entity.monthlyBudget)
    );
    budgetAmount.dataset.field = "monthlyBudget";
    budgetAmount.min = "0";
    budgetAmount.max = "1000000000000";
    budgetAmount.step = "any";
    const budgetCurrency = input(
      field(form, this.w.currency),
      "text",
      this.entity?.budgetCurrency || "USD"
    );
    budgetCurrency.dataset.field = "budgetCurrency";
    budgetCurrency.pattern = "[A-Za-z]{3}";
    budgetCurrency.maxLength = 3;
    budgetCurrency.required = true;
    const actions = el(form, "div", "tp-modal-actions");
    button(actions, this.w.cancel, () => this.close());
    const save = el(actions, "button", "mod-cta", this.w.save);
    save.type = "submit";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      void this.run(async () => {
        const amount = budgetAmount.value.trim() ? Number(budgetAmount.value) : null;
        const currency = budgetCurrency.value.trim().toUpperCase();
        if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1e12))
          throw new Error("Invalid budget.");
        if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Use a three-letter currency code.");
        const fm = {
          monthlyBudget: amount,
          budgetCurrency: currency,
          title: title2.value.trim(),
          ...this.type === "project" ? {
            area: area?.value ? `[[${area.value}]]` : "",
            status: status?.value,
            due: due ? readDate(due) || null : null
          } : {}
        };
        if (!fm.title) throw new Error("A title is required.");
        if (this.entity)
          await this.plugin.service.patch(this.entity.path, (current) => {
            if (current.type !== this.type)
              throw new Error("This note is no longer the same planner type.");
            Object.assign(current, fm);
          });
        else await this.plugin.service.createNote(this.type, title2.value, fm);
      }).finally(() => {
        save.disabled = false;
      });
    });
    title2.focus();
  }
};
var ImportModal = class extends BaseModal {
  onOpen() {
    super.onOpen();
    el(this.contentEl, "h2", "", this.w.import);
    el(this.contentEl, "p", "", this.w.importText);
    const actions = el(this.contentEl, "div", "tp-modal-actions");
    const start = button(
      actions,
      this.w.importStart,
      () => {
        start.disabled = true;
        void this.run(async () => {
          const r = await this.plugin.importer.run();
          el(this.contentEl, "h3", "", this.w.imported);
          el(
            this.contentEl,
            "p",
            "",
            `${this.w.task}: ${r.tasks} \xB7 ${this.w.project}: ${r.projects} \xB7 ${this.w.area}: ${r.areas} \xB7 ${this.w.skipped}: ${r.skipped}`
          );
          if (r.warnings.length) {
            el(this.contentEl, "h4", "", this.w.warnings);
            const list = el(this.contentEl, "ul", "tp-import-warnings");
            for (const warning of r.warnings)
              el(list, "li", "", messageText(warning, this.plugin.settings.language));
          }
        }, false).finally(() => {
          start.disabled = false;
        });
      },
      "mod-cta"
    );
  }
};
var SubscriptionModal = class extends BaseModal {
  constructor(plugin, task) {
    super(plugin);
    this.task = task;
  }
  onOpen() {
    super.onOpen();
    const w = this.w, t = this.task;
    el(this.contentEl, "h2", "", t ? w.subscription : w.addSubscription);
    const form = el(this.contentEl, "form");
    const title2 = input(field(form, w.title), "text", t?.title || "");
    title2.required = true;
    title2.maxLength = 1e3;
    const grid = el(form, "div", "tp-form-grid");
    const amount = input(
      field(grid, w.amount),
      "number",
      t?.amount == null ? "" : String(t.amount)
    );
    amount.min = "0";
    amount.max = "1000000000000";
    amount.step = "any";
    const currency = input(field(grid, w.currency), "text", t?.currency || "USD");
    currency.required = true;
    currency.maxLength = 3;
    currency.pattern = "[A-Za-z]{3}";
    const period = select(
      field(grid, w.billingPeriod),
      [
        ["monthly", w.monthly],
        ["yearly", w.yearly]
      ],
      t?.billingPeriod || "monthly"
    );
    const date = dateInput(
      field(grid, w.nextPayment),
      t?.scheduled || "",
      this.plugin.settings.dateFormat,
      this.plugin.settings.language
    );
    const snap = this.plugin.repo.snapshot();
    const options = [
      ["", w.noProject],
      ...snap.projects.filter((p) => isActive(p.status) || p.path === t?.project).sort((a, b) => this.plugin.compareProjects(a, b)).map((p) => [p.path, this.plugin.projectLabel(p)])
    ];
    if (t?.project && !snap.projects.some((p) => p.path === t.project))
      options.push([t.project, w.unresolved + " \xB7 " + t.project]);
    const project = select(field(grid, w.project), options, t?.project || "");
    const active = select(
      field(grid, w.status),
      [
        ["active", w.activeSubscription],
        ["cancelled", w.cancelledSubscription]
      ],
      t?.subscriptionActive === false ? "cancelled" : "active"
    );
    const description = el(field(form, w.description), "textarea", "tp-description");
    description.value = t?.description || "";
    description.rows = 5;
    description.maxLength = 1e5;
    const actions = el(form, "div", "tp-modal-actions");
    button(actions, w.cancel, () => this.close());
    const save = el(actions, "button", "mod-cta", w.save);
    save.type = "submit";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      void this.run(
        () => this.plugin.service.saveSubscription(
          {
            title: title2.value,
            description: description.value,
            project: project.value,
            amount: amount.value.trim() ? Number(amount.value) : null,
            currency: currency.value.trim().toUpperCase(),
            billingPeriod: period.value,
            scheduled: readDate(date),
            active: active.value === "active"
          },
          t
        )
      ).finally(() => {
        save.disabled = false;
      });
    });
    title2.focus();
  }
};
var ChargeModal = class extends BaseModal {
  constructor(plugin, task) {
    super(plugin);
    this.task = task;
  }
  onOpen() {
    super.onOpen();
    const w = this.w, t = this.task;
    el(this.contentEl, "h2", "", w.recordCharge + " \xB7 " + t.title);
    el(this.contentEl, "p", "tp-muted", w.chargeHelp);
    const form = el(this.contentEl, "form"), grid = el(form, "div", "tp-form-grid");
    const billing = dateInput(
      field(grid, w.billingDate),
      plannedExpenses([t], addDays(day(), -365), day()).at(-1)?.date || nextPaymentDate(t, day()) || day(),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language
    );
    const paid = dateInput(
      field(grid, w.paidOn),
      day(),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language
    );
    const amount = input(
      field(grid, w.paymentAmount),
      "number",
      t.amount === null ? "" : String(t.amount)
    );
    amount.required = true;
    amount.min = "0";
    amount.max = "1000000000000";
    amount.step = "any";
    const currency = input(field(grid, w.currency), "text", t.currency);
    currency.required = true;
    currency.maxLength = 3;
    currency.pattern = "[A-Za-z]{3}";
    const actions = el(form, "div", "tp-modal-actions");
    button(actions, w.cancel, () => this.close());
    const save = el(actions, "button", "mod-cta", w.save);
    save.type = "submit";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      void this.run(
        () => this.plugin.service.charge(
          t,
          readDate(billing),
          Number(amount.value),
          currency.value.trim().toUpperCase(),
          readDate(paid)
        )
      ).finally(() => save.disabled = false);
    });
  }
};

// src/ui/view.ts
var VIEW_TYPE = "tiny-planner-view";
var PlannerView = class _PlannerView extends import_obsidian5.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.w = words(plugin.settings.language);
  }
  static nextLabelId = 0;
  navLabelId = `tp-navigation-${_PlannerView.nextLabelId++}`;
  tab = "today";
  boardScope = "week";
  expenseMode = "payments";
  subscriptionScope = "active";
  hideCalendarDone = false;
  hideCalendarRecurring = false;
  sidebarCollapsed = false;
  filtersExpanded = false;
  statsMode = "business";
  financeState = { days: 30, currency: "USD", limit: 40 };
  query = "";
  area = "";
  project = "";
  month = day().slice(0, 7) + "-01";
  calendarView = "month";
  calendarFocus = day();
  w;
  main;
  shell;
  stash;
  undoButton;
  projectFilter;
  areaFilter;
  quickProject;
  quickStatus;
  unsubscribe;
  limits = /* @__PURE__ */ new Map();
  projectOpen = /* @__PURE__ */ new Map();
  dashboardState = { days: 30, page: 0, details: false };
  drag;
  monthTimer;
  opened = false;
  resizeObserver;
  quickDraft;
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "Tiny Planner";
  }
  getIcon() {
    return "calendar-check";
  }
  async onOpen() {
    this.opened = true;
    const Observer = this.contentEl.ownerDocument.defaultView?.ResizeObserver;
    if (Observer) {
      let previousWidth = 0;
      this.resizeObserver = new Observer((entries) => {
        const width = entries[0]?.contentRect.width;
        if (!width) return;
        this.contentEl.classList.toggle("tp-narrow", width <= 1050);
        this.contentEl.classList.toggle("tp-mobile", width <= 600);
        if (Math.abs(width - previousWidth) > 1) {
          previousWidth = width;
          if (this.tab === "statistics") this.render();
        }
      });
      this.resizeObserver.observe(this.contentEl);
    }
    this.build();
    this.unsubscribe = this.plugin.repo.subscribe(() => {
      if (this.opened) {
        this.updateOptions();
        this.render();
      }
    });
  }
  async onClose() {
    this.opened = false;
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    this.cancelMonth();
    this.contentEl.replaceChildren();
  }
  rebuild() {
    if (this.opened) this.build();
  }
  pretty(key) {
    return formatDate(key, this.plugin.settings.dateFormat);
  }
  duration(minutes) {
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return hours ? `${hours} ${this.w.hourUnit}${rest ? ` ${rest} ${this.w.minuteUnit}` : ""}` : `${rest} ${this.w.minuteUnit}`;
  }
  taskTimes(parent, item) {
    const work = item.task.kind !== "payment" && item.task.kind !== "subscription";
    if (work && item.task.plannedMinutes)
      el(
        parent,
        "span",
        "tp-planned-minutes",
        `${item.status === "done" ? this.w.taskPlan : this.w.estimate}: ${this.duration(item.task.plannedMinutes)}`
      );
    if (item.minutes)
      el(
        parent,
        "span",
        "tp-actual-minutes",
        item.status === "done" && work ? `${this.w.taskSpent}: ${this.duration(item.minutes)}` : `${item.minutes} ${this.w.minuteUnit}`
      );
  }
  locale() {
    return this.plugin.settings.language === "ru" ? "ru-RU" : "en-US";
  }
  perform(fn) {
    void fn().catch(
      (e) => new import_obsidian5.Notice(
        messageText(e instanceof Error ? e.message : String(e), this.plugin.settings.language)
      )
    );
  }
  build() {
    const oldTitle = this.contentEl.querySelector(".tp-quick input[type=text]");
    if (oldTitle)
      this.quickDraft = oldTitle.value ? {
        title: oldTitle.value,
        scheduledTime: this.contentEl.querySelector(".tp-quick .tp-time")?.value || "",
        status: this.quickStatus.value,
        project: this.quickProject.value,
        date: (() => {
          const input2 = this.contentEl.querySelector(".tp-quick .tp-date");
          return input2 ? parseDate(input2.value, input2.dataset.dateFormat) || input2.value : "";
        })()
      } : void 0;
    this.w = words(this.plugin.settings.language);
    this.contentEl.replaceChildren();
    this.contentEl.classList.add("tp-host");
    this.contentEl.style.setProperty(
      "--tp-ui-scale",
      String(this.plugin.normalizeUiScale(this.plugin.settings.uiScalePercent) / 100)
    );
    this.shell = el(this.contentEl, "div", "tp-shell");
    this.shell.classList.toggle("tp-sidebar-collapsed", this.sidebarCollapsed);
    const sidebar = el(this.shell, "aside", "tp-sidebar");
    sidebar.id = `${this.navLabelId}-sidebar`;
    const sidebarHead = el(sidebar, "div", "tp-sidebar-heading");
    const brand = el(sidebarHead, "div", "tp-brand", "Tiny Planner");
    brand.id = this.navLabelId;
    const nav = el(sidebar, "nav", "tp-nav");
    nav.setAttribute("aria-labelledby", this.navLabelId);
    const icons = {
      today: "sun",
      inbox: "inbox",
      upcoming: "list-todo",
      calendar: "calendar-days",
      projects: "folders",
      kanban: "columns-3",
      subscriptions: "credit-card",
      statistics: "chart-no-axes-combined",
      manualTab: "book-open"
    };
    const groups = [
      [this.w.navPlan, ["inbox", "today", "upcoming", "calendar"]],
      [this.w.navOrganize, ["projects", "kanban"]],
      [this.w.navReview, ["subscriptions", "statistics"]],
      [this.w.navHelp, ["manualTab"]]
    ];
    for (const [label, tabs] of groups) {
      const group = el(nav, "div", "tp-nav-group");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", label);
      el(group, "div", "tp-nav-heading", label);
      for (const tab of tabs) {
        const b = button(
          group,
          "",
          () => {
            this.tab = tab;
            this.limits.clear();
            this.build();
          },
          "tp-nav-button"
        );
        const icon = el(b, "span", "tp-nav-icon");
        icon.setAttribute("aria-hidden", "true");
        (0, import_obsidian5.setIcon)(icon, icons[tab]);
        el(b, "span", "", this.w[tab]);
        b.dataset.tab = tab;
        b.setAttribute("aria-current", String(this.tab === tab));
      }
    }
    const bottom = el(sidebar, "div", "tp-sidebar-bottom");
    button(
      bottom,
      this.w.addArea,
      () => new EntityModal(this.plugin, "area").open(),
      "tp-text-button"
    );
    button(
      bottom,
      this.w.addProject,
      () => new EntityModal(this.plugin, "project").open(),
      "tp-text-button"
    );
    button(bottom, this.w.import, () => new ImportModal(this.plugin).open(), "tp-text-button");
    const content = el(this.shell, "div", "tp-content");
    const header = el(content, "header", "tp-header");
    const menuToggle = iconButton(
      sidebarHead,
      "chevron-left",
      this.w.collapseMenu,
      () => {
        const focused = menuToggle.ownerDocument.activeElement === menuToggle;
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.shell.classList.toggle("tp-sidebar-collapsed", this.sidebarCollapsed);
        updateSidebar();
        updateMenuToggle();
        if (focused) menuToggle.focus();
        if (this.tab === "statistics") this.render();
      },
      "tp-menu-toggle"
    );
    menuToggle.dataset.menuToggle = "true";
    nav.id = `${sidebar.id}-navigation`;
    bottom.id = `${sidebar.id}-actions`;
    menuToggle.setAttribute("aria-controls", `${nav.id} ${bottom.id}`);
    const updateSidebar = () => {
      brand.hidden = this.sidebarCollapsed;
      nav.hidden = this.sidebarCollapsed;
      bottom.hidden = this.sidebarCollapsed;
      if (this.sidebarCollapsed) header.prepend(menuToggle);
      else sidebarHead.appendChild(menuToggle);
      sidebar.hidden = this.sidebarCollapsed;
    };
    updateSidebar();
    const updateMenuToggle = () => {
      const label = this.sidebarCollapsed ? this.w.expandMenu : this.w.collapseMenu;
      menuToggle.setAttribute("aria-label", label);
      menuToggle.setAttribute("aria-expanded", String(!this.sidebarCollapsed));
      menuToggle.title = label;
      menuToggle.replaceChildren();
      (0, import_obsidian5.setIcon)(menuToggle, this.sidebarCollapsed ? "chevron-right" : "chevron-left");
    };
    updateMenuToggle();
    const headings = el(header, "div", "tp-page-heading");
    el(headings, "h1", "", this.w[this.tab]);
    const tools = el(header, "div", "tp-header-tools");
    tools.hidden = this.tab === "manualTab";
    if (this.tab !== "manualTab") {
      const date2 = el(tools, "time", "tp-header-date", this.pretty(day()));
      date2.dateTime = day();
      date2.setAttribute("aria-label", `${this.w.today}: ${this.pretty(day())}`);
      const icon = el(date2, "span");
      icon.setAttribute("aria-hidden", "true");
      (0, import_obsidian5.setIcon)(icon, "calendar-days");
      date2.prepend(icon);
    }
    this.undoButton = iconButton(
      tools,
      "undo-2",
      this.w.undo,
      () => this.perform(() => this.plugin.service.undo())
    );
    iconButton(
      tools,
      "refresh-cw",
      this.w.refresh,
      () => this.perform(() => this.plugin.repo.load())
    );
    if (this.tab === "subscriptions") {
      button(tools, this.w.addSubscription, () => {
        this.expenseMode = "subscriptions";
        this.render();
        new SubscriptionModal(this.plugin).open();
      });
      button(
        tools,
        this.w.addPayment,
        () => {
          this.expenseMode = "payments";
          this.render();
          new TaskModal(this.plugin, void 0, {
            kind: "payment",
            status: "done",
            scheduled: day(),
            project: this.project
          }).open();
        },
        "mod-cta"
      );
    } else
      button(
        tools,
        this.w.add,
        () => new TaskModal(this.plugin, void 0, {
          scheduled: this.tab === "today" || this.tab === "kanban" && !["all", "undated"].includes(this.boardScope) ? day() : "",
          project: this.project
        }).open(),
        "mod-cta"
      );
    const quick = el(content, "form", "tp-quick");
    quick.hidden = ["statistics", "subscriptions", "manualTab"].includes(this.tab);
    const title2 = input(quick, "text", this.quickDraft?.title || "", this.w.quick);
    title2.setAttribute("aria-label", this.w.title);
    title2.maxLength = 1e3;
    title2.required = true;
    const quickOptions = el(quick, "div", "tp-quick-options");
    quickOptions.id = `${this.navLabelId}-quick-options`;
    quickOptions.hidden = true;
    this.quickProject = select(quickOptions, [["", this.w.noProject]], this.project);
    this.quickProject.setAttribute("aria-label", this.w.project);
    this.quickProject.addEventListener("change", () => this.projectTooltip());
    const date = dateInput(
      quick,
      this.quickDraft?.date ?? (this.tab === "today" || this.tab === "kanban" && !["all", "undated"].includes(this.boardScope) ? day() : ""),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language
    );
    date.setAttribute("aria-label", this.w.date);
    const appointment = timeInput(
      quickOptions,
      this.quickDraft?.scheduledTime || "",
      this.w.appointmentTime,
      this.plugin.settings.language
    );
    this.quickStatus = select(
      quickOptions,
      STATUSES.map((s) => [s, this.w[s]]),
      this.quickDraft?.status ?? (date.value ? "todo" : "backlog")
    );
    this.quickStatus.setAttribute("aria-label", this.w.status);
    const options = button(
      quick,
      this.w.quickOptions,
      () => {
        quickOptions.hidden = !quickOptions.hidden;
        options.setAttribute("aria-expanded", String(!quickOptions.hidden));
      },
      "tp-quick-toggle"
    );
    options.dataset.quickOptions = "true";
    options.setAttribute("aria-expanded", "false");
    options.setAttribute("aria-controls", quickOptions.id);
    const add = el(quick, "button", "tp-quick-add mod-cta", "+");
    add.type = "submit";
    add.setAttribute("aria-label", this.w.add);
    iconButton(
      quick,
      "sliders-horizontal",
      this.w.details,
      () => this.perform(async () => {
        new TaskModal(this.plugin, void 0, {
          title: title2.value,
          status: this.quickStatus.value,
          project: this.quickProject.value,
          scheduled: readDate(date),
          scheduledTime: readTime(appointment)
        }).open();
      })
    );
    quick.appendChild(quickOptions);
    if (this.quickDraft) {
      quickOptions.hidden = false;
      options.setAttribute("aria-expanded", "true");
    }
    quick.addEventListener("submit", (e) => {
      e.preventDefault();
      if (add.disabled) return;
      add.disabled = true;
      this.perform(async () => {
        try {
          await this.plugin.service.createTask({
            title: title2.value,
            status: this.quickStatus.value,
            project: this.quickProject.value,
            scheduled: readDate(date),
            scheduledTime: readTime(appointment),
            due: "",
            recurrence: "",
            kind: "task",
            minutes: 0,
            priority: "normal"
          });
          title2.value = "";
          appointment.value = "";
          new import_obsidian5.Notice(this.w.taskCreated);
          this.quickDraft = void 0;
          title2.focus();
        } finally {
          add.disabled = false;
        }
      });
    });
    const filters = el(content, "div", "tp-filters");
    filters.hidden = this.tab === "manualTab";
    const searchLabel = this.tab === "subscriptions" ? this.w.searchSubscriptions : this.w.search;
    const search = input(filters, "search", this.query, searchLabel);
    search.setAttribute("aria-label", searchLabel);
    search.addEventListener("input", () => {
      this.query = search.value;
      this.limits.clear();
      this.dashboardState.page = 0;
      this.render();
    });
    const filterPanel = el(content, "div", "tp-filter-panel");
    filterPanel.id = `${this.navLabelId}-filters`;
    filterPanel.hidden = this.tab === "manualTab" || !this.filtersExpanded;
    const filterToggle = iconButton(
      filters,
      "sliders-horizontal",
      this.w.filters,
      () => {
        this.filtersExpanded = !this.filtersExpanded;
        filterPanel.hidden = !this.filtersExpanded;
        filterToggle.setAttribute("aria-expanded", String(this.filtersExpanded));
      },
      "tp-filters-toggle"
    );
    filterToggle.setAttribute("aria-controls", filterPanel.id);
    filterToggle.setAttribute("aria-pressed", String(Boolean(this.area || this.project)));
    filterToggle.setAttribute("aria-expanded", String(this.filtersExpanded));
    this.areaFilter = select(filterPanel, [["", this.w.all]], this.area);
    this.areaFilter.setAttribute("aria-label", this.w.area);
    this.areaFilter.addEventListener("change", () => {
      this.area = this.areaFilter.value;
      this.limits.clear();
      this.project = "";
      this.dashboardState.page = 0;
      this.updateOptions();
      this.render();
    });
    this.projectFilter = select(filterPanel, [["", this.w.allProjects]], this.project);
    this.projectFilter.setAttribute("aria-label", this.w.project);
    this.projectFilter.addEventListener("change", () => {
      this.project = this.projectFilter.value;
      this.limits.clear();
      this.dashboardState.page = 0;
      this.quickProject.value = this.project;
      this.projectTooltip();
      this.render();
    });
    button(
      filterPanel,
      this.w.clear,
      () => {
        this.area = "";
        this.project = "";
        this.query = "";
        this.dashboardState.page = 0;
        this.build();
      },
      "tp-text-button tp-filter-clear"
    );
    content.insertBefore(filterPanel, quick);
    content.insertBefore(filters, filterPanel);
    this.main = el(content, "main", "tp-main");
    this.stash = el(content, "div", "tp-drag-stash");
    this.stash.setAttribute("aria-hidden", "true");
    this.updateOptions();
    if (this.quickDraft && [...this.quickProject.options].some((o) => o.value === this.quickDraft.project))
      this.quickProject.value = this.quickDraft.project;
    this.projectTooltip();
    this.render();
  }
  fill(s, options, value) {
    s.replaceChildren();
    for (const [v, t] of options) {
      const o = el(s, "option", "", t);
      o.value = v;
    }
    s.value = options.some((o) => o[0] === value) ? value : "";
  }
  updateOptions() {
    const snap = this.plugin.repo.snapshot();
    if (this.area && !snap.areas.some((a) => a.path === this.area)) this.area = "";
    if (this.project && !snap.projects.some((p) => p.path === this.project && (!this.area || p.area === this.area)))
      this.project = "";
    const projects = snap.projects.filter((p) => !this.area || p.area === this.area).sort((a, b) => this.plugin.compareProjects(a, b));
    this.fill(
      this.areaFilter,
      [["", this.w.all], ...snap.areas.map((a) => [a.path, a.title])],
      this.area
    );
    this.fill(
      this.projectFilter,
      [
        ["", this.w.allProjects],
        ...projects.map((p) => [p.path, this.plugin.projectLabel(p)])
      ],
      this.project
    );
    const value = this.quickProject.value || this.project;
    this.fill(
      this.quickProject,
      [
        ["", this.w.noProject],
        ...snap.projects.filter((p) => isActive(p.status) || p.path === value).sort((a, b) => this.plugin.compareProjects(a, b)).map((p) => [p.path, this.plugin.projectLabel(p)])
      ],
      value
    );
    this.projectTooltip();
  }
  projectTooltip() {
    this.quickProject.title = this.quickProject.value ? this.quickProject.selectedOptions[0]?.textContent || "" : this.w.inbox + " \xB7 " + this.w.noProject.toLocaleLowerCase();
  }
  filtered() {
    const snap = this.plugin.repo.snapshot();
    const projects = new Map(snap.projects.map((p) => [p.path, p]));
    const areas = new Map(snap.areas.map((a) => [a.path, a.title]));
    const q = this.query.trim().toLocaleLowerCase();
    return snap.tasks.filter((t) => {
      const p = projects.get(t.project);
      return (!this.project || t.project === this.project) && (!this.area || p?.area === this.area) && (!q || [t.title, t.description, p?.title, areas.get(p?.area || "")].filter(Boolean).join(" ").toLocaleLowerCase().includes(q));
    });
  }
  render() {
    if (!this.main) return;
    const scrollPositions = [];
    for (let node = this.main; node; node = node.parentElement)
      scrollPositions.push({ node, top: node.scrollTop, left: node.scrollLeft });
    const retained = this.drag?.source.isConnected && this.main.contains(this.drag.source);
    if (retained) {
      for (const child of [...this.main.children]) {
        if (child.contains(this.drag.source)) {
          child.querySelector(".tp-calendar-toolbar")?.remove();
          child.classList.add("tp-calendar-retained");
          child.setAttribute("aria-hidden", "true");
        } else child.remove();
      }
    }
    const focused = this.contentEl.ownerDocument.activeElement;
    const focusedBoardPage = focused?.dataset.boardPage;
    const focusedCard = focused?.closest(".tp-board-card");
    const focusedRow = focused?.closest(".tp-task");
    const focusedLabel = focused?.getAttribute("aria-label");
    const focusedPeriod = this.main.contains(focused) ? focused?.dataset.period : void 0;
    const focusedPage = this.main.contains(focused) ? focused?.dataset.pageAction : void 0;
    const focusedDetails = focused?.matches(".tp-activity-details > summary");
    const activityDetails = this.main.querySelector(".tp-activity-details");
    if (activityDetails) this.dashboardState.details = activityDetails.open;
    const projectDetails = this.main.querySelector(".tp-project-details");
    if (projectDetails) this.dashboardState.projectDetails = projectDetails.open;
    const extraDetails = this.main.querySelector(".tp-stats-disclosure");
    if (extraDetails) this.dashboardState.extraDetails = extraDetails.open;
    for (const details of this.main.querySelectorAll(".tp-project"))
      this.projectOpen.set(details.dataset.path, details.open);
    if (!retained) this.main.replaceChildren();
    this.undoButton.disabled = !this.plugin.service.canUndo;
    const records = this.filtered();
    const tasks = records.filter((t) => t.kind !== "subscription");
    const today = day();
    const headerDate = this.contentEl.querySelector(".tp-header-date");
    if (headerDate && headerDate.dateTime !== today) {
      headerDate.dateTime = today;
      headerDate.setAttribute("aria-label", `${this.w.today}: ${this.pretty(today)}`);
      headerDate.lastChild.textContent = this.pretty(today);
    }
    if (this.tab === "manualTab")
      manual(
        this.main,
        this.plugin.settings.language,
        this.plugin.manifest?.author || "Tiny Planner contributors",
        this.plugin.manifest?.version || ""
      );
    if (this.tab === "today") {
      const sections = todayItems(tasks, today, {
        overdue: this.limits.get("overdue") || 60,
        today: this.limits.get("today") || 60
      });
      this.section(
        this.w.overdue,
        sections.overdue,
        "overdue",
        false,
        this.main,
        sections.counts.overdue
      );
      this.section(this.w.today, sections.today, "today", false, this.main, sections.counts.today);
      if (!sections.overdue.length && !sections.today.length) this.empty();
    }
    if (this.tab === "inbox")
      this.section(
        "",
        sortItems(
          tasks.filter((t) => !t.project || !this.plugin.repo.project(t.project)).map((t) => taskItem(t, today))
        ),
        "inbox",
        true
      );
    if (this.tab === "subscriptions") this.expenses(records);
    if (this.tab === "upcoming") {
      for (let i = 0; i < 7; i++) {
        const d = addDays(today, i);
        const items = tasks.flatMap((t) => calendarItems(t, d, d));
        this.section(this.pretty(d), sortItems(items, true), d);
      }
      if (!this.main.childElementCount) this.empty();
    }
    if (this.tab === "calendar")
      this.calendar(
        tasks,
        records.filter((t) => t.kind === "subscription")
      );
    if (this.tab === "today") this.workloadPanel(tasks, [today]);
    if (this.tab === "projects") this.projects(tasks);
    if (this.tab === "kanban") this.board(tasks);
    if (this.tab === "statistics") {
      const modes = el(this.main, "div", "tp-stat-modes");
      modes.setAttribute("role", "group");
      modes.setAttribute("aria-label", this.w.statistics);
      for (const mode of ["business", "finance"]) {
        const b = button(
          modes,
          mode === "business" ? this.w.businessStats : this.w.financialStats,
          () => {
            this.statsMode = mode;
            this.render();
            this.main.querySelector(`[data-stats-mode=${mode}]`)?.focus({ preventScroll: true });
          }
        );
        b.dataset.statsMode = mode;
        b.setAttribute("aria-pressed", String(this.statsMode === mode));
      }
      if (this.statsMode === "finance") {
        financeDashboard(
          this.main,
          records,
          today,
          this.financeState,
          this.w,
          this.locale(),
          this.plugin.settings.dateFormat,
          () => this.refreshPeriod(this.financeState),
          (t) => this.expenseProject(t),
          () => {
            this.tab = "subscriptions";
            this.expenseMode = "payments";
            this.build();
          }
        );
        this.budgetPanel(records);
      }
      if (this.statsMode === "business") {
        const snap = this.plugin.repo.snapshot();
        const matching = new Set(tasks.map((t) => t.project));
        const q = this.query.trim().toLocaleLowerCase();
        const projects = snap.projects.filter(
          (p) => (!this.area || p.area === this.area) && (!this.project || p.path === this.project) && (!q || matching.has(p.path) || this.plugin.projectLabel(p).toLocaleLowerCase().includes(q))
        ).sort((a, b) => a.title.localeCompare(b.title) || a.path.localeCompare(b.path));
        dashboard(
          this.main,
          analytics(
            tasks,
            projects,
            today,
            this.dashboardState.days,
            new Set(snap.projects.map((p) => p.path))
          ),
          this.dashboardState,
          this.w,
          this.locale(),
          !!(q || this.area || this.project),
          () => this.refreshPeriod(this.dashboardState),
          (p) => new EntityModal(this.plugin, "project", p).open(),
          (p) => this.plugin.projectLabel(p),
          this.plugin.settings.dateFormat
        );
        const workload = el(this.main, "details", "tp-stats-disclosure tp-week-workload");
        el(workload, "summary", "", this.w.workloadThisWeek);
        this.workloadPanel(
          tasks,
          Array.from({ length: 7 }, (_, i) => addDays(calendarPeriod(today, 7).from, i))
        );
        const panel = this.main.querySelector(".tp-workload-panel");
        if (panel) workload.appendChild(panel);
      }
    }
    if (focusedRow && focusedLabel) {
      const replacement = [...this.main.querySelectorAll(".tp-task")].find(
        (r) => r.dataset.path === focusedRow.dataset.path && r.dataset.key === focusedRow.dataset.key
      );
      const target = [...replacement?.querySelectorAll("button") || []].find(
        (b) => b.getAttribute("aria-label") === focusedLabel
      );
      target?.focus({ preventScroll: true });
    }
    if (this.tab === "kanban" && focusedBoardPage) {
      const pager = [...this.main.querySelectorAll(".tp-board-pager")].find(
        (n) => n.dataset.status === focusedBoardPage
      );
      pager?.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
    }
    if (this.tab === "kanban" && focusedCard) {
      const card = [...this.main.querySelectorAll(".tp-board-card")].find(
        (n) => n.dataset.path === focusedCard.dataset.path && n.dataset.key === focusedCard.dataset.key
      );
      card?.querySelector(focused?.tagName === "SELECT" ? "select" : "button")?.focus({ preventScroll: true });
    }
    if (this.tab === "statistics") {
      let target = null;
      if (focusedPeriod) target = this.main.querySelector(`[data-period="${focusedPeriod}"]`);
      if (focusedPage) target = this.main.querySelector(`[data-page-action="${focusedPage}"]`);
      if (focusedDetails) target = this.main.querySelector(".tp-activity-details > summary");
      if (target instanceof this.contentEl.ownerDocument.defaultView.HTMLButtonElement && target.disabled)
        target = this.main.querySelector(".tp-stats-pager button:not(:disabled)");
      target?.focus({ preventScroll: true });
    }
    const unsupported = tasks.filter((t) => t.unsupportedRepeat);
    if (unsupported.length) {
      const warning = el(this.main, "div", "tp-warning");
      el(warning, "p", "", `${this.w.warnings}: ${unsupported.length}`);
      const key = "unsupported";
      const limit = this.limits.get(key) || 12;
      for (const t of unsupported.slice(0, limit))
        button(
          warning,
          `${t.title}: ${messageText(t.unsupportedRepeat, this.plugin.settings.language)}`,
          () => this.plugin.openNote(t.path),
          "tp-text-button"
        );
      if (unsupported.length > limit)
        button(
          warning,
          `${this.w.showMore} (${unsupported.length - limit})`,
          () => {
            this.limits.set(key, limit + 12);
            this.render();
          },
          "tp-show-more"
        );
    }
    for (const { node, top, left } of scrollPositions) {
      node.scrollTop = top;
      node.scrollLeft = left;
    }
  }
  workloadPanel(tasks, dates) {
    const capacity = this.plugin.settings.dailyCapacityMinutes ?? 480;
    const loads = dates.map((d) => dayLoad(tasks, d, capacity));
    const panel = el(this.main, "section", "tp-workload-panel");
    const heading = el(panel, "div", "tp-workload-heading");
    el(heading, "h2", "", this.w.workload);
    if (this.tab !== "calendar" && dates.length > 1)
      el(
        heading,
        "span",
        "tp-muted tp-period-range",
        `${this.pretty(dates[0])} \u2014 ${this.pretty(dates.at(-1))}`
      );
    const total = loads.reduce((n, d) => n + d.minutes, 0);
    const unestimated = /* @__PURE__ */ new Set();
    for (const task of tasks) {
      if (task.plannedMinutes || task.kind === "payment" || task.kind === "subscription") continue;
      for (const item of calendarItems(task, dates[0] || "", dates.at(-1) || "")) {
        if (isActive(item.status) && (item.calendarRole === "work" || !workDays(task).length))
          unestimated.add(task.path + "\0" + (item.recurring ? item.key : ""));
      }
    }
    panel.dataset.plannedMinutes = String(total);
    panel.dataset.unestimatedTasks = String(unestimated.size);
    el(
      panel,
      "strong",
      "",
      total || !unestimated.size ? `${this.w.workloadPlanned}: ${this.duration(total)}` : this.w.workloadNoEstimates
    );
    if (dates.length === 1)
      el(panel, "span", "tp-muted", `${this.w.workloadAvailable}: ${this.duration(capacity)}`);
    if (unestimated.size)
      el(panel, "span", "tp-muted", `${this.w.workloadUnknownTasks}: ${unestimated.size}`);
    const overloaded = loads.filter((d) => d.over).length;
    if (overloaded)
      el(panel, "span", "tp-load-over", `${this.w.workloadOverloadedDays}: ${overloaded}`);
    if (dates.length === 1 && total > 0) {
      const meter = el(panel, "progress");
      meter.max = Math.max(1, capacity);
      meter.value = Math.min(total, meter.max);
      meter.setAttribute("aria-label", this.w.workload);
      meter.classList.toggle("tp-load-over", total > capacity);
    }
  }
  budgetPanel(tasks) {
    const snap = this.plugin.repo.snapshot(), bounds = calendarPeriod(day(), this.financeState.days);
    const scopes = budgetReport(
      tasks,
      snap.projects.filter(
        (p) => (!this.project || p.path === this.project) && (!this.area || p.area === this.area)
      ),
      snap.areas.filter((a) => (!this.area || a.path === this.area) && !this.project),
      bounds.from,
      bounds.to
    );
    const panel = el(this.main, "section", "tp-stats-panel tp-budget-panel");
    datedHeading(panel, this.w.budgets, `${this.pretty(bounds.from)} \u2014 ${this.pretty(bounds.to)}`);
    const configure = select(
      panel,
      [
        ["", this.w.editBudget],
        ...snap.areas.map(
          (a) => ["area:" + a.path, this.w.area + " \xB7 " + a.title]
        ),
        ...[...snap.projects].sort((a, b) => this.plugin.compareProjects(a, b)).map(
          (p) => ["project:" + p.path, this.w.project + " \xB7 " + this.plugin.projectLabel(p)]
        )
      ],
      ""
    );
    configure.dataset.budgetConfigure = "true";
    configure.setAttribute("aria-label", this.w.editBudget);
    configure.addEventListener("change", () => {
      const value = configure.value;
      const entity = value.startsWith("area:") ? snap.areas.find((a) => a.path === value.slice(5)) : snap.projects.find((p) => p.path === value.slice(8));
      if (entity)
        new EntityModal(this.plugin, value.startsWith("area:") ? "area" : "project", entity).open();
      configure.value = "";
    });
    if (!scopes.length) el(panel, "p", "tp-muted", this.w.noBudgets);
    for (const data of scopes) {
      const row = el(panel, "article", "tp-budget-card");
      row.dataset.path = data.scope.path;
      const heading = el(row, "div", "tp-stats-heading");
      el(
        heading,
        "h3",
        "",
        data.scope.scope === "project" ? this.plugin.projectLabel(data.scope) : data.scope.title
      );
      button(
        heading,
        this.w.editBudget,
        () => new EntityModal(this.plugin, data.scope.scope, data.scope).open(),
        "tp-text-button"
      );
      const values = el(row, "dl", "tp-budget-values");
      for (const [label, n] of [
        [this.w.budgetLimit, data.limit],
        [this.w.budgetSpent, data.spent],
        [this.w.budgetPlanned, data.forecast],
        [this.w.budgetRemaining, data.remaining],
        [this.w.budgetCommitted, data.committed]
      ]) {
        el(values, "dt", "", label);
        const value = el(values, "dd", "", money(n, data.currency, this.locale()));
        if (n < 0) value.classList.add("tp-budget-over");
      }
      const meter = el(row, "progress");
      meter.max = Math.max(1, data.limit);
      meter.value = Math.min(data.spent, meter.max);
      meter.setAttribute("aria-label", this.w.budgets + " \xB7 " + data.scope.title);
      meter.classList.toggle("tp-load-over", data.spent > data.limit);
      if (data.other.length)
        el(row, "p", "tp-warning", `${this.w.budgetOther}: ${data.other.join(", ")}`);
      if (data.unpriced) el(row, "p", "tp-warning", `${this.w.unpricedPayments}: ${data.unpriced}`);
    }
  }
  expenseProject(task) {
    const project = this.plugin.repo.project(task.project);
    return project ? this.plugin.projectLabel(project) : task.project ? this.w.unresolved + " \xB7 " + task.project : this.w.noProject;
  }
  editExpense(entry) {
    if (entry.task.kind === "subscription") new SubscriptionModal(this.plugin, entry.task).open();
    else new TaskModal(this.plugin, entry.item || taskItem(entry.task, day())).open();
  }
  undoExpense(entry) {
    if (entry.task.kind === "subscription")
      this.perform(() => this.plugin.service.removeCharge(entry.task, entry.key));
    else if (entry.item) this.perform(() => this.plugin.service.status(entry.item, "todo"));
  }
  refreshPeriod(state) {
    this.dashboardState.days = this.financeState.days = state.days;
    this.render();
  }
  expenses(records) {
    const sections = el(this.main, "div", "tp-expense-modes tp-stat-modes");
    sections.setAttribute("role", "group");
    sections.setAttribute("aria-label", this.w.expenseSections);
    for (const mode of ["payments", "subscriptions"]) {
      const choice = button(
        sections,
        mode === "payments" ? this.w.payments : this.w.subscriptionsSection,
        () => {
          this.expenseMode = mode;
          this.render();
          this.main.querySelector(`[data-expense-mode=${mode}]`)?.focus({ preventScroll: true });
        }
      );
      choice.dataset.expenseMode = mode;
      choice.setAttribute("aria-pressed", String(this.expenseMode === mode));
    }
    if (this.expenseMode === "subscriptions") {
      this.subscriptions(records.filter((t) => t.kind === "subscription"));
      return;
    }
    const data = financialAnalytics(records, day(), this.financeState.days);
    const range2 = `${this.pretty(data.from)} \u2014 ${this.pretty(data.to)}`;
    const header = periodHeading(
      this.main,
      this.w.payments,
      range2,
      this.financeState,
      this.w,
      () => this.refreshPeriod(this.financeState),
      this.main
    );
    const analyticsLink = button(
      header,
      this.w.expensesAnalytics,
      () => {
        this.tab = "statistics";
        this.statsMode = "finance";
        this.build();
      },
      "tp-text-button"
    );
    analyticsLink.dataset.expensesAnalytics = "true";
    const ledger = el(this.main, "div", "tp-expense-ledger");
    const payments = records.filter((t) => t.kind === "payment");
    const history = data.actual;
    expenseHistory(
      ledger,
      history,
      this.w,
      this.locale(),
      this.plugin.settings.dateFormat,
      (t) => this.expenseProject(t),
      (e) => this.editExpense(e),
      (e) => this.undoExpense(e),
      this.limits.get("expense-history") || 40,
      () => {
        this.limits.set("expense-history", (this.limits.get("expense-history") || 40) + 40);
        this.render();
      },
      range2
    );
    const plan = el(ledger, "section", "tp-finance-plan tp-stats-panel");
    datedHeading(plan, this.w.forecast, range2);
    ledger.prepend(plan);
    const planList = el(plan, "div", "tp-task-list");
    for (const e of data.planned.slice(0, this.financeState.limit)) {
      if (e.item) {
        this.row(planList, e.item);
        continue;
      }
      const row = el(planList, "div", "tp-expense-record");
      button(row, e.task.title, () => this.editExpense(e), "tp-text-button");
      el(row, "span", "tp-muted", `${this.pretty(e.date)} \xB7 ${this.expenseProject(e.task)}`);
      el(
        row,
        "strong",
        "",
        e.amount === null ? this.w.unpriced : money(e.amount, e.currency, this.locale())
      );
    }
    if (!data.planned.length) el(plan, "p", "tp-muted", this.w.forecastEmpty);
    if (data.planned.length > this.financeState.limit)
      button(plan, this.w.showMore, () => {
        this.financeState.limit += 40;
        this.render();
      });
    const issues = el(this.main, "details", "tp-stats-disclosure tp-payment-issues");
    el(issues, "summary", "", this.w.paymentIssues);
    const unresolved = boardItems(payments, day(), "all").filter((i) => isActive(i.status));
    const overdue = unresolved.filter((i) => i.date && i.date < data.from);
    if (overdue.length)
      this.section(this.w.overduePayments, sortItems(overdue), "expense-overdue", true, issues);
    const undated = unresolved.filter((i) => !i.date);
    if (undated.length)
      this.section(this.w.undatedPayments, undated, "expense-undated", true, issues);
    const unknown = actualExpenses(records).filter((e) => !e.date);
    if (unknown.length) {
      const details = el(issues, "details", "tp-stats-disclosure");
      el(details, "summary", "", `${this.w.undatedExpenses} \xB7 ${unknown.length}`);
      expenseHistory(
        details,
        unknown,
        this.w,
        this.locale(),
        this.plugin.settings.dateFormat,
        (t) => this.expenseProject(t),
        (e) => this.editExpense(e),
        (e) => this.undoExpense(e),
        this.financeState.limit,
        () => {
          this.financeState.limit += 40;
          this.render();
        }
      );
    }
    const other = boardItems(payments, day(), "all").filter(
      (i) => !isActive(i.status) && i.status !== "done"
    );
    if (other.length) this.section(this.w.paymentFailed, other, "expense-failed", true, issues);
    if (!overdue.length && !undated.length && !unknown.length && !other.length) issues.remove();
  }
  subscriptions(tasks) {
    const totals = monthlyCosts(tasks);
    const summary = el(this.main, "section", "tp-subscription-summary");
    const summaryHeading = el(summary, "div", "tp-subscription-summary-heading");
    el(summaryHeading, "h2", "", this.w.monthlyEstimate);
    const totalList = el(summary, "div", "tp-subscription-totals");
    const money2 = (amount, currency) => new Intl.NumberFormat(this.locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + " " + currency;
    for (const [currency, amount] of totals)
      el(
        el(totalList, "div", "tp-subscription-cost"),
        "strong",
        "tp-cost-total",
        money2(amount, currency)
      );
    if (!totals.size) el(totalList, "p", "tp-muted", "\u2014");
    const unpriced = tasks.filter((t) => t.subscriptionActive && t.amount === null).length;
    if (unpriced) el(summary, "small", "tp-muted", `${this.w.unpriced}: ${unpriced}`);
    const scope = select(
      summaryHeading,
      [
        ["active", this.w.activeSubscription],
        ["cancelled", this.w.cancelledSubscription],
        ["all", this.w.allSubscriptions]
      ],
      this.subscriptionScope
    );
    scope.setAttribute("aria-label", this.w.subscriptions);
    scope.addEventListener("change", () => {
      this.subscriptionScope = scope.value;
      this.limits.delete("subscriptions");
      this.render();
      this.main.querySelector(".tp-subscription-summary select")?.focus({ preventScroll: true });
    });
    const matching = tasks.filter(
      (t) => this.subscriptionScope === "all" || t.subscriptionActive === (this.subscriptionScope === "active")
    ).sort((a, b) => a.title.localeCompare(b.title));
    const size = 20, pages = Math.max(1, Math.ceil(matching.length / size));
    const page = Math.min(this.limits.get("subscriptions") || 0, pages - 1);
    this.limits.set("subscriptions", page);
    if (!matching.length)
      el(
        this.main,
        "p",
        "tp-empty",
        tasks.length ? this.w.subscriptionsNoMatch : this.w.subscriptionsEmpty
      );
    const list = el(this.main, "div", "tp-subscription-list");
    for (const t of matching.slice(page * size, (page + 1) * size)) {
      const row = el(list, "article", "tp-subscription");
      row.dataset.active = String(t.subscriptionActive);
      row.dataset.path = t.path;
      const body2 = el(row, "div", "tp-task-body");
      const heading = el(body2, "div", "tp-subscription-heading");
      button(heading, t.title, () => new SubscriptionModal(this.plugin, t).open(), "tp-task-title");
      el(
        heading,
        "span",
        "tp-subscription-status",
        t.subscriptionActive ? this.w.activeSubscription : this.w.cancelledSubscription
      );
      const meta = el(body2, "div", "tp-task-meta");
      const nextPayment = nextPaymentDate(t, day());
      if (nextPayment) el(meta, "span", "", this.w.paymentDate + ": " + this.pretty(nextPayment));
      const project = this.plugin.repo.project(t.project);
      if (project) el(meta, "span", "", this.plugin.projectLabel(project));
      const price = el(row, "div", "tp-subscription-price");
      el(price, "strong", "", t.amount === null ? this.w.unpriced : money2(t.amount, t.currency));
      if (t.amount !== null)
        el(
          price,
          "span",
          "tp-muted",
          "/ " + (t.billingPeriod === "yearly" ? this.w.billingYear : this.w.billingMonth).toLocaleLowerCase()
        );
      const actions = el(row, "div", "tp-subscription-actions");
      button(
        actions,
        this.w.recordCharge,
        () => new ChargeModal(this.plugin, t).open(),
        "tp-text-button"
      );
      const toggle = button(
        actions,
        t.subscriptionActive ? this.w.subscriptionCancelAction : this.w.subscriptionResumeAction,
        () => {
          toggle.disabled = true;
          this.perform(async () => {
            try {
              await this.plugin.service.subscriptionActive(t, !t.subscriptionActive);
            } finally {
              toggle.disabled = false;
            }
          });
        },
        "tp-subscription-toggle"
      );
      stabilizeButton(toggle, [this.w.subscriptionCancelAction, this.w.subscriptionResumeAction]);
      const toggleLabel = t.subscriptionActive ? this.w.cancelSubscription : this.w.resumeSubscription;
      toggle.setAttribute("aria-label", toggleLabel);
      toggle.title = toggleLabel;
      iconButton(actions, "file-text", this.w.note, () => this.plugin.openNote(t.path));
      iconButton(
        actions,
        "trash-2",
        this.w.remove,
        () => new DeleteModal(this.plugin, {
          task: t,
          key: "",
          date: "",
          end: "",
          status: t.status,
          minutes: 0,
          recurring: false
        }).open()
      );
    }
    if (pages > 1) {
      const pager = el(this.main, "div", "tp-board-pager");
      const prev = button(pager, "\u2190", () => {
        this.limits.set("subscriptions", page - 1);
        this.render();
      });
      prev.disabled = page === 0;
      prev.setAttribute("aria-label", this.w.previousPage);
      el(pager, "span", "", `${page + 1} / ${pages}`);
      const next = button(pager, "\u2192", () => {
        this.limits.set("subscriptions", page + 1);
        this.render();
      });
      next.disabled = page === pages - 1;
      next.setAttribute("aria-label", this.w.nextPage);
    }
  }
  board(tasks) {
    const controls = el(this.main, "div", "tp-board-controls");
    const scope = select(
      controls,
      [
        ["today", this.w.today],
        ["week", this.w.week],
        ["month", this.w.month],
        ["all", this.w.allItems],
        ["undated", this.w.noDate]
      ],
      this.boardScope
    );
    scope.dataset.boardScope = "true";
    scope.setAttribute("aria-label", this.w.period);
    scope.addEventListener("change", () => {
      this.boardScope = scope.value;
      this.limits.clear();
      this.build();
      this.main.querySelector("[data-board-scope]")?.focus({ preventScroll: true });
    });
    const undated = tasks.filter((t) => !t.scheduled && !t.due).length;
    const noDate = button(controls, `${this.w.noDate} \xB7 ${undated}`, () => {
      this.boardScope = "undated";
      this.limits.clear();
      this.build();
    });
    noDate.setAttribute("aria-pressed", String(this.boardScope === "undated"));
    const itemsInScope = boardItems(tasks, day(), this.boardScope);
    el(controls, "small", "tp-muted", `${itemsInScope.length} / ${tasks.length}`);
    if (!["all", "undated"].includes(this.boardScope)) {
      const range2 = boardWindow(this.boardScope, day());
      el(
        controls,
        "span",
        "tp-muted tp-period-range tp-board-range",
        `${this.pretty(range2[0])} \u2014 ${this.pretty(range2[1])}`
      );
    }
    const board = el(this.main, "div", "tp-board");
    const groups = new Map(STATUSES.map((s) => [s, []]));
    for (const item of itemsInScope) groups.get(item.status).push(item);
    let dragged;
    const pageSize = 12;
    for (const status of STATUSES) {
      const items = groups.get(status);
      const column = el(board, "section", "tp-board-column");
      column.dataset.status = status;
      const heading = el(column, "div", "tp-board-heading");
      el(heading, "h2", "", this.w[status]);
      el(heading, "span", "tp-muted", String(items.length));
      button(
        heading,
        "+",
        () => new TaskModal(this.plugin, void 0, {
          project: this.project,
          status,
          scheduled: ["all", "undated"].includes(this.boardScope) ? "" : day()
        }).open()
      ).setAttribute("aria-label", `${this.w.add} \xB7 ${this.w[status]}`);
      const key = "board:" + status;
      const pages = Math.max(1, Math.ceil(items.length / pageSize));
      const page = Math.min(this.limits.get(key) || 0, pages - 1);
      this.limits.set(key, page);
      if (!items.length) el(column, "p", "tp-board-empty tp-muted", this.w.boardEmpty);
      for (const item of items.slice(page * pageSize, (page + 1) * pageSize)) {
        const card = el(column, "article", "tp-board-card tp-" + item.status);
        card.dataset.path = item.task.path;
        card.dataset.key = item.key;
        card.dataset.status = item.status;
        if (item.task.priority === "high") card.classList.add("tp-high-priority");
        const heading2 = el(card, "div", "tp-task-heading");
        button(
          heading2,
          item.task.title,
          () => new TaskModal(this.plugin, item).open(),
          "tp-board-title"
        );
        if (item.task.scheduledTime)
          el(card, "strong", "tp-appointment-time", item.task.scheduledTime);
        this.kindBadge(heading2, item.task.kind);
        if (item.task.priority === "high") this.priorityBadge(heading2);
        const project = this.plugin.repo.project(item.task.project);
        if (project) el(card, "small", "tp-muted", this.plugin.projectLabel(project));
        if (item.task.kind === "payment") {
          const value = expenseValue(item);
          el(
            card,
            "strong",
            "tp-payment-amount",
            value.amount === null ? this.w.unpriced : money(value.amount, value.currency, this.locale())
          );
        }
        if (item.status === "done" && item.task.kind !== "payment" && (item.task.plannedMinutes || item.minutes)) {
          const times = el(card, "div", "tp-task-meta tp-board-times");
          this.taskTimes(times, item);
        }
        if (item.task.description)
          el(card, "p", "tp-board-description", item.task.description.slice(0, 180));
        if (item.date)
          el(
            card,
            "small",
            isOverdue(item, day()) ? "tp-overdue-label" : "tp-muted",
            this.pretty(item.date) + (item.recurring ? " \xB7 \u21BB" : "") + (isOverdue(item, day()) ? " \xB7 " + this.w.overdue : "")
          );
        const until = recurrenceEnd(item.task.recurrence);
        if (until) el(card, "small", "tp-muted", `${this.w.repeatUntil}: ${this.pretty(until)}`);
        const exhausted = item.recurring && !item.key;
        if (exhausted) el(card, "small", "tp-muted", this.w.noOccurrence);
        const choice = select(
          card,
          STATUSES.map((s) => [
            s,
            item.task.kind === "payment" && s === "done" ? this.w.paymentDone : item.task.kind === "payment" && s === "failed" ? this.w.paymentFailed : this.w[s]
          ]),
          item.status
        );
        choice.setAttribute("aria-label", `${this.w.status} \xB7 ${item.task.title}`);
        choice.disabled = exhausted;
        choice.addEventListener("change", () => {
          const next = choice.value;
          choice.disabled = true;
          this.perform(async () => {
            try {
              await this.plugin.service.status(item, next);
            } finally {
              if (choice.isConnected) {
                choice.disabled = exhausted;
                choice.value = item.status;
              }
            }
          });
        });
        card.draggable = !exhausted;
        card.addEventListener("dragstart", (e) => {
          dragged = item;
          card.classList.add("tp-dragging");
          e.dataTransfer?.setData("text/plain", item.task.path);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
        });
        card.addEventListener("dragend", () => {
          dragged = void 0;
          card.classList.remove("tp-dragging");
          board.querySelectorAll(".tp-board-drop").forEach((n) => n.classList.remove("tp-board-drop"));
        });
      }
      column.addEventListener("dragover", (e) => {
        if (!dragged) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        column.classList.add("tp-board-drop");
      });
      column.addEventListener("dragleave", (e) => {
        if (!(e.relatedTarget instanceof column.ownerDocument.defaultView.Node) || !column.contains(e.relatedTarget))
          column.classList.remove("tp-board-drop");
      });
      column.addEventListener("drop", (e) => {
        if (!dragged) return;
        e.preventDefault();
        const item = dragged;
        dragged = void 0;
        column.classList.remove("tp-board-drop");
        if (item.status !== status) this.perform(() => this.plugin.service.status(item, status));
      });
      if (pages > 1) {
        const pager = el(column, "div", "tp-board-pager");
        pager.dataset.status = status;
        const prev = button(pager, "\u2190", () => {
          this.limits.set(key, page - 1);
          this.render();
        });
        prev.dataset.boardPage = status;
        prev.disabled = page === 0;
        prev.setAttribute("aria-label", `${this.w.boardPrev} \xB7 ${this.w[status]}`);
        el(pager, "small", "tp-muted", `${page + 1} / ${pages}`);
        const next = button(pager, "\u2192", () => {
          this.limits.set(key, page + 1);
          this.render();
        });
        next.dataset.boardPage = status;
        next.disabled = page === pages - 1;
        next.setAttribute("aria-label", `${this.w.boardNext} \xB7 ${this.w[status]}`);
      }
    }
  }
  kindBadge(parent, kind) {
    if (!["meeting", "payment", "status"].includes(kind)) return;
    const badge = el(parent, "span", "tp-kind-badge");
    badge.dataset.kind = kind;
    badge.title = this.w[kind];
    badge.setAttribute("role", "img");
    badge.setAttribute("aria-label", this.w[kind]);
    if (kind === "payment") badge.textContent = "$";
    else (0, import_obsidian5.setIcon)(badge, kind === "meeting" ? "users-round" : "flag");
  }
  priorityBadge(parent) {
    const badge = el(parent, "span", "tp-priority", "!");
    badge.title = this.w.highPriority;
    badge.setAttribute("role", "img");
    badge.setAttribute("aria-label", this.w.highPriority);
  }
  empty(parent = this.main) {
    el(parent, "div", "tp-empty", this.w.empty);
  }
  section(label, items, key, showEmpty = false, parent = this.main, total = items.length) {
    if (!items.length) {
      if (showEmpty) this.empty(parent);
      return;
    }
    const section = el(parent, "section", "tp-section");
    if (label) {
      const head = el(section, "div", "tp-section-heading");
      el(head, "h2", "", label);
      el(head, "span", "tp-count", String(total));
    }
    const limit = this.limits.get(key) || 60;
    const list = el(section, "div", "tp-task-list");
    for (const item of items.slice(0, limit)) this.row(list, item);
    if (total > limit)
      button(
        section,
        `${this.w.showMore} (${total - limit})`,
        () => {
          this.limits.set(key, limit + 60);
          this.render();
        },
        "tp-show-more"
      );
  }
  row(parent, item, compact = false) {
    const row = el(
      parent,
      "div",
      `tp-task tp-${item.status}${isOverdue(item, day()) ? " tp-overdue" : ""}${compact ? " tp-task-compact" : ""}`
    );
    row.dataset.path = item.task.path;
    row.dataset.key = item.key;
    row.dataset.status = item.status;
    row.dataset.date = item.date;
    if (item.task.priority === "high") row.classList.add("tp-high-priority");
    const payment = item.task.kind === "payment";
    const completeLabel = payment ? item.status === "done" ? this.w.removeCharge : item.status === "failed" ? this.w.returnToPlan : this.w.recordCharge : this.w.complete;
    const statusLabel = payment ? item.status === "done" ? this.w.paymentDone : item.status === "failed" ? this.w.paymentFailed : this.w.pendingPayment : this.w[item.status];
    const check = iconButton(
      row,
      item.status === "done" ? "check" : item.status === "failed" ? "x" : "circle",
      completeLabel,
      () => this.perform(
        () => this.plugin.service.status(item, isActive(item.status) ? "done" : "todo")
      ),
      "tp-check"
    );
    check.setAttribute("role", "checkbox");
    check.setAttribute("aria-checked", String(item.status === "done"));
    const exhausted = item.recurring && !item.key;
    check.disabled = exhausted;
    const body2 = el(row, "div", "tp-task-body");
    const heading = el(body2, "div", "tp-task-heading");
    const title2 = button(
      heading,
      item.task.title,
      () => new TaskModal(this.plugin, item).open(),
      "tp-task-title"
    );
    title2.title = item.task.title;
    this.kindBadge(heading, item.task.kind);
    if (item.task.priority === "high") this.priorityBadge(heading);
    if (item.task.description) {
      const details = el(heading, "span", "tp-description-icon");
      (0, import_obsidian5.setIcon)(details, "file-text");
      details.title = this.w.description;
      details.setAttribute("role", "img");
      details.setAttribute("aria-label", this.w.description);
    }
    const meta = el(body2, "div", "tp-task-meta");
    if (item.task.scheduledTime) el(meta, "strong", "tp-appointment-time", item.task.scheduledTime);
    const project = this.plugin.repo.project(item.task.project);
    if (project) el(meta, "span", "tp-project-label", this.plugin.projectLabel(project));
    else if (item.task.project) el(meta, "span", "", this.w.unresolved);
    if (project) title2.title += "\n" + this.plugin.projectLabel(project);
    if (compact && (item.task.scheduledTime || item.task.project)) {
      const context = el(row, "div", "tp-task-context");
      for (const label of [...meta.children]) context.appendChild(label);
      row.insertBefore(context, check);
    }
    if (isOverdue(item, day())) el(meta, "span", "tp-overdue-label", this.w.overdue);
    if (!compact && item.date)
      el(
        meta,
        "span",
        "",
        this.pretty(item.date) + (item.end && item.end !== item.date ? " \u2192 " + this.pretty(item.end) : "")
      );
    if (item.calendarRole === "work" && item.task.due && item.date !== item.task.due)
      el(meta, "span", "tp-deadline-label", `${this.w.deadline}: ${this.pretty(item.task.due)}`);
    this.taskTimes(meta, item);
    if (item.recurring)
      el(
        meta,
        "span",
        "",
        item.task.seriesEnd || !isActive(item.task.status) ? "\u21BB " + this.w.stopped : "\u21BB"
      );
    const until = recurrenceEnd(item.task.recurrence);
    if (until && !compact)
      el(meta, "span", "tp-repeat-end-label", `${this.w.repeatUntil}: ${this.pretty(until)}`);
    if (exhausted) el(meta, "span", "", this.w.noOccurrence);
    if (item.task.kind === "payment") {
      const value = expenseValue(item);
      el(
        meta,
        "strong",
        "tp-payment-amount",
        value.amount === null ? this.w.unpriced : money(value.amount, value.currency, this.locale())
      );
    }
    el(meta, "span", "tp-workflow-label" + (compact ? " tp-visually-hidden" : ""), statusLabel);
    if (compact) check.title = `${statusLabel} \xB7 ${completeLabel}`;
    const actions = el(row, "div", "tp-task-actions");
    const fail = iconButton(
      actions,
      "circle-x",
      payment ? item.status === "failed" ? this.w.returnToPlan : this.w.markPaymentFailed : this.w.fail,
      () => this.perform(
        () => this.plugin.service.status(item, item.status === "failed" ? "todo" : "failed")
      ),
      "tp-fail-button"
    );
    fail.disabled = exhausted;
    const move = iconButton(
      actions,
      "calendar-days",
      this.w.reschedule,
      () => new MoveModal(this.plugin, item).open()
    );
    move.disabled = exhausted;
    if (!compact)
      iconButton(actions, "file-text", this.w.note, () => this.plugin.openNote(item.task.path));
    iconButton(
      actions,
      "trash-2",
      this.w.remove,
      () => new DeleteModal(this.plugin, item).open(),
      "tp-delete-button"
    );
    row.draggable = !exhausted;
    row.addEventListener("dragstart", (e) => {
      this.drag = { item, source: row };
      e.dataTransfer?.setData(
        "application/x-tiny-planner",
        JSON.stringify({ path: item.task.path, key: item.key, date: item.date })
      );
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      row.classList.add("tp-dragging");
    });
    row.addEventListener("dragend", () => this.endDrag());
    return row;
  }
  cancelMonth() {
    if (this.monthTimer) {
      this.contentEl.ownerDocument.defaultView?.clearTimeout(this.monthTimer);
      this.monthTimer = void 0;
    }
  }
  endDrag() {
    this.cancelMonth();
    this.drag = void 0;
    this.stash.replaceChildren();
    this.main.querySelectorAll(".tp-calendar-retained").forEach((n) => n.remove());
    this.main.querySelectorAll(".tp-drop-target").forEach((n) => n.classList.remove("tp-drop-target"));
  }
  calendar(tasks, subscriptions) {
    this.main.classList.add("tp-has-calendar");
    const pageContent = this.main.closest(".tp-content");
    pageContent?.classList.toggle("tp-calendar-mode-day", this.calendarView === "day");
    const surface = el(this.main, "section", "tp-calendar-surface");
    surface.classList.toggle("tp-calendar-mode-day", this.calendarView === "day");
    const toolbar = el(surface, "div", "tp-calendar-toolbar");
    el(toolbar, "span", "tp-calendar-caption", this.w.calendar);
    const change = (amount) => {
      if (this.calendarView === "month") {
        this.month = shiftMonth(this.month, amount);
        this.calendarFocus = this.month;
      } else {
        this.calendarFocus = addDays(
          this.calendarFocus,
          amount * (this.calendarView === "week" ? 7 : 1)
        );
        this.month = this.calendarFocus.slice(0, 7) + "-01";
      }
      this.render();
    };
    const navigation = el(toolbar, "div", "tp-calendar-navigation");
    const previous = iconButton(navigation, "chevron-left", this.w.previous, () => change(-1));
    const dates = calendarDays(this.calendarView, this.calendarFocus, this.month);
    const title2 = this.calendarView === "month" ? new Intl.DateTimeFormat(this.locale(), {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(utc(this.month)) : this.calendarView === "day" ? this.pretty(this.calendarFocus) : `${this.pretty(dates[0])} \u2014 ${this.pretty(dates.at(-1))}`;
    el(navigation, "h2", "", title2);
    const next = iconButton(navigation, "chevron-right", this.w.next, () => change(1));
    const current = button(
      toolbar,
      this.calendarView === "month" ? this.w.thisMonth : this.w.currentPeriod,
      () => {
        this.calendarFocus = day();
        this.month = day().slice(0, 7) + "-01";
        this.render();
      }
    );
    stabilizeButton(current, [this.w.thisMonth, this.w.currentPeriod]);
    const controls = el(this.main, "div", "tp-calendar-controls");
    const views = el(controls, "div", "tp-calendar-views");
    views.setAttribute("role", "group");
    views.setAttribute("aria-label", this.w.calendar);
    for (const [view, label] of [
      ["day", this.w.calendarDay],
      ["week", this.w.calendarWeek],
      ["month", this.w.calendarMonth]
    ]) {
      const b = button(views, label, () => {
        if (this.calendarFocus.slice(0, 7) !== this.month.slice(0, 7))
          this.calendarFocus = this.month;
        this.calendarView = view;
        this.render();
        this.main.querySelector(`[data-calendar-view=${view}]`)?.focus({ preventScroll: true });
      });
      b.dataset.calendarView = view;
      b.setAttribute("aria-pressed", String(this.calendarView === view));
    }
    const visibility = el(controls, "div", "tp-calendar-visibility");
    const hide = button(
      visibility,
      this.hideCalendarDone ? this.w.showCompleted : this.w.hideCompleted,
      () => {
        this.hideCalendarDone = !this.hideCalendarDone;
        this.render();
        this.main.querySelector("[data-calendar-hide-done]")?.focus({ preventScroll: true });
      }
    );
    stabilizeButton(hide, [this.w.hideCompleted, this.w.showCompleted]);
    hide.dataset.calendarHideDone = "true";
    hide.setAttribute("aria-pressed", String(this.hideCalendarDone));
    const recurring = button(
      visibility,
      this.hideCalendarRecurring ? this.w.showRecurring : this.w.hideRecurring,
      () => {
        this.hideCalendarRecurring = !this.hideCalendarRecurring;
        this.render();
        this.main.querySelector("[data-calendar-hide-recurring]")?.focus({ preventScroll: true });
      }
    );
    stabilizeButton(recurring, [this.w.hideRecurring, this.w.showRecurring]);
    recurring.dataset.calendarHideRecurring = "true";
    recurring.setAttribute("aria-pressed", String(this.hideCalendarRecurring));
    for (const [target, amount] of [
      [previous, -1],
      [next, 1]
    ]) {
      target.addEventListener("dragover", (e) => {
        if (this.drag) {
          e.preventDefault();
          if (!this.monthTimer)
            this.monthTimer = this.contentEl.ownerDocument.defaultView?.setTimeout(() => {
              this.monthTimer = void 0;
              change(amount);
            }, 650);
        }
      });
      target.addEventListener("dragleave", () => this.cancelMonth());
    }
    this.workloadPanel(
      tasks,
      dates.filter(
        (d) => this.calendarView !== "month" || d.slice(0, 7) === this.month.slice(0, 7)
      )
    );
    const grouped = new Map(dates.map((d) => [d, []]));
    for (const task of tasks.filter((t) => !this.hideCalendarRecurring || !t.recurrence))
      for (const item of calendarItems(task, dates[0], dates.at(-1))) {
        if (this.hideCalendarDone && item.status === "done") continue;
        grouped.get(item.date)?.push(item);
      }
    const grid = el(this.main, "div", `tp-calendar-grid tp-calendar-${this.calendarView}-view`);
    surface.appendChild(grid);
    this.main.appendChild(surface);
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", this.w.calendar);
    for (let i = 0; i < (this.calendarView === "day" ? 0 : 7); i++)
      el(
        grid,
        "div",
        "tp-weekday",
        new Intl.DateTimeFormat(this.locale(), { weekday: "short", timeZone: "UTC" }).format(
          utc(this.calendarView === "day" ? this.calendarFocus : addDays("2026-09-28", i))
        )
      );
    const projects = this.plugin.repo.snapshot().projects.filter(
      (p) => isActive(p.status) && (!this.area || p.area === this.area) && (!this.project || p.path === this.project) && (!this.query || this.plugin.projectLabel(p).toLocaleLowerCase().includes(this.query.toLocaleLowerCase()))
    );
    for (const date of dates) {
      const cell = el(
        grid,
        "div",
        "tp-day" + (date.slice(0, 7) !== this.month.slice(0, 7) ? " tp-outside" : "") + (date === day() ? " tp-day-today" : "")
      );
      cell.dataset.day = date;
      cell.setAttribute("role", "group");
      cell.setAttribute("aria-label", date);
      const dayHeading = el(cell, "div", "tp-day-heading");
      const dateButton = button(
        dayHeading,
        this.calendarView === "day" ? new Intl.DateTimeFormat(this.locale(), {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "UTC"
        }).format(utc(date)) : String(Number(date.slice(8))),
        () => new TaskModal(this.plugin, void 0, { scheduled: date, project: this.project }).open(),
        "tp-day-number"
      );
      dateButton.title = this.w.add + " \xB7 " + date;
      dateButton.setAttribute("aria-label", dateButton.title);
      const load = dayLoad(tasks, date, this.plugin.settings.dailyCapacityMinutes ?? 480);
      if (this.calendarView !== "day" && (load.minutes || load.unestimated)) {
        const summary = el(dayHeading, "div", "tp-day-load");
        if (load.minutes) el(summary, "span", "tp-day-duration", this.duration(load.minutes));
        if (load.unestimated) {
          const unknown = el(summary, "span", "tp-day-unestimated", `?${load.unestimated}`);
          unknown.title = `${this.w.unestimated}: ${load.unestimated}`;
          unknown.setAttribute("aria-label", unknown.title);
        }
        summary.classList.toggle("tp-load-over", load.over);
      }
      const deadlines = projects.filter((p) => p.due === date);
      for (const project of deadlines)
        button(
          cell,
          project.title,
          () => new EntityModal(this.plugin, "project", project).open(),
          "tp-calendar-project"
        );
      const rank = (status) => status === "done" ? 0 : status === "failed" ? 1 : 2;
      const items = sortItems(grouped.get(date), true).sort(
        (a, b) => rank(a.status) - rank(b.status)
      );
      for (const item of items.filter((i) => i.calendarRole !== "deadline"))
        this.row(cell, item, true);
      const payments = subscriptions.filter((t) => paymentOn(t, date)).sort((a, b) => a.title.localeCompare(b.title) || a.path.localeCompare(b.path));
      if (payments.length) {
        const billing = el(cell, "section", "tp-calendar-billing");
        billing.setAttribute("aria-label", this.w.subscriptions);
        el(billing, "h3", "", this.w.subscriptions);
        for (const t of payments) this.calendarPayment(billing, t, date);
      }
      cell.addEventListener("dragover", (e) => {
        if (this.drag) {
          e.preventDefault();
          this.cancelMonth();
          cell.classList.add("tp-drop-target");
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        }
      });
      cell.addEventListener("dragleave", (e) => {
        if (!cell.contains(e.relatedTarget)) cell.classList.remove("tp-drop-target");
      });
      cell.addEventListener("drop", (e) => {
        e.preventDefault();
        const item = this.drag?.item;
        this.endDrag();
        if (item) this.perform(() => this.plugin.service.move(item, date));
      });
      const longTasks = items.filter((i) => i.calendarRole === "deadline");
      for (const item of longTasks) {
        const row = this.row(cell, item, true);
        row.classList.add("tp-calendar-long-task", "tp-calendar-deadline");
        row.classList.toggle("tp-calendar-long-first", item === longTasks[0]);
        row.dataset.from = item.date;
        row.dataset.to = item.end;
        const range2 = `${this.w.deadline}: ${this.pretty(item.task.due)}`;
        row.title = `${item.task.title} \xB7 ${range2} \xB7 ${this.expenseProject(item.task)}`;
        row.querySelector(".tp-task-title").title = row.title;
        el(row.querySelector(".tp-task-meta"), "span", "tp-range-dates", range2);
      }
    }
  }
  calendarPayment(parent, task, date) {
    const payment = button(
      parent,
      "",
      () => new SubscriptionModal(this.plugin, task).open(),
      "tp-calendar-payment"
    );
    payment.dataset.path = task.path;
    el(payment, "span", "tp-payment-title", task.title);
    const amount = task.amount === null ? this.w.unpriced : new Intl.NumberFormat(this.locale(), {
      style: "currency",
      currency: task.currency,
      currencyDisplay: "code",
      maximumFractionDigits: 2
    }).format(task.amount);
    el(payment, "strong", "", amount);
    payment.title = `${task.title} \xB7 ${amount} \xB7 ${this.pretty(date)}`;
    payment.setAttribute("aria-label", payment.title);
  }
  projects(tasks) {
    const snap = this.plugin.repo.snapshot();
    const groups = /* @__PURE__ */ new Map();
    const byProject = /* @__PURE__ */ new Map();
    for (const task of tasks) {
      const group = byProject.get(task.project) || [];
      group.push(task);
      byProject.set(task.project, group);
    }
    for (const project of snap.projects) {
      if (this.area && project.area !== this.area || this.project && project.path !== this.project)
        continue;
      if (this.query && !byProject.has(project.path) && !this.plugin.projectLabel(project).toLocaleLowerCase().includes(this.query.toLocaleLowerCase()))
        continue;
      const g = groups.get(project.area) || [];
      g.push(project);
      groups.set(project.area, g);
    }
    const areaNames = new Map(snap.areas.map((a) => [a.path, a.title]));
    for (const area of snap.areas) {
      if ((!this.area || area.path === this.area) && !groups.has(area.path) && !this.query && !this.project)
        groups.set(area.path, []);
    }
    for (const [area, projects] of groups) {
      const areaSection = el(this.main, "section", "tp-area");
      const heading = el(areaSection, "div", "tp-section-heading");
      el(heading, "h2", "", areaNames.get(area) || this.w.noArea);
      const entity = snap.areas.find((a) => a.path === area);
      if (entity)
        iconButton(
          heading,
          "pencil",
          this.w.editEntity,
          () => new EntityModal(this.plugin, "area", entity).open()
        );
      if (!projects.length) el(areaSection, "p", "tp-muted", this.w.addProject);
      const sorted = projects.sort((a, b) => a.title.localeCompare(b.title));
      const groupKey = "area:" + area;
      const groupLimit = this.limits.get(groupKey) || 30;
      for (const project of sorted.slice(0, groupLimit)) {
        const own = byProject.get(project.path) || [];
        const finite = own.filter((t) => !isSeries(t) && t.kind !== "payment");
        const done = finite.filter((t) => t.status === "done").length;
        const failed = finite.filter((t) => t.status === "failed").length;
        const card = el(areaSection, "details", "tp-project");
        card.dataset.path = project.path;
        card.open = this.projectOpen.get(project.path) ?? this.project === project.path;
        const summary = el(card, "summary", "tp-project-summary");
        el(summary, "strong", "", project.title);
        el(
          summary,
          "span",
          "tp-muted",
          `${done}/${finite.length} \xB7 ${this.w.failed}: ${failed} \xB7 ${this.w[project.status]}`
        );
        const content = el(card, "div", "tp-project-content");
        const populate = () => {
          content.replaceChildren();
          if (!card.open) return;
          const tools = el(content, "div", "tp-project-tools");
          button(
            tools,
            this.w.add,
            () => new TaskModal(this.plugin, void 0, { project: project.path }).open()
          );
          button(tools, this.w.kanban, () => {
            this.project = project.path;
            this.tab = "kanban";
            this.limits.clear();
            this.build();
          });
          iconButton(
            tools,
            "pencil",
            this.w.editEntity,
            () => new EntityModal(this.plugin, "project", project).open()
          );
          const minutes = own.reduce(
            (n, t) => Math.min(Number.MAX_SAFE_INTEGER, n + loggedMinutes(t)),
            0
          );
          if (minutes) el(tools, "small", "tp-muted", `${minutes} ${this.w.minuteUnit}`);
          this.section(
            "",
            sortItems(own.map((t) => taskItem(t, day()))),
            project.path,
            true,
            content
          );
        };
        populate();
        card.addEventListener("toggle", () => {
          if (!card.isConnected) return;
          this.projectOpen.set(project.path, card.open);
          populate();
        });
      }
      if (sorted.length > groupLimit)
        button(
          areaSection,
          `${this.w.showMore} (${sorted.length - groupLimit})`,
          () => {
            this.limits.set(groupKey, groupLimit + 30);
            this.render();
          },
          "tp-show-more"
        );
    }
    const projectPaths = new Set(snap.projects.map((p) => p.path));
    const inbox = tasks.filter((t) => !t.project || !projectPaths.has(t.project));
    if (inbox.length)
      this.section(this.w.inbox, sortItems(inbox.map((t) => taskItem(t, day()))), "project-inbox");
    if (!this.main.childElementCount) this.empty();
  }
};

// src/main.ts
var TinyPlanner = class extends import_obsidian6.Plugin {
  settings = {
    folder: "Planner",
    language: "ru",
    dateFormat: "dmy",
    dailyCapacityMinutes: 480,
    uiScalePercent: 100
  };
  repo;
  service;
  importer;
  async onload() {
    const raw = await this.loadData();
    const saved = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    this.settings = {
      folder: typeof saved.folder === "string" ? saved.folder : "Planner",
      language: saved.language === "en" ? "en" : "ru",
      dailyCapacityMinutes: typeof saved.dailyCapacityMinutes === "number" && Number.isFinite(saved.dailyCapacityMinutes) ? Math.min(1440, Math.max(0, Math.round(saved.dailyCapacityMinutes))) : 480,
      dateFormat: saved.dateFormat === "dmy" || saved.dateFormat === "mdy" || saved.dateFormat === "iso" ? saved.dateFormat : "dmy",
      uiScalePercent: this.normalizeUiScale(saved.uiScalePercent)
    };
    this.applyAppearance();
    this.repo = new Repository(this.app);
    this.service = new TaskService(this.app, this.repo, () => this.settings.folder);
    this.importer = new LegacyImporter(this.app, this.repo, this.service);
    this.registerView(VIEW_TYPE, (leaf) => new PlannerView(leaf, this));
    this.addRibbonIcon("calendar-check", "Tiny Planner", () => void this.open());
    this.registerCommands();
    this.addSettingTab(new PlannerSettingsTab(this));
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof import_obsidian6.TFile && file.extension === "md")
          void this.repo.refresh(file).catch((e) => this.error(e));
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof import_obsidian6.TFile && file.extension === "md")
          void this.repo.refresh(file).catch((e) => this.error(e));
      })
    );
    this.registerEvent(
      this.app.vault.on(
        "delete",
        (file) => this.repo.remove(file.path, true, file instanceof import_obsidian6.TFolder)
      )
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, old) => {
        this.repo.remove(old, true, file instanceof import_obsidian6.TFolder);
        if (file instanceof import_obsidian6.TFile && file.extension === "md")
          void this.repo.refresh(file).catch((e) => this.error(e));
        else if (file instanceof import_obsidian6.TFolder) void this.repo.load().catch((e) => this.error(e));
      })
    );
    this.app.workspace.onLayoutReady(() => void this.repo.load().catch((e) => this.error(e)));
    let today = (/* @__PURE__ */ new Date()).toDateString();
    this.registerInterval(
      window.setInterval(() => {
        const now = (/* @__PURE__ */ new Date()).toDateString();
        if (now !== today) {
          today = now;
          this.repo.emit();
        }
      }, 3e4)
    );
  }
  commandsRegistered = false;
  normalizeUiScale(value) {
    if (value == null || value === "") return 100;
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(115, Math.max(85, Math.round(n))) : 100;
  }
  applyAppearance() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))
      if (leaf.view instanceof PlannerView)
        leaf.view.contentEl.style.setProperty(
          "--tp-ui-scale",
          String(this.normalizeUiScale(this.settings.uiScalePercent) / 100)
        );
  }
  registerCommands() {
    const w = words(this.settings.language);
    const commands = [
      { id: "open-planner", name: w.openPlanner, callback: () => void this.open() },
      { id: "quick-add-task", name: w.add, callback: () => new TaskModal(this).open() },
      {
        id: "add-subscription",
        name: w.addSubscription,
        callback: () => new SubscriptionModal(this).open()
      },
      { id: "import-legacy", name: w.import, callback: () => new ImportModal(this).open() },
      {
        id: "undo-last-change",
        name: w.undoCommand,
        callback: () => void this.service.undo().catch((e) => this.error(e))
      }
    ];
    for (const command of commands) {
      if (this.commandsRegistered) this.removeCommand(command.id);
      this.addCommand(command);
    }
    this.commandsRegistered = true;
  }
  error(e) {
    console.error("[Tiny Planner]", e);
    new import_obsidian6.Notice(messageText(e instanceof Error ? e.message : String(e), this.settings.language));
  }
  async open() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
  openNote(path) {
    void this.app.workspace.openLinkText(path, "", false).catch((e) => this.error(e));
  }
  compareProjects(a, b) {
    return this.projectLabel(a).localeCompare(this.projectLabel(b), this.settings.language, {
      numeric: true,
      sensitivity: "base"
    }) || a.path.localeCompare(b.path);
  }
  projectLabel(p) {
    const area = this.repo.areaTitle(p.area);
    return area ? `${area} / ${p.title}` : p.title;
  }
};
var PlannerSettingsTab = class extends import_obsidian6.PluginSettingTab {
  constructor(planner) {
    super(planner.app, planner);
    this.planner = planner;
  }
  /** Searchable settings for Obsidian 1.13+, while display() remains for 1.7.2–1.12. */
  getSettingDefinitions() {
    const w = words(this.planner.settings.language);
    const refreshViews = () => {
      for (const leaf of this.planner.app.workspace.getLeavesOfType(VIEW_TYPE))
        if (leaf.view instanceof PlannerView) leaf.view.rebuild();
    };
    return [
      {
        name: w.folder,
        desc: w.folderHelp,
        render: (setting) => {
          setting.addText(
            (field2) => field2.setValue(this.planner.settings.folder).onChange(async (value) => {
              const path = (0, import_obsidian6.normalizePath)(value.trim());
              if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part.startsWith(".")))
                return;
              this.planner.settings.folder = path;
              await this.planner.saveData(this.planner.settings);
            })
          );
        }
      },
      {
        name: w.language,
        render: (setting) => {
          setting.addDropdown(
            (dropdown) => dropdown.addOptions({ ru: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", en: "English" }).setValue(this.planner.settings.language).onChange(async (value) => {
              this.planner.settings.language = value === "en" ? "en" : "ru";
              this.planner.registerCommands();
              await this.planner.saveData(this.planner.settings);
              refreshViews();
              this.update();
            })
          );
        }
      },
      {
        name: w.dateFormat,
        desc: w.dateFormatHelp,
        render: (setting) => {
          setting.addDropdown(
            (dropdown) => dropdown.addOptions({ dmy: "DD.MM.YYYY", mdy: "MM/DD/YYYY", iso: "YYYY-MM-DD" }).setValue(this.planner.settings.dateFormat).onChange(async (value) => {
              if (value !== "dmy" && value !== "mdy" && value !== "iso") return;
              this.planner.settings.dateFormat = value;
              await this.planner.saveData(this.planner.settings);
              refreshViews();
            })
          );
        }
      },
      {
        name: w.capacity,
        render: (setting) => {
          setting.addText(
            (field2) => field2.setValue(String(this.planner.settings.dailyCapacityMinutes ?? 480)).onChange(async (value) => {
              const n = Number(value);
              if (!value.trim() || !Number.isFinite(n) || n < 0 || n > 1440) return;
              this.planner.settings.dailyCapacityMinutes = Math.round(n);
              await this.planner.saveData(this.planner.settings);
              refreshViews();
            })
          );
        }
      },
      {
        name: w.uiScale,
        desc: w.uiScaleHelp,
        render: (setting) => {
          setting.addDropdown(
            (dropdown) => dropdown.addOptions({
              "85": "85%",
              "90": "90%",
              "95": "95%",
              "100": "100%",
              "105": "105%",
              "110": "110%",
              "115": "115%"
            }).setValue(String(this.planner.settings.uiScalePercent ?? 100)).onChange(async (value) => {
              this.planner.settings.uiScalePercent = this.planner.normalizeUiScale(value);
              this.planner.applyAppearance();
              await this.planner.saveData(this.planner.settings);
              refreshViews();
            })
          );
        }
      },
      {
        name: w.import,
        desc: w.importText,
        render: (setting) => {
          setting.addButton(
            (button2) => button2.setButtonText(w.importStart).onClick(() => new ImportModal(this.planner).open())
          );
        }
      }
    ];
  }
  display() {
    const w = words(this.planner.settings.language);
    this.containerEl.replaceChildren();
    new import_obsidian6.Setting(this.containerEl).setName(w.folder).setDesc(w.folderHelp).addText(
      (text) => text.setValue(this.planner.settings.folder).onChange(async (value) => {
        const path = (0, import_obsidian6.normalizePath)(value.trim());
        if (!path || path.startsWith("/") || path.split("/").some((p) => p === ".." || p.startsWith(".")))
          return;
        this.planner.settings.folder = path;
        await this.planner.saveData(this.planner.settings);
      })
    );
    new import_obsidian6.Setting(this.containerEl).setName(w.language).addDropdown(
      (d) => d.addOptions({ ru: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", en: "English" }).setValue(this.planner.settings.language).onChange(async (value) => {
        this.planner.settings.language = value === "en" ? "en" : "ru";
        this.planner.registerCommands();
        await this.planner.saveData(this.planner.settings);
        for (const leaf of this.planner.app.workspace.getLeavesOfType(VIEW_TYPE))
          if (leaf.view instanceof PlannerView) leaf.view.rebuild();
        this.display();
      })
    );
    new import_obsidian6.Setting(this.containerEl).setName(w.dateFormat).setDesc(w.dateFormatHelp).addDropdown(
      (d) => d.addOptions({ dmy: "DD.MM.YYYY", mdy: "MM/DD/YYYY", iso: "YYYY-MM-DD" }).setValue(this.planner.settings.dateFormat).onChange(async (value) => {
        if (!["dmy", "mdy", "iso"].includes(value)) return;
        this.planner.settings.dateFormat = value;
        await this.planner.saveData(this.planner.settings);
        for (const leaf of this.planner.app.workspace.getLeavesOfType(VIEW_TYPE))
          if (leaf.view instanceof PlannerView) leaf.view.rebuild();
      })
    );
    new import_obsidian6.Setting(this.containerEl).setName(w.capacity).addText(
      (text) => text.setValue(String(this.planner.settings.dailyCapacityMinutes ?? 480)).onChange(async (value) => {
        const n = Number(value);
        if (!value.trim() || !Number.isFinite(n) || n < 0 || n > 1440) return;
        this.planner.settings.dailyCapacityMinutes = Math.round(n);
        await this.planner.saveData(this.planner.settings);
        for (const leaf of this.planner.app.workspace.getLeavesOfType(VIEW_TYPE))
          if (leaf.view instanceof PlannerView) leaf.view.rebuild();
      })
    );
    new import_obsidian6.Setting(this.containerEl).setName(w.uiScale).setDesc(w.uiScaleHelp).addDropdown(
      (d) => d.addOptions({
        "85": "85%",
        "90": "90%",
        "95": "95%",
        "100": "100%",
        "105": "105%",
        "110": "110%",
        "115": "115%"
      }).setValue(String(this.planner.settings.uiScalePercent ?? 100)).onChange(async (value) => {
        this.planner.settings.uiScalePercent = this.planner.normalizeUiScale(value);
        this.planner.applyAppearance();
        await this.planner.saveData(this.planner.settings);
        for (const leaf of this.planner.app.workspace.getLeavesOfType(VIEW_TYPE))
          if (leaf.view instanceof PlannerView) leaf.view.rebuild();
      })
    );
    new import_obsidian6.Setting(this.containerEl).setName(w.import).setDesc(w.importText).addButton(
      (b) => b.setButtonText(w.importStart).onClick(() => new ImportModal(this.planner).open())
    );
  }
};
