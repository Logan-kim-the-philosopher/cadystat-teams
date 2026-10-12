import type { APIRoute } from 'astro';
import { parseTicketCommentInput, parseTicketNumber } from '../../../../../features/teams/domain/tickets';
import { readTicketJson, ticketErrorResponse } from '../../../../../features/teams/server/ticket-http';
import { addTicketComment, listTicketComments } from '../../../../../features/teams/server/ticket-repository';

export const prerender = false;

function numberFrom(params: Record<string, string | undefined>) {
  return parseTicketNumber(params.ticketNumber);
}

export const GET: APIRoute = async ({ params }) => {
  try {
    return Response.json({ comments: await listTicketComments(numberFrom(params)) });
  } catch (error) {
    return ticketErrorResponse(error);
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const comment = await addTicketComment(numberFrom(params), parseTicketCommentInput(await readTicketJson(request)));
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return ticketErrorResponse(error);
  }
};
