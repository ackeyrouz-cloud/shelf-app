import { supabase } from './supabase';
import { localDateString } from './mealLogs';

function addDays(date, delta) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

// A streak counts consecutive logged days ending today OR yesterday — if
// today hasn't been logged yet, the streak still shows as of yesterday
// rather than dropping to 0 the instant midnight passes with nothing
// logged yet. It only actually breaks once a full day is skipped.
export function computeStreak(logDates, today = new Date()) {
  const daySet = new Set(logDates);
  const todayStr = localDateString(today);
  const yesterdayStr = localDateString(addDays(today, -1));

  let cursor;
  if (daySet.has(todayStr)) {
    cursor = today;
  } else if (daySet.has(yesterdayStr)) {
    cursor = addDays(today, -1);
  } else {
    return 0;
  }

  let count = 0;
  while (daySet.has(localDateString(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// Meal-logging streak specifically (not water, not any other daily metric)
// — the data already exists on meal_logs.log_date, no new schema needed.
// Fetches recent log_date values (capped, not a full-table scan) and
// dedupes client-side rather than needing a server-side DISTINCT query for
// what's realistically a small per-user row count.
export async function getLoggingStreak() {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('log_date')
    .order('log_date', { ascending: false })
    .limit(1000);
  if (error) return { streak: 0, error };
  return { streak: computeStreak(data.map((r) => r.log_date)), error: null };
}
