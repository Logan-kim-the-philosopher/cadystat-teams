with ranked as (
  select id, row_number() over (order by created_at, id) as position
  from public.members
  where gender is null
)
update public.members m
set gender = case when ranked.position % 2 = 0 then 'female' else 'male' end
from ranked
where m.id = ranked.id;
