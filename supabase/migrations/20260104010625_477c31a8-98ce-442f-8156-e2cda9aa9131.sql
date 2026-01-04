-- Explicitly set security invoker on the view to resolve the linter warning
ALTER VIEW public.public_profiles SET (security_invoker = true);