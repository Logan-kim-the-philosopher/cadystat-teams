import * as React from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Bug, Flag, Lightbulb, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import type { TicketRecord } from './ticket-types';

interface TicketItemProps {
  ticket: TicketRecord;
  draggable?: boolean;
  onSelect?: (ticket: TicketRecord) => void;
  teams?: { name: string; slug: string }[];
  description?: string;
}

export function TicketItem({ ticket, draggable = false, onSelect, teams = [], description = '' }: TicketItemProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [title, setTitle] = React.useState(ticket.title);
  const [descriptionDraft, setDescriptionDraft] = React.useState(description);
  const [saving, setSaving] = React.useState(false);
  const [type, setType] = React.useState(ticket.type || '버그');
  const [teamSlug, setTeamSlug] = React.useState(ticket.teamSlug || '');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(ticket)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onSelect) {
          event.preventDefault();
          onSelect(ticket);
        }
      }}
      draggable={draggable}
      data-ticket-id={ticket.id}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('ticket-id', ticket.id);
      }}
      className="group block"
    >
      <Card className="relative h-32 overflow-hidden rounded-xl border bg-card shadow-sm transition-colors hover:bg-muted/30">
        <div className="absolute right-3 top-3 z-10">
          <button type="button" aria-label="티켓 메뉴" aria-expanded={menuOpen} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuOpen((open) => !open); }}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && <div role="menu" className="absolute right-0 top-8 w-28 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); setEditOpen(true); }}>
              <Pencil className="h-3.5 w-3.5" />편집
            </button>
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10" onClick={async (event) => { event.stopPropagation(); if (!window.confirm('이 티켓을 삭제할까요?')) return; const response = await fetch(`/api/tickets?id=${encodeURIComponent(ticket.id)}`, { method: 'DELETE' }); if (response.ok) window.location.reload(); }}>
              <Trash2 className="h-3.5 w-3.5" />삭제
            </button>
          </div>}
        </div>
        {editOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setEditOpen(false); }}>
          <div className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="티켓 편집" onClick={(event) => event.stopPropagation()}>
          <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); setSaving(true); const response = await fetch(`/api/tickets?id=${encodeURIComponent(ticket.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description: descriptionDraft, type, team_id: teamSlug || null }) }); setSaving(false); if (response.ok) { setEditOpen(false); window.location.reload(); } }}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="티켓 제목" required />
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">유형<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option>버그</option><option>기능 요청</option></select></label><label className="text-sm font-medium">담당 팀<select value={teamSlug} onChange={(event) => setTeamSlug(event.target.value)} className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">미배정</option>{teams.map((team) => <option key={team.slug} value={team.slug}>{team.name}</option>)}</select></label></div>
            <Textarea value={descriptionDraft} onChange={(event) => setDescriptionDraft(event.target.value)} placeholder="상세 설명" className="min-h-16" />
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>취소</Button><Button type="submit" disabled={saving}>{saving ? '저장 중…' : '저장'}</Button></div>
          </form>
          </div>
        </div>}
        <CardContent className="flex h-full flex-col justify-between p-4">
          <div className="flex items-center gap-2 pr-8">
            <span className="text-sm font-medium text-muted-foreground">#{ticket.id.replace(/^#/, '')}</span>
            <Badge variant={ticket.status === '완료' ? 'green' : ticket.status === '배정' || ticket.status === '담당 배정' || ticket.status === '진행 중' ? 'amber' : 'red'}>{ticket.status || '신규'}</Badge>
          </div>
          <h3 className="line-clamp-2 pr-2 text-base font-semibold leading-6 tracking-tight text-foreground">{ticket.title}</h3>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{ticket.team || '미배정'}</span>
              <span className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {ticket.type === '버그' ? <Bug className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                {ticket.type || '티켓'}
              </span>
            </div>
            {ticket.priority && <Badge variant="red"><Flag className="mr-1 h-3.5 w-3.5" />{ticket.priority}</Badge>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
