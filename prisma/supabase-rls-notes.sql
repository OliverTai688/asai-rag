-- Supabase RLS notes for 誠問 AI.
--
-- Prisma is planned as the server-side ORM. If the runtime Prisma user has
-- BYPASSRLS, every API route must enforce organizationId scope in application
-- code. Use these policies only when exposing tables through Supabase Data API
-- or when using a runtime DB role that does not bypass RLS.
--
-- Suggested helper view/function design:
-- 1. users.supabase_auth_id maps to auth.users.id.
-- 2. organization_members links users to organizations.
-- 3. Tenant tables all carry organization_id.

create or replace function public.current_user_organization_ids()
returns setof text
language sql
stable
as $$
  select om.organization_id
  from public.organization_members om
  join public.users u on u.id = om.user_id
  where u.supabase_auth_id = auth.uid()
    and om.status = 'ACTIVE';
$$;

-- Example pattern. Repeat for every organization-scoped table after migration.
-- alter table public.clients enable row level security;
-- create policy clients_org_select on public.clients
--   for select using (organization_id in (select public.current_user_organization_ids()));
-- create policy clients_org_insert on public.clients
--   for insert with check (organization_id in (select public.current_user_organization_ids()));
-- create policy clients_org_update on public.clients
--   for update using (organization_id in (select public.current_user_organization_ids()))
--   with check (organization_id in (select public.current_user_organization_ids()));
-- create policy clients_org_delete on public.clients
--   for delete using (organization_id in (select public.current_user_organization_ids()));

-- Public share pages should not expose internal report sections. Prefer serving
-- /share/[token] through a Next.js route that resolves report_shares.token and
-- returns only client_sections from reports.

