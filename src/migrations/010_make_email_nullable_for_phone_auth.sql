-- Make email field nullable to support phone-only authentication
-- This allows users to sign up with just phone numbers

ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- Update the handle_new_user function to properly handle null emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, phone)
    VALUES (
        NEW.id,
        NEW.email, -- Can be null for phone users
        COALESCE(
            NEW.raw_user_meta_data->>'name', 
            CASE 
                WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1)
                WHEN NEW.phone IS NOT NULL THEN NEW.phone
                ELSE 'User'
            END
        ),
        NEW.phone
    );
    RETURN NEW;
END;
$$;