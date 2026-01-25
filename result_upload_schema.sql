-- Create semester_results table
create table if not exists semester_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  semester text not null,
  level text,
  file_path text not null,
  file_name text not null,
  file_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table semester_results enable row level security;

-- Policies for table
create policy "Users can manage their own results"
  on semester_results for all
  using (auth.uid() = user_id);

-- Create storage bucket if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('course_results', 'course_results', true)
on conflict (id) do nothing;

-- Policies for storage
-- Allow public access to read (or restrict to user, but public is easier for downloading)
create policy "Give users access to own folder 1bk013l_0" on storage.objects for select to authenticated using (bucket_id = 'course_results' and auth.uid() = owner);

create policy "Give users access to own folder 1bk013l_1" on storage.objects for insert to authenticated with check (bucket_id = 'course_results' and auth.uid() = owner);

create policy "Give users access to own folder 1bk013l_2" on storage.objects for update to authenticated using (bucket_id = 'course_results' and auth.uid() = owner);

create policy "Give users access to own folder 1bk013l_3" on storage.objects for delete to authenticated using (bucket_id = 'course_results' and auth.uid() = owner);
