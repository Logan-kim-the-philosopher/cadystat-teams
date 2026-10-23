import type { APIRoute } from 'astro';
import { parseCreateTicketInput, parseTicketFilters } from '../../../../features/teams/domain/tickets';
import { readTicketJson, ticketErrorResponse } from '../../../../features/teams/server/ticket-http';
import { createTicket, listTickets } from '../../../../features/teams/server/ticket-repository';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    return Response.json(await listTickets(parseTicketFilters(url)));
  } catch (error) {
    return ticketErrorResponse(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const ticket = await createTicket(parseCreateTicketInput(await readTicketJson(request)));
    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    return ticketErrorResponse(error);
  }
};
