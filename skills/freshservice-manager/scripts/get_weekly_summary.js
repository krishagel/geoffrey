#!/usr/bin/env bun

// Get weekly ticket summary for Technology workspace with trends
// Usage: bun get_weekly_summary.js [weeks_ago]
// weeks_ago: 0 = this week (default), 1 = last week, etc.

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

// Get week date range (Monday to Sunday)
function getWeekRange(weeksAgo = 0) {
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(now);
  monday.setDate(monday.getDate() + mondayOffset - (weeksAgo * 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekNum = getWeekNumber(monday);

  return {
    start: monday,
    end: sunday,
    label: `Week ${weekNum} (${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
  };
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Convert Pacific time to UTC
function toUTC(date) {
  const utc = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  return utc.toISOString();
}

// Get all agents
async function getAgents() {
  let allAgents = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${baseUrl}/agents?per_page=100&page=${page}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) break;

    const data = await response.json();
    allAgents = allAgents.concat(data.agents);
    hasMore = data.agents.length === 100;
    page++;
  }

  const agentMap = {};
  for (const agent of allAgents) {
    agentMap[agent.id] = {
      name: `${agent.first_name} ${agent.last_name}`,
      first_name: agent.first_name,
      job_title: agent.job_title
    };
  }
  return agentMap;
}

// Search tickets with pagination
async function searchTickets(startDate, endDate, workspaceId = 2) {
  const startUTC = toUTC(startDate);
  const endUTC = toUTC(endDate);

  const query = `(status:4 OR status:5) AND updated_at:>'${startUTC.split('T')[0]}T00:00:00Z' AND updated_at:<'${endUTC.split('T')[0]}T23:59:59Z'`;

  let allTickets = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${baseUrl}/tickets/filter?query="${encodeURIComponent(query)}"&workspace_id=${workspaceId}&page=${page}&per_page=100`;

    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `API error ${response.status}: ${error}` };
    }

    const data = await response.json();
    allTickets = allTickets.concat(data.tickets || []);
    hasMore = (data.tickets || []).length === 100;
    page++;
  }

  return { tickets: allTickets };
}

// Categorize ticket
function categorizeTicket(subject) {
  const lower = subject.toLowerCase();

  if (lower.includes('password reset')) return 'Password Reset';
  if (lower.includes('security alert') || lower.includes('compromised') || lower.includes('breach')) return 'Security Alert';
  if (lower.includes('schoology')) return 'Schoology';
  if (lower.includes('powerschool')) return 'PowerSchool';
  if (lower.includes('promethean')) return 'Promethean Board';
  if (lower.includes('chromebook')) return 'Chromebook';
  if (lower.includes('phone') || lower.includes('voicemail') || lower.includes('ext.')) return 'Phone/Voicemail';
  if (lower.includes('badge')) return 'Badge Request';
  if (lower.includes('new student') || lower.includes('enrollee')) return 'New Student';
  if (lower.includes('intercom')) return 'Intercom';
  if (lower.includes('raptor')) return 'Raptor';
  if (lower.includes('goguardian') || lower.includes('go guardian')) return 'GoGuardian';
  if (lower.includes('login') || lower.includes('access') || lower.includes('mfa')) return 'Access/Login';

  return 'Other';
}

// Get day name from date
function getDayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

const weeksAgo = parseInt(process.argv[2] || '0');
const weekRange = getWeekRange(weeksAgo);

try {
  const [ticketData, agentMap] = await Promise.all([
    searchTickets(weekRange.start, weekRange.end),
    getAgents()
  ]);

  if (ticketData.error) {
    console.error(JSON.stringify(ticketData));
    process.exit(1);
  }

  const tickets = ticketData.tickets || [];

  // Group by day
  const byDay = {};
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (const day of dayNames) {
    byDay[day] = { count: 0, categories: {}, agents: {} };
  }

  // Group by agent and category
  const byAgent = {};
  const byCategory = {};
  const byCategoryByDay = {};

  for (const ticket of tickets) {
    // Determine day (convert UTC to Pacific)
    const updatedAt = new Date(ticket.updated_at);
    const pacificTime = new Date(updatedAt.getTime() - (8 * 60 * 60 * 1000));
    const dayName = getDayName(pacificTime);

    const category = categorizeTicket(ticket.subject);

    // By day
    if (byDay[dayName]) {
      byDay[dayName].count++;
      byDay[dayName].categories[category] = (byDay[dayName].categories[category] || 0) + 1;

      if (ticket.responder_id) {
        byDay[dayName].agents[ticket.responder_id] = (byDay[dayName].agents[ticket.responder_id] || 0) + 1;
      }
    }

    // By category
    byCategory[category] = (byCategory[category] || 0) + 1;

    // By category by day
    if (!byCategoryByDay[category]) {
      byCategoryByDay[category] = {};
    }
    byCategoryByDay[category][dayName] = (byCategoryByDay[category][dayName] || 0) + 1;

    // By agent
    if (ticket.responder_id) {
      if (!byAgent[ticket.responder_id]) {
        byAgent[ticket.responder_id] = {
          agent: agentMap[ticket.responder_id] || { name: `Agent ${ticket.responder_id}`, first_name: 'Unknown' },
          count: 0,
          categories: {},
          byDay: {}
        };
      }
      byAgent[ticket.responder_id].count++;
      byAgent[ticket.responder_id].categories[category] = (byAgent[ticket.responder_id].categories[category] || 0) + 1;
      byAgent[ticket.responder_id].byDay[dayName] = (byAgent[ticket.responder_id].byDay[dayName] || 0) + 1;
    }
  }

  // Sort agents by count
  const sortedAgents = Object.entries(byAgent)
    .map(([id, data]) => ({
      id,
      name: data.agent.name,
      first_name: data.agent.first_name,
      job_title: data.agent.job_title,
      count: data.count,
      categories: data.categories,
      byDay: data.byDay,
      avg_per_day: (data.count / 5).toFixed(1) // Assuming 5 work days
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate trends
  const dailyCounts = dayNames.slice(0, 5).map(d => byDay[d].count); // Mon-Fri
  const avgDaily = dailyCounts.reduce((a, b) => a + b, 0) / 5;
  const peakDay = dayNames.slice(0, 5).reduce((max, day) => byDay[day].count > byDay[max].count ? day : max, 'Mon');
  const slowDay = dayNames.slice(0, 5).reduce((min, day) => byDay[day].count < byDay[min].count ? day : min, 'Mon');

  // Build summary
  const summary = {
    week: weekRange.label,
    date_range: {
      start: weekRange.start.toISOString(),
      end: weekRange.end.toISOString()
    },
    total_closed: tickets.length,
    daily_average: avgDaily.toFixed(1),
    trends: {
      peak_day: { day: peakDay, count: byDay[peakDay].count },
      slow_day: { day: slowDay, count: byDay[slowDay].count },
      daily_counts: byDay
    },
    by_category: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [k, v]) => {
        acc[k] = { total: v, pct: ((v / tickets.length) * 100).toFixed(1) + '%' };
        return acc;
      }, {}),
    category_trends: byCategoryByDay,
    top_agents: sortedAgents.slice(0, 10),
    all_agents: sortedAgents
  };

  console.log(JSON.stringify(summary, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
