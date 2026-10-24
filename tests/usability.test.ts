import test from 'node:test';
import assert from 'node:assert/strict';
import { simpleSchedule, scheduleRule, repeatPreview } from '../src/ui/repeat-editor';
import { formDrafts, plannerState } from '../src/ui/state';
test('simple schedule preserves COUNT and exact UNTIL, while advanced rules remain in RRULE mode', () => {
  const original = 'FREQ=WEEKLY;BYDAY=MO,TH;INTERVAL=2;COUNT=3;UNTIL=20261230T120000Z';
  assert.equal(scheduleRule(simpleSchedule(original)!, original), original);
  assert.deepEqual(repeatPreview(original, '2026-10-05'), [
    '2026-10-05',
    '2026-10-08',
    '2026-10-19',
  ]);
  assert.equal(simpleSchedule('FREQ=MONTHLY;BYDAY=2MO'), undefined);
  assert.equal(simpleSchedule('FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=20'), undefined);
  assert.throws(() => scheduleRule({ frequency: 'WEEKLY', interval: 0, days: [], count: '' }));
  assert.deepEqual(repeatPreview('FREQ=DAILY;UNTIL=20261005T235959Z', '2026-10-05'), [
    '2026-10-05',
  ]);
});
test('persisted state and drafts reject malformed values and bound retained data', () => {
  assert.equal(plannerState(null).tab, 'today');
  assert.equal(
    plannerState({ tab: 'calendar', query: 'x'.repeat(2000), sidebarCollapsed: 'true' }).query
      .length,
    1000,
  );
  assert.equal(plannerState({ sidebarCollapsed: 'true' }).sidebarCollapsed, false);
  const drafts = formDrafts(
    Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [
        `form:${i}`,
        {
          baseline: '',
          values: { title: 'Saved', description: 'x'.repeat(100001) },
          dateFormat: 'iso',
        },
      ]),
    ),
  );
  assert.equal(Object.keys(drafts).length, 20);
  assert.equal(drafts['form:39']?.values.title, 'Saved');
  assert.equal(drafts['form:39']?.values.description, undefined);
  assert.deepEqual(formDrafts({ 'not-a-draft': {}, 'form:bad': { baseline: 123 } }), {});
});
