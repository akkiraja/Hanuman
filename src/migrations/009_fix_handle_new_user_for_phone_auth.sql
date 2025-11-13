-- Fix handle_new_user function to support phone-only authentication
-- This allows users to sign up with phone numbers without email addresses

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''), -- Use empty string if email is null
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

-- The trigger should already exist, but let's make sure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();