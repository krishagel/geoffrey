#!/usr/bin/env bun

// Get daily ticket summary for Technology workspace
// Usage: bun get_daily_summary.js [date]
// Date: "yesterday", "today", or specific date like "2025-11-20"

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

// Parse date argument
function parseDate(dateArg) {
  const now = new Date();

  if (!dateArg || dateArg === 'today') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      label: 'today'
    };
  }

  if (dateArg === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0),
      end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59),
      label: 'yesterday'
    };
  }

  // Handle "last <day>" format (e.g., "last wednesday", "last friday")
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const lower = dateArg.toLowerCase();

  if (lower.startsWith('last ')) {
    const dayName = lower.replace('last ', '').trim();
    const targetDay = dayNames.indexOf(dayName);

    if (targetDay !== -1) {
      const currentDay = now.getDay();
      let daysBack = currentDay - targetDay;
      if (daysBack <= 0) daysBack += 7; // Go to previous week

      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - daysBack);

      return {
        start: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0),
        end: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59),
        label: `last ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`
      };
    }
  }

  // Handle just day name (e.g., "wednesday" means this past wednesday)
  const justDay = dayNames.indexOf(lower);
  if (justDay !== -1) {
    const currentDay = now.getDay();
    let daysBack = currentDay - justDay;
    if (daysBack < 0) daysBack += 7;
    if (daysBack === 0) daysBack = 7; // If today is that day, go back a week

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - daysBack);

    return {
      start: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0),
      end: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59),
      label: targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    };
  }

  // Parse specific date
  const date = new Date(dateArg);
  return {
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
    label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  };
}

// Convert Pacific time to UTC for API query
function toUTC(date) {
  // Pacific is UTC-8 (or UTC-7 during DST)
  // Add 8 hours to convert Pacific to UTC
  const utc = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  return utc.toISOString();
}

// Get all agents for name mapping
async function getAgents() {
  const response = await fetch(`${baseUrl}/agents?per_page=100`, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) return {};

  const data = await response.json();
  const agentMap = {};
  for (const agent of data.agents) {
    agentMap[agent.id] = {
      name: `${agent.first_name} ${agent.last_name}`,
      first_name: agent.first_name,
      job_title: agent.job_title
    };
  }
  return agentMap;
}

// Search tickets closed on date (with pagination)
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

    // Check if there are more pages
    hasMore = (data.tickets || []).length === 100;
    page++;
  }

  return { tickets: allTickets };
}

// Categorize ticket by subject
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

const dateArg = process.argv[2];
const dateRange = parseDate(dateArg);

try {
  const [ticketData, agentMap] = await Promise.all([
    searchTickets(dateRange.start, dateRange.end),
    getAgents()
  ]);

  if (ticketData.error) {
    console.error(JSON.stringify(ticketData));
    process.exit(1);
  }

  const tickets = ticketData.tickets || [];

  // Group by agent
  const byAgent = {};
  const byCategory = {};
  const automated = [];

  for (const ticket of tickets) {
    const category = categorizeTicket(ticket.subject);
    byCategory[category] = (byCategory[category] || 0) + 1;

    if (!ticket.responder_id) {
      automated.push({
        id: ticket.id,
        subject: ticket.subject,
        category,
        updated_at: ticket.updated_at
      });
      continue;
    }

    const agentId = ticket.responder_id;
    if (!byAgent[agentId]) {
      byAgent[agentId] = {
        agent: agentMap[agentId] || { name: `Agent ${agentId}`, first_name: 'Unknown' },
        tickets: [],
        categories: {}
      };
    }

    byAgent[agentId].tickets.push({
      id: ticket.id,
      subject: ticket.subject,
      category,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at
    });

    byAgent[agentId].categories[category] = (byAgent[agentId].categories[category] || 0) + 1;
  }

  // Sort agents by ticket count
  const sortedAgents = Object.entries(byAgent)
    .map(([id, data]) => ({
      id,
      name: data.agent.name,
      first_name: data.agent.first_name,
      job_title: data.agent.job_title,
      count: data.tickets.length,
      categories: data.categories,
      tickets: data.tickets.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
    }))
    .sort((a, b) => b.count - a.count);

  // Build summary
  const summary = {
    date: dateRange.label,
    date_range: {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString()
    },
    total_closed: tickets.length,
    by_category: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {}),
    by_agent: sortedAgents,
    automated: {
      count: automated.length,
      tickets: automated
    }
  };

  console.log(JSON.stringify(summary, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
