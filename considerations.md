 * RLS: `groups` rows need to be selectable by everyone in them, not just
 * the creator. Something like:
 *
 *   create policy "Users can view groups they belong to"
 *   on public.groups for select
 *   using (
 *     auth.uid() = created_by
 *     or members @> to_jsonb(auth.uid())
 *     or escorts @> to_jsonb(auth.uid())
 *     or requested_escorts @> to_jsonb(auth.uid())
 *     or is_public = true
 *   );