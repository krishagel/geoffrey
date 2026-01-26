#!/usr/bin/env bun

// Get service request details including form data
// Usage: bun get_service_request.js <ticket_id>

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

const ticketId = process.argv[2];

if (!ticketId) {
  console.error(JSON.stringify({ error: 'Ticket ID required' }));
  process.exit(1);
}

async function getTicket(id) {
  const response = await fetch(`${baseUrl}/tickets/${id}?include=conversations,requester`, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return { error: `API error ${response.status}: ${error}` };
  }

  return await response.json();
}

async function getRequestedItems(ticketId) {
  const response = await fetch(`${baseUrl}/tickets/${ticketId}/requested_items`, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    return { requested_items: [] };
  }

  return await response.json();
}

async function getRequester(requesterId) {
  const response = await fetch(`${baseUrl}/requesters/${requesterId}`, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.requester;
}

try {
  const ticketData = await getTicket(ticketId);
  if (ticketData.error) {
    console.error(JSON.stringify(ticketData));
    process.exit(1);
  }

  const ticket = ticketData.ticket;
  const itemsData = await getRequestedItems(ticketId);
  const requester = await getRequester(ticket.requester_id);

  // Build comprehensive response
  const result = {
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      type: ticket.type,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      sub_category: ticket.sub_category,
      item_category: ticket.item_category,
      workspace_id: ticket.workspace_id,
      created_at: ticket.created_at,
      due_by: ticket.due_by,
      is_escalated: ticket.is_escalated,
      approval_status: ticket.approval_status,
      approval_status_name: ticket.approval_status_name
    },
    requester: requester ? {
      name: `${requester.first_name} ${requester.last_name}`,
      email: requester.primary_email,
      department: requester.department_names?.[0] || null,
      job_title: requester.job_title
    } : null,
    form_data: itemsData.requested_items?.[0]?.custom_fields || {},
    service_item: itemsData.requested_items?.[0] ? {
      id: itemsData.requested_items[0].service_item_id,
      name: itemsData.requested_items[0].service_item_name,
      quantity: itemsData.requested_items[0].quantity,
      cost: itemsData.requested_items[0].cost_per_request
    } : null,
    conversations: ticket.conversations?.map(c => ({
      id: c.id,
      body_text: c.body_text,
      private: c.private,
      created_at: c.created_at,
      user_id: c.user_id
    })) || []
  };

  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
