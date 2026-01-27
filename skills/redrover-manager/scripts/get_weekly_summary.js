#!/usr/bin/env bun

// Get weekly absence summary and trends from Red Rover
// Usage: bun get_weekly_summary.js [weeks_ago]
//
// Options:
//   - 0 = this week (default)
//   - 1 = last week
//   - 2 = two weeks ago

const { SECRETS } = require('../../../scripts/secrets.js');

const { username, password } = SECRETS.redrover;
const baseUrl = 'https://connect.redroverk12.com';
const authString = Buffer.from(`${username}:${password}`).toString('base64');

// Calculate week date range (Monday to Friday for school week)
function getWeekRange(weeksAgo = 0) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Find Monday of current week
  const monday = new Date(now);
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  monday.setDate(monday.getDate() - daysFromMonday);

  // Go back the specified number of weeks
  monday.setDate(monday.getDate() - weeksAgo * 7);

  // Friday of that week
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);

  const formatDate = d => d.toISOString().split('T')[0];
  const formatLabel = d =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    start: formatDate(monday),
    end: formatDate(friday),
    label:
      weeksAgo === 0
        ? 'this week'
        : weeksAgo === 1
          ? 'last week'
          : `${weeksAgo} weeks ago`,
    rangeLabel: `${formatLabel(monday)}-${formatLabel(friday)}, ${monday.getFullYear()}`,
  };
}

// Get organization info (includes dynamic apiKey)
async function getOrganization() {
  const response = await fetch(`${baseUrl}/api/v1/organization`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get organization: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Fetch vacancy details for a date range
async function getVacancyDetails(orgId, apiKey, startDate, endDate) {
  const url = new URL(`${baseUrl}/api/v1/${orgId}/Vacancy/details`);
  url.searchParams.set('fromDate', `${startDate}T00:00:00Z`);
  url.searchParams.set('toDate', `${endDate}T23:59:59Z`);
  url.searchParams.set('pageSize', '100');

  let allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    url.searchParams.set('page', String(page));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${authString}`,
        apiKey: apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `API error ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    allData = allData.concat(result.data || []);
    hasMore = result.hasMoreData;
    page++;
  }

  return { data: allData };
}

// Build weekly summary from vacancy data
function buildWeeklySummary(vacancies, weekRange) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const summary = {
    week: weekRange.rangeLabel,
    week_label: weekRange.label,
    date_range: {
      start: weekRange.start,
      end: weekRange.end,
    },
    total_absences: vacancies.length,
    daily_average: 0,
    filled: 0,
    unfilled: 0,
    fill_rate: 0,
    peak_day: null,
    slow_day: null,
    by_day: {},
    by_school: {},
    by_reason: {},
    by_position_type: {},
    daily_details: {},
    trends: [],
  };

  // Initialize days
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
    summary.by_day[day] = 0;
    summary.daily_details[day] = { total: 0, filled: 0, unfilled: 0 };
  }

  for (const v of vacancies) {
    // Get day of week from start time
    const startDate = new Date(v.start);
    const dayOfWeek = dayNames[startDate.getDay()];

    // Count by day (skip weekends)
    if (summary.by_day.hasOwnProperty(dayOfWeek)) {
      summary.by_day[dayOfWeek]++;
      summary.daily_details[dayOfWeek].total++;
    }

    // Count filled vs unfilled
    const isFilled = !!v.substitute;
    if (isFilled) {
      summary.filled++;
      if (summary.daily_details[dayOfWeek]) {
        summary.daily_details[dayOfWeek].filled++;
      }
    } else {
      summary.unfilled++;
      if (summary.daily_details[dayOfWeek]) {
        summary.daily_details[dayOfWeek].unfilled++;
      }
    }

    // Group by school
    const school = v.location?.name || 'Unknown';
    summary.by_school[school] = (summary.by_school[school] || 0) + 1;

    // Group by reason
    const reason = v.absenceDetail?.reasons?.[0]?.name || 'Unknown';
    summary.by_reason[reason] = (summary.by_reason[reason] || 0) + 1;

    // Group by position type
    const posType = v.position?.positionType?.name || 'Unknown';
    summary.by_position_type[posType] = (summary.by_position_type[posType] || 0) + 1;
  }

  // Calculate statistics
  const schoolDays = 5;
  summary.daily_average = Math.round((summary.total_absences / schoolDays) * 10) / 10;
  summary.fill_rate =
    summary.total_absences > 0
      ? Math.round((summary.filled / summary.total_absences) * 100)
      : 100;

  // Find peak and slow days
  const dayEntries = Object.entries(summary.by_day).filter(([_, count]) => count > 0);
  if (dayEntries.length > 0) {
    const sortedDays = dayEntries.sort((a, b) => b[1] - a[1]);
    summary.peak_day = { day: sortedDays[0][0], count: sortedDays[0][1] };
    summary.slow_day = {
      day: sortedDays[sortedDays.length - 1][0],
      count: sortedDays[sortedDays.length - 1][1],
    };
  }

  // Sort by counts
  summary.by_school = Object.fromEntries(
    Object.entries(summary.by_school).sort((a, b) => b[1] - a[1])
  );
  summary.by_reason = Object.fromEntries(
    Object.entries(summary.by_reason).sort((a, b) => b[1] - a[1])
  );
  summary.by_position_type = Object.fromEntries(
    Object.entries(summary.by_position_type).sort((a, b) => b[1] - a[1])
  );

  // Identify trends
  if (summary.fill_rate < 80) {
    summary.trends.push({
      type: 'warning',
      message: `Low fill rate (${summary.fill_rate}%) - ${summary.unfilled} unfilled positions`,
    });
  }

  if (summary.peak_day && summary.peak_day.count > summary.daily_average * 1.5) {
    summary.trends.push({
      type: 'info',
      message: `${summary.peak_day.day} had ${summary.peak_day.count} absences (50%+ above average)`,
    });
  }

  return summary;
}

// Main execution
const weeksAgo = parseInt(process.argv[2]) || 0;
const weekRange = getWeekRange(weeksAgo);

try {
  const org = await getOrganization();
  const orgId = org.orgId;
  const apiKey = org.apiKey;

  console.error(`Fetching ${weekRange.label} (${weekRange.rangeLabel}) absences...`);
  console.error('');

  const result = await getVacancyDetails(orgId, apiKey, weekRange.start, weekRange.end);

  if (result.error) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const summary = buildWeeklySummary(result.data, weekRange);
  console.log(JSON.stringify(summary, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
