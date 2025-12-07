-- INSTRUCTIONS:
-- 1. Open the Supabase SQL Editor.
-- 2. Replace 'YOUR_EMAIL_HERE' with the email address you used to sign up.
-- 3. Run this query to manually confirm the email.

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'YOUR_EMAIL_HERE';
