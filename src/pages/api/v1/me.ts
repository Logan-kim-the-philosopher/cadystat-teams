import { agentRead, agentMethods } from '../../../features/teams/server/agent-api';
export const prerender = false;
export const GET = agentRead('me');
export const { OPTIONS, ALL } = agentMethods('GET, OPTIONS');
