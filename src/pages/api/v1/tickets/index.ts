import { agentRead, agentTicketMutation, agentMethods } from '../../../../features/teams/server/agent-api';
export const prerender = false;
export const GET = agentRead('tickets');
export const POST = agentTicketMutation;
export const { OPTIONS, ALL } = agentMethods('GET, POST, OPTIONS');
