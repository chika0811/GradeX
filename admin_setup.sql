-- 1. First, find your User ID.
-- You can see this in the Authentication > Users table in Supabase Dashboard.
-- Copy the 'User UID' (it looks like a UUID, e.g., 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11').

-- 2. Run this SQL query in the SQL Editor, replacing 'YOUR_USER_ID_HERE' with your actual User UID.

INSERT INTO public.user_roles (user_id, role)
VALUES 
    ('c9fd8c2d-bb87-426b-b600-5fcd508340a2', 'admin'), 
    ('039c7aab-2f92-45ae-9a34-90c5236c505b', 'admin');

-- 3. Verify the role
SELECT * FROM public.user_roles WHERE role = 'admin';
