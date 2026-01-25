-- Create feedback table
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  message text not null,
  status text default 'unread',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table feedback enable row level security;

-- Policies
create policy "Users can insert their own feedback"
  on feedback for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all feedback"
  on feedback for select
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );
