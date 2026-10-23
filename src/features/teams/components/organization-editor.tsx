import * as React from 'react';
import { ExternalLink, Plus, Save, Trash2, X } from 'lucide-react';
import type { MemberGender, OrganizationMember, OrganizationTeam } from '../domain/organization';

type EditableMember = OrganizationMember & { isNew: boolean };

type OrganizationEditorProps = {
  team: OrganizationTeam;
  onClose: () => void;
  onChanged: (team?: OrganizationTeam) => void;
};

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error ?? `요청 실패 (${response.status})`;
}

export function OrganizationEditor({ team, onClose, onChanged }: OrganizationEditorProps) {
  const [name, setName] = React.useState(team.name);
  const [leadMemberId, setLeadMemberId] = React.useState(team.leadMemberId ?? '');
  const [members, setMembers] = React.useState<EditableMember[]>(() => team.members.map((member) => ({ ...member, isNew: false })));
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(team.name);
    setLeadMemberId(team.leadMemberId ?? '');
    setMembers(team.members.map((member) => ({ ...member, isNew: false })));
    setError(null);
  }, [team]);

  function changeMember(id: string, field: 'name' | 'title' | 'gender', value: string) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, [field]: field === 'gender' ? (value || null) as MemberGender : value } : member));
  }

  function addMember() {
    setMembers((current) => [...current, {
      id: crypto.randomUUID(),
      name: '',
      title: '',
      gender: null,
      teamId: team.id,
      reportsToMemberId: leadMemberId || null,
      sortOrder: current.length,
      isNew: true
    }]);
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id));
    if (leadMemberId === id) setLeadMemberId('');
  }

  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const currentIds = new Set(members.map((member) => member.id));
    const deleted = team.members.filter((member) => !currentIds.has(member.id)).map((member) => ({ action: 'delete', id: member.id }));
    const mutations = members.map((member, index) => ({
      action: member.isNew ? 'create' : 'update',
      id: member.id,
      name: member.name,
      title: member.title,
      gender: member.gender,
      sortOrder: index
    }));

    try {
      const response = await fetch('/api/teams/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.id, name, leadMemberId: leadMemberId || null, members: [...mutations, ...deleted] })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const payload = await response.json();
      onChanged(payload.team);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '팀을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function removeTeam() {
    if (!window.confirm(`${team.name} 팀을 삭제할까요?`)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/organization?id=${encodeURIComponent(team.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '팀을 삭제하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="organization-editor-title">
        <header className="flex items-start justify-between border-b px-6 py-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Team editor</p><h2 id="organization-editor-title" className="mt-1 text-xl font-bold">{team.name}</h2></div>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="편집 닫기"><X size={18} /></button>
        </header>
        <div className="space-y-6 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">팀 이름<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">리드<select value={leadMemberId} onChange={(event) => setLeadMemberId(event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"><option value="">리드 없음 · 수평 조직</option>{members.map((member) => <option value={member.id} key={member.id}>{member.name || '이름 미입력'} · {member.title || '직책 미입력'}</option>)}</select></label>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold">구성원</h3><p className="text-xs text-slate-500">실제 계정이 아닌 Teams 표시 프로필입니다.</p></div><button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold hover:bg-slate-200" onClick={addMember}><Plus size={14} />추가</button></div>
            <div className="space-y-3">
              {members.map((member) => (
                <div className="grid gap-2 rounded-2xl border bg-slate-50/60 p-3 sm:grid-cols-[1fr_1.15fr_8rem_auto]" key={member.id}>
                  <input aria-label="구성원 이름" required maxLength={80} value={member.name} onChange={(event) => changeMember(member.id, 'name', event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm" placeholder="이름" />
                  <input aria-label="구성원 직책" required maxLength={120} value={member.title} onChange={(event) => changeMember(member.id, 'title', event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm" placeholder="직책" />
                  <select aria-label="구성원 성별" value={member.gender ?? ''} onChange={(event) => changeMember(member.id, 'gender', event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">미지정</option><option value="male">남성</option><option value="female">여성</option></select>
                  <button type="button" className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => removeMember(member.id)} aria-label={`${member.name || '구성원'} 삭제`}><Trash2 size={16} /></button>
                </div>
              ))}
              {members.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">구성원이 없는 수평 팀입니다.</div> : null}
            </div>
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
          <div className="flex gap-2"><button type="button" disabled={saving} onClick={removeTeam} className="rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">팀 삭제</button><a className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href={`/teams/organization/${team.id}`}>상세 <ExternalLink size={14} /></a></div>
          <div className="flex gap-2"><button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={onClose}>취소</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} />{saving ? '저장 중' : '저장'}</button></div>
        </footer>
      </form>
    </div>
  );
}

type CreateTeamDialogProps = { teams: OrganizationTeam[]; onClose: () => void; onCreated: (team: OrganizationTeam) => void };

export function CreateTeamDialog({ teams, onClose, onCreated }: CreateTeamDialogProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/teams/organization', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!response.ok) throw new Error(await errorMessage(response));
      onCreated((await response.json()).team);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '팀을 만들지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="create-team-title">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">New team</p><h2 id="create-team-title" className="mt-1 text-xl font-bold">팀 추가</h2></div><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="팀 추가 닫기"><X size={18} /></button></div>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">팀 이름<input required maxLength={80} name="name" className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
          <label className="block text-sm font-semibold">상위 팀<select name="parentTeamId" defaultValue="" className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 font-normal"><option value="">없음 · 최상위 팀</option>{teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label>
          <div className="rounded-2xl border bg-slate-50/70 p-4"><p className="text-sm font-bold">초기 리드 · 선택 사항</p><p className="mt-1 text-xs text-slate-500">비워 두면 수평 팀으로 시작합니다.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><input name="leadName" maxLength={80} className="rounded-xl border bg-white px-3 py-2.5 text-sm" placeholder="이름" /><input name="leadTitle" maxLength={120} className="rounded-xl border bg-white px-3 py-2.5 text-sm" placeholder="직책" /><select name="leadGender" defaultValue="" className="rounded-xl border bg-white px-3 py-2.5 text-sm sm:col-span-2"><option value="">성별 미지정</option><option value="male">남성</option><option value="female">여성</option></select></div></div>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">취소</button><button disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? '생성 중' : '팀 생성'}</button></div>
      </form>
    </div>
  );
}
