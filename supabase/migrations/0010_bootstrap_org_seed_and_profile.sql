-- 0010_bootstrap_org_seed_and_profile.sql
-- Extends bootstrap_org to accept user profile data without creating demo structure.

CREATE OR REPLACE FUNCTION public.bootstrap_org(
  org_name text,
  org_slug text DEFAULT NULL,
  profile_full_name text DEFAULT NULL,
  initial_role public.app_role DEFAULT 'admin'::public.app_role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile_org_id uuid;
  v_org_id uuid;
  v_slug text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.organization_id
  INTO v_profile_org_id
  FROM public.profiles p
  WHERE p.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for authenticated user';
  END IF;

  IF v_profile_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  IF org_name IS NULL OR btrim(org_name) = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  v_slug := COALESCE(NULLIF(btrim(org_slug), ''), btrim(org_name));
  v_slug := lower(v_slug);
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '[^a-z0-9-]', '', 'g');
  v_slug := regexp_replace(v_slug, '-{2,}', '-', 'g');
  v_slug := btrim(v_slug, '-');

  IF v_slug = '' THEN
    v_slug := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  END IF;

  BEGIN
    INSERT INTO public.organizations (name, slug, is_active)
    VALUES (btrim(org_name), v_slug, true)
    RETURNING id INTO v_org_id;
  EXCEPTION
    WHEN unique_violation THEN
      v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      INSERT INTO public.organizations (name, slug, is_active)
      VALUES (btrim(org_name), v_slug, true)
      RETURNING id INTO v_org_id;
  END;

  UPDATE public.profiles
  SET organization_id = v_org_id,
      role = COALESCE(initial_role, 'admin'::public.app_role),
      full_name = COALESCE(NULLIF(btrim(profile_full_name), ''), full_name),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_org(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_org(text, text, text, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_org(text, text, text, public.app_role) TO authenticated;
