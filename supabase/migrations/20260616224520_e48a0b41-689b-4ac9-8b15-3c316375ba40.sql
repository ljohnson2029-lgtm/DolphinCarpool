DELETE FROM public.email_send_log WHERE recipient_email IN ('efang2029@chadwickschool.org','ethanfang2029@gmail.com');
DELETE FROM public.suppressed_emails WHERE email IN ('efang2029@chadwickschool.org','ethanfang2029@gmail.com');
DELETE FROM public.email_unsubscribe_tokens WHERE email IN ('efang2029@chadwickschool.org','ethanfang2029@gmail.com');
DELETE FROM public.signup_verification_codes;
DELETE FROM auth.users WHERE id = 'e2789d81-22ec-43ca-95b3-4a4051633c2f';