#!/usr/bin/env bun

// Get approvals for the current agent
// Usage: bun get_approvals.js [status]
// Status: requested (pending), approved, rejected, cancelled

const { SECRETS } = require('../../../scripts/secrets.js');

const { domain, apiKey } = SECRETS.freshservice;
const baseUrl = `https://${domain}/api/v2`;

// Agent ID for Kris Hagel
const agentId = 6000130414;
const status = process.argv[2] || 'requested';

async function getApprovals(agentId, status, parent) {
  const url = `${baseUrl}/approvals?approver_id=${agentId}&status=${status}&parent=${parent}`;

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

  // Simplify output
  const approvals = data.approvals.map(a => ({
    id: a.id,
    approval_type: a.approval_type,
    approver_id: a.approver_id,
    status: a.status,
    created_at: a.created_at,
    updated_at: a.updated_at,
    approvable_id: a.approvable_id,
    approvable_type: a.approvable_type,
    delegator: a.delegator,
    latest_remark: a.latest_remark
  }));

  return {
    count: approvals.length,
    status: status,
    approvals
  };
}

try {
  // Check both tickets and changes for approvals
  const ticketApprovals = await getApprovals(agentId, status, 'ticket');
  const changeApprovals = await getApprovals(agentId, status, 'change');

  const allApprovals = [];
  if (!ticketApprovals.error) {
    allApprovals.push(...ticketApprovals.approvals.map(a => ({...a, parent_type: 'ticket'})));
  }
  if (!changeApprovals.error) {
    allApprovals.push(...changeApprovals.approvals.map(a => ({...a, parent_type: 'change'})));
  }

  console.log(JSON.stringify({
    count: allApprovals.length,
    status: status,
    approvals: allApprovals
  }, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
