import type { APIRoute } from 'astro';
import { parseTicketNumber, parseUpdateTicketInput } from '../../../../../features/teams/domain/tickets';
import { readTicketJson, ticketErrorResponse } from '../../../../../features/teams/server/ticket-http';
import { deleteTicket, getTicket, updateTicket } from '../../../../../features/teams/server/ticket-repository';

export const prerender = false;

function numberFrom(params: Record<string, string | undefined>) {
  return parseTicketNumber(params.ticketNumber);
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const ticket = await getTicket(numberFrom(params));
    return ticket ? Response.json({ ticket }) : Response.json({ error: '티켓을 찾을 수 없습니다.' }, { status: 404 });
  } catch (error) {
    return ticketErrorResponse(error);
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const ticket = await updateTicket(numberFrom(params), parseUpdateTicketInput(await readTicketJson(request)));
    return Response.json({ ticket });
  } catch (error) {
    return ticketErrorResponse(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    await deleteTicket(numberFrom(params));
    return new Response(null, { status: 204 });
  } catch (error) {
    return ticketErrorResponse(error);
  }
};
