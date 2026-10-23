import { agentRead, agentMethods } from '../../../../features/teams/server/agent-api';
export const prerender = false;
export const GET = agentRead('ticket-options');
export const { OPTIONS, ALL } = agentMethods('GET, OPTIONS');
