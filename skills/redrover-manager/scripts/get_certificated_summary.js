#!/usr/bin/env bun

// Get daily certificated staff absence summary from Red Rover
// Usage: bun get_certificated_summary.js [date]
//
// Filters to certificated positions only: Teacher, ESA - Certificated, CTE - Teacher
//
// Date options:
//   - "today" (default)
//   - "yesterday"
//   - Day names: "monday", "tuesday", etc.
//   - "last wednesday", "last friday"
//   - Specific date: "2026-01-27"

const { SECRETS } = require('../../../scripts/secrets.js');

const { username, password } = SECRETS.redrover;
const baseUrl = 'https://connect.redroverk12.com';
const authString = Buffer.from(`${username}:${password}`).toString('base64');

// Certificated position types
const CERTIFICATED_TYPES = ['Teacher', 'ESA - Certificated', 'CTE - Teacher'];

// Parse date argument
function parseDate(dateArg) {
  const now = new Date();

  if (!dateArg || dateArg === 'today') {
    return {
      date: formatDate(now),
      label: 'today',
    };
  }

  if (dateArg === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      date: formatDate(yesterday),
      label: 'yesterday',
    };
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const lower = dateArg.toLowerCase();

  if (lower.startsWith('last ')) {
    const dayName = lower.replace('last ', '').trim();
    const targetDay = dayNames.indexOf(dayName);

    if (targetDay !== -1) {
      const currentDay = now.getDay();
      let daysBack = currentDay - targetDay;
      if (daysBack <= 0) daysBack += 7;

      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - daysBack);

      return {
        date: formatDate(targetDate),
        label: `last ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`,
      };
    }
  }

  const justDay = dayNames.indexOf(lower);
  if (justDay !== -1) {
    const currentDay = now.getDay();
    let daysBack = currentDay - justDay;
    if (daysBack < 0) daysBack += 7;
    if (daysBack === 0) daysBack = 7;

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - daysBack);

    return {
      date: formatDate(targetDate),
      label: targetDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    };
  }

  const date = new Date(dateArg);
  return {
    date: formatDate(date),
    label: date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }),
  };
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Get organization info
async function getOrganization() {
  const response = await fetch(`${baseUrl}/api/v1/organization`, {
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get organization: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Fetch vacancy details
async function getVacancyDetails(orgId, apiKey, date) {
  const url = new URL(`${baseUrl}/api/v1/${orgId}/Vacancy/details`);
  url.searchParams.set('fromDate', `${date}T00:00:00Z`);
  url.searchParams.set('toDate', `${date}T23:59:59Z`);
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
      return { error: `API error ${response.status}` };
    }

    const result = await response.json();
    allData = allData.concat(result.data || []);
    hasMore = result.hasMoreData;
    page++;
  }

  return { data: allData };
}

// Build certificated-only summary
function buildSummary(vacancies, dateLabel, dateStr) {
  // Get day of week
  const dateObj = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Filter to certificated only
  const cert = vacancies.filter(v =>
    CERTIFICATED_TYPES.includes(v.position?.positionType?.name)
  );

  const filled = cert.filter(v => v.substitute).length;
  const unfilled = cert.length - filled;

  const summary = {
    date: dateLabel,
    date_iso: dateStr,
    day_of_week: dayOfWeek,
    full_date: fullDate,
    staff_type: 'Certificated Only',
    total_absences: cert.length,
    filled,
    unfilled,
    fill_rate: cert.length > 0 ? Math.round((filled / cert.length) * 100) : 100,
    by_school: {},
    by_reason: {},
    by_position: {},
    unfilled_positions: [],
  };

  for (const v of cert) {
    const school = v.location?.name || 'Unknown';
    summary.by_school[school] = (summary.by_school[school] || 0) + 1;

    const reason = v.absenceDetail?.reasons?.[0]?.name || 'Unknown';
    summary.by_reason[reason] = (summary.by_reason[reason] || 0) + 1;

    const position = v.position?.title || 'Unknown';
    summary.by_position[position] = (summary.by_position[position] || 0) + 1;

    if (!v.substitute) {
      summary.unfilled_positions.push({
        school,
        position,
        employee: `${v.absenceDetail?.employee?.firstName || ''} ${v.absenceDetail?.employee?.lastName || ''}`.trim(),
        start: v.start,
        end: v.end,
      });
    }
  }

  // Sort by counts
  summary.by_school = Object.fromEntries(
    Object.entries(summary.by_school).sort((a, b) => b[1] - a[1])
  );
  summary.by_reason = Object.fromEntries(
    Object.entries(summary.by_reason).sort((a, b) => b[1] - a[1])
  );
  summary.by_position = Object.fromEntries(
    Object.entries(summary.by_position).sort((a, b) => b[1] - a[1])
  );

  return summary;
}

// Main
const dateArg = process.argv[2];
const dateInfo = parseDate(dateArg);

try {
  const org = await getOrganization();

  console.error(`Fetching ${dateInfo.label} (${dateInfo.date}) certificated absences...`);
  console.error('');

  const result = await getVacancyDetails(org.orgId, org.apiKey, dateInfo.date);

  if (result.error) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const summary = buildSummary(result.data, dateInfo.label, dateInfo.date);
  console.log(JSON.stringify(summary, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
