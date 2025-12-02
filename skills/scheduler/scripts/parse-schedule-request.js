#!/usr/bin/env bun

// Parse natural language schedule request
// Usage: bun parse-schedule-request.js "Schedule AI research every morning at 6am on weekdays"
// Returns JSON with parsed schedule components

const requestText = process.argv[2];

if (!requestText) {
  console.error('Usage: bun parse-schedule-request.js "<natural language request>"');
  process.exit(1);
}

// Parse time from text (e.g., "6am", "14:30", "6:00pm")
function parseTime(text) {
  const lower = text.toLowerCase();

  // Match "6am", "6:00am", "6 am"
  const amPmMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (amPmMatch) {
    let hour = parseInt(amPmMatch[1]);
    const minute = amPmMatch[2] ? parseInt(amPmMatch[2]) : 0;
    const period = amPmMatch[3];

    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;

    return { hour, minute };
  }

  // Match "14:30", "6:00"
  const timeMatch = lower.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return {
      hour: parseInt(timeMatch[1]),
      minute: parseInt(timeMatch[2])
    };
  }

  // Match just hour "at 6", "6 o'clock"
  const hourMatch = lower.match(/(?:at\s+)?(\d{1,2})\s*(?:o'clock)?/);
  if (hourMatch) {
    return {
      hour: parseInt(hourMatch[1]),
      minute: 0
    };
  }

  return null;
}

// Parse day pattern from text
function parseDays(text) {
  const lower = text.toLowerCase();

  if (lower.includes('weekday') || lower.includes('mon-fri') || lower.includes('monday through friday')) {
    return 'weekdays';
  }

  if (lower.includes('weekend') || lower.includes('sat-sun') || lower.includes('saturday and sunday')) {
    return 'weekends';
  }

  if (lower.includes('daily') || lower.includes('every day')) {
    return 'daily';
  }

  // Individual days
  const days = [];
  if (lower.includes('monday') || lower.includes('mon')) days.push('monday');
  if (lower.includes('tuesday') || lower.includes('tue')) days.push('tuesday');
  if (lower.includes('wednesday') || lower.includes('wed')) days.push('wednesday');
  if (lower.includes('thursday') || lower.includes('thu')) days.push('thursday');
  if (lower.includes('friday') || lower.includes('fri')) days.push('friday');
  if (lower.includes('saturday') || lower.includes('sat')) days.push('saturday');
  if (lower.includes('sunday') || lower.includes('sun')) days.push('sunday');

  if (days.length > 0) {
    return days.join(',');
  }

  // Default to daily if no day pattern found
  return 'daily';
}

// Extract task/prompt from request
function extractTask(text) {
  const lower = text.toLowerCase();

  // Remove schedule-related words to get the task
  let task = text
    .replace(/schedule\s+/gi, '')
    .replace(/every\s+(day|morning|afternoon|evening|weekday|weekend|week)/gi, '')
    .replace(/at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?/gi, '')
    .replace(/on\s+(weekdays?|weekends?|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return task;
}

// Determine missed-run policy from context
function determineMissedRunPolicy(text) {
  const lower = text.toLowerCase();

  if (lower.includes('critical') || lower.includes('important') || lower.includes('must run')) {
    return 'retry';
  }

  if (lower.includes('catch up') || lower.includes('run when wake') || lower.includes('backup')) {
    return 'catch-up';
  }

  // Default to skip
  return 'skip';
}

try {
  const time = parseTime(requestText);
  if (!time) {
    throw new Error('Could not parse time from request. Please specify a time like "6am", "14:30", or "6:00pm"');
  }

  const days = parseDays(requestText);
  const task = extractTask(requestText);
  const missedRunPolicy = determineMissedRunPolicy(requestText);

  // Format schedule string for create-schedule.js
  const scheduleStr = `${time.hour}:${String(time.minute).padStart(2, '0')} ${days}`;

  const result = {
    time: `${time.hour}:${String(time.minute).padStart(2, '0')}`,
    days,
    schedule: scheduleStr,
    task,
    missed_run_policy: missedRunPolicy,
    suggested_name: task.substring(0, 50),
    needs_clarification: {
      prompt: !task || task.length < 10,
      tools: true,
      obsidian_folder: true
    }
  };

  console.log(JSON.stringify(result, null, 2));

} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
