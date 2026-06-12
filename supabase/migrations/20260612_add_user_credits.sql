create table if not exists public.user_credits (
  user_id uuid references auth.users on delete cascade primary key,
  credits integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_credits enable row level security;

create policy "Users can view own credits"
  on public.user_credits for select
  using ( auth.uid() = user_id );

-- Secure function to deduct credits
create or replace function deduct_credits(p_user_id uuid, p_amount int)
returns void as $$
begin
  update public.user_credits
  set credits = credits - p_amount, updated_at = now()
  where user_id = p_user_id and credits >= p_amount;
  
  if not found then
    raise exception 'Insufficient credits';
  end if;
end;
$$ language plpgsql security definer;

-- Secure function to add credits
create or replace function add_credits(p_user_id uuid, p_amount int)
returns void as $$
begin
  insert into public.user_credits (user_id, credits)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
  set credits = user_credits.credits + p_amount, updated_at = now();
end;
$$ language plpgsql security definer;
