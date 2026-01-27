#!/usr/bin/env bun

// Get daily absence summary from Red Rover
// Usage: bun get_daily_summary.js [date]
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

// Parse date argument (same pattern as freshservice-manager)
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

  // Handle "last <day>" format
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

  // Handle just day name
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

  // Parse specific date
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

// Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
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

// Fetch vacancy details for a single date
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

// Build summary from vacancy data
function buildSummary(vacancies, dateLabel, dateStr) {
  // Get the actual day of week from the date
  const dateObj = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const summary = {
    date: dateLabel,
    date_iso: dateStr,
    day_of_week: dayOfWeek,
    full_date: fullDate,
    total_absences: vacancies.length,
    filled: 0,
    unfilled: 0,
    by_school: {},
    by_reason: {},
    by_position_type: {},
    unfilled_positions: [],
    absences: [],
  };

  for (const v of vacancies) {
    // Count filled vs unfilled
    const isFilled = !!v.substitute;
    if (isFilled) {
      summary.filled++;
    } else {
      summary.unfilled++;
      summary.unfilled_positions.push({
        school: v.location?.name || 'Unknown',
        position: v.position?.title || 'Unknown',
        employee: `${v.absenceDetail?.employee?.firstName || ''} ${v.absenceDetail?.employee?.lastName || ''}`.trim(),
        start: v.start,
        end: v.end,
      });
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

    // Keep individual records
    summary.absences.push({
      employee: `${v.absenceDetail?.employee?.firstName || ''} ${v.absenceDetail?.employee?.lastName || ''}`.trim(),
      school,
      position: v.position?.title || 'Unknown',
      reason,
      filled: isFilled,
      substitute: isFilled ? `${v.substitute?.firstName || ''} ${v.substitute?.lastName || ''}`.trim() : null,
      start: v.start,
      end: v.end,
    });
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

  // Calculate fill rate
  summary.fill_rate = summary.total_absences > 0
    ? Math.round((summary.filled / summary.total_absences) * 100)
    : 100;

  return summary;
}

// Main execution
const dateArg = process.argv[2];
const dateInfo = parseDate(dateArg);

try {
  const org = await getOrganization();
  const orgId = org.orgId;
  const apiKey = org.apiKey;

  console.error(`Fetching ${dateInfo.label} (${dateInfo.date}) absences...`);
  console.error('');

  const result = await getVacancyDetails(orgId, apiKey, dateInfo.date);

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
