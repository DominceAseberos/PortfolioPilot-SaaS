alter table public.user_credits 
add column if not exists has_claimed_free_credits boolean not null default false;
