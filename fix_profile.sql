-- INSTRUCTIONS:
-- 1. Replace 'YOUR_USER_ID_HERE' with your User UID.
-- 2. Run this in Supabase SQL Editor.

-- Insert Profile
INSERT INTO public.profiles (id, email, name, level, semester)
VALUES (
    'c9fd8c2d-bb87-426b-b600-5fcd508340a2', 
    'chikajoel01@gmail.com',  -- You can put the real email if you know it, or a placeholder
    'Chika Joel', 
    '100L', 
    '1st'
),
(
    '039c7aab-2f92-45ae-9a34-90c5236c505b', 
    'noskytech1@gmail.com',  -- You can put the real email if you know it, or a placeholder
    'Nosky Tech', 
    '100L', 
    '1st'
)
 ON CONFLICT (id) DO NOTHING;

-- Ensure Admin Role exists
INSERT INTO public.user_roles (user_id, role)
VALUES ('c9fd8c2d-bb87-426b-b600-5fcd508340a2', 'admin'),
('039c7aab-2f92-45ae-9a34-90c5236c505b', 'admin')

ON CONFLICT (user_id, role) DO NOTHING;
