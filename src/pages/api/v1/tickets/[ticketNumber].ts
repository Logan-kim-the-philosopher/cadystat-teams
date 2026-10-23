import { agentRead, agentTicketMutation, agentMethods } from '../../../../features/teams/server/agent-api';
export const prerender = false;
export const GET = agentRead('tickets', true);
export const PATCH = agentTicketMutation;
export const DELETE = agentTicketMutation;
export const { OPTIONS, ALL } = agentMethods('GET, PATCH, DELETE, OPTIONS');
