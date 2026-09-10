update public.members
set gender = case when (sort_order % 2) = 0 then 'male' else 'female' end
where gender is null;
