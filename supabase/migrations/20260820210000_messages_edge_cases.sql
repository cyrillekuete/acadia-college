-- Messages module edge cases: unique membership, tighter member RLS,
-- transactional create/reply/notify/read/member RPCs.

CREATE OR REPLACE FUNCTION public.acadia_can_manage_message_groups()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(public.acadia_current_role_slug()) IN (
    'admin',
    'super-admin',
    'financial-director',
    'registrar',
    'bursar',
    'lecturer',
    'staff',
    'teacher'
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_can_manage_message_groups() TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_is_thread_member(p_thread_id text, p_tenant_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."MessageThreadMember" m
    WHERE m."threadId" = p_thread_id
      AND m."tenantId" = p_tenant_id
      AND m."userId" = auth.uid()::text
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_is_thread_member(text, text) TO authenticated;

DELETE FROM public."MessageThreadMember" a
USING public."MessageThreadMember" b
WHERE a.ctid < b.ctid
  AND a."tenantId" = b."tenantId"
  AND a."threadId" = b."threadId"
  AND a."userId" = b."userId";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageThreadMember_tenant_thread_user_key'
  ) THEN
    ALTER TABLE public."MessageThreadMember"
      ADD CONSTRAINT "MessageThreadMember_tenant_thread_user_key"
      UNIQUE ("tenantId", "threadId", "userId");
  END IF;
END $$;

DROP POLICY IF EXISTS "message_thread_member_select" ON public."MessageThreadMember";
CREATE POLICY "message_thread_member_select"
  ON public."MessageThreadMember"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR public.acadia_can_manage_message_groups()
      OR "userId" = auth.uid()::text
      OR public.acadia_is_thread_member("threadId", "tenantId")
    )
  );

DROP POLICY IF EXISTS "message_thread_member_insert" ON public."MessageThreadMember";

DROP POLICY IF EXISTS "message_thread_member_update_own_read" ON public."MessageThreadMember";
CREATE POLICY "message_thread_member_update_own_read"
  ON public."MessageThreadMember"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  );

DROP POLICY IF EXISTS "message_thread_insert_tenant" ON public."MessageThread";
CREATE POLICY "message_thread_insert_tenant"
  ON public."MessageThread"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND "createdByUserId" = auth.uid()::text
    AND (
      kind = 'DIRECT'::public."MessageThreadKind"
      OR public.acadia_can_manage_message_groups()
    )
  );

CREATE OR REPLACE FUNCTION public.acadia_new_prefixed_id(p_prefix text)
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT p_prefix || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;

CREATE OR REPLACE FUNCTION public.acadia_notify_message_recipients(
  p_tenant_id text,
  p_thread_id text,
  p_sender_user_id text,
  p_sender_name text,
  p_subject text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public."Notification" (
    id,
    "tenantId",
    "userId",
    event,
    "titleEn",
    "titleFr",
    "bodyEn",
    "bodyFr",
    data,
    "createdAt"
  )
  SELECT
    public.acadia_new_prefixed_id('notif'),
    p_tenant_id,
    m."userId",
    'message.received',
    'New message: ' || p_subject,
    'Nouveau message : ' || p_subject,
    p_sender_name || ' sent you a message.',
    p_sender_name || ' vous a envoyé un message.',
    jsonb_build_object('threadId', p_thread_id),
    now()
  FROM public."MessageThreadMember" m
  JOIN public."User" u ON u.id = m."userId"
  LEFT JOIN public."NotificationPreference" p
    ON p."tenantId" = p_tenant_id
    AND p."userId" = m."userId"
    AND p.event = 'message.received'
  WHERE m."tenantId" = p_tenant_id
    AND m."threadId" = p_thread_id
    AND m."userId" <> p_sender_user_id
    AND u.status = 'ACTIVE'
    AND u."isTrashed" = false
    AND COALESCE(p."inApp", true) = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_notify_message_recipients(
  text, text, text, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_create_direct_message(
  p_tenant_id text,
  p_recipient_user_id text,
  p_subject_en text,
  p_subject_fr text,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id text := auth.uid()::text;
  v_sender_name text;
  v_thread_id text;
  v_message_id text;
  v_now timestamptz := now();
  v_reused boolean := false;
  v_subject_en text := btrim(p_subject_en);
  v_subject_fr text := COALESCE(NULLIF(btrim(p_subject_fr), ''), btrim(p_subject_en));
  v_body text := btrim(p_body);
BEGIN
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF v_sender_id = p_recipient_user_id THEN
    RAISE EXCEPTION 'cannot message yourself';
  END IF;

  IF v_subject_en = '' OR v_body = '' THEN
    RAISE EXCEPTION 'subject and message are required';
  END IF;

  PERFORM 1
  FROM public."User" u
  WHERE u.id = p_recipient_user_id
    AND u."tenantId" = p_tenant_id
    AND u.status = 'ACTIVE'
    AND u."isTrashed" = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipient is not eligible';
  END IF;

  SELECT COALESCE(NULLIF(btrim(name), ''), email, v_sender_id)
  INTO v_sender_name
  FROM public."User"
  WHERE id = v_sender_id;

  SELECT t.id
  INTO v_thread_id
  FROM public."MessageThread" t
  WHERE t."tenantId" = p_tenant_id
    AND t.kind = 'DIRECT'::public."MessageThreadKind"
    AND EXISTS (
      SELECT 1 FROM public."MessageThreadMember" m
      WHERE m."threadId" = t.id AND m."tenantId" = t."tenantId" AND m."userId" = v_sender_id
    )
    AND EXISTS (
      SELECT 1 FROM public."MessageThreadMember" m
      WHERE m."threadId" = t.id AND m."tenantId" = t."tenantId" AND m."userId" = p_recipient_user_id
    )
    AND (
      SELECT count(*) FROM public."MessageThreadMember" m
      WHERE m."threadId" = t.id AND m."tenantId" = t."tenantId"
    ) = 2
  ORDER BY t."updatedAt" DESC
  LIMIT 1;

  IF v_thread_id IS NOT NULL THEN
    v_reused := true;
  ELSE
    v_thread_id := public.acadia_new_prefixed_id('mth');
    INSERT INTO public."MessageThread" (
      id, "tenantId", kind, "subjectEn", "subjectFr", "createdByUserId", "createdAt", "updatedAt"
    ) VALUES (
      v_thread_id,
      p_tenant_id,
      'DIRECT',
      v_subject_en,
      v_subject_fr,
      v_sender_id,
      v_now,
      v_now
    );

    INSERT INTO public."MessageThreadMember" (
      id, "tenantId", "threadId", "userId", "joinedAt"
    ) VALUES
      (public.acadia_new_prefixed_id('mtm'), p_tenant_id, v_thread_id, v_sender_id, v_now),
      (public.acadia_new_prefixed_id('mtm'), p_tenant_id, v_thread_id, p_recipient_user_id, v_now);
  END IF;

  v_message_id := public.acadia_new_prefixed_id('msg');
  INSERT INTO public."Message" (
    id, "tenantId", "threadId", "senderUserId", body, "createdAt"
  ) VALUES (
    v_message_id, p_tenant_id, v_thread_id, v_sender_id, v_body, v_now
  );

  UPDATE public."MessageThread"
  SET "updatedAt" = v_now
  WHERE id = v_thread_id AND "tenantId" = p_tenant_id;

  PERFORM public.acadia_notify_message_recipients(
    p_tenant_id, v_thread_id, v_sender_id, COALESCE(v_sender_name, 'Someone'), v_subject_en
  );

  RETURN jsonb_build_object(
    'threadId', v_thread_id,
    'messageId', v_message_id,
    'reused', v_reused
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_create_direct_message(
  text, text, text, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_create_group_thread(
  p_tenant_id text,
  p_subject_en text,
  p_subject_fr text,
  p_group_scope public."MessageGroupScope",
  p_group_scope_id text,
  p_member_user_ids text[],
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id text := auth.uid()::text;
  v_sender_name text;
  v_thread_id text;
  v_message_id text;
  v_now timestamptz := now();
  v_subject_en text := btrim(p_subject_en);
  v_subject_fr text := COALESCE(NULLIF(btrim(p_subject_fr), ''), btrim(p_subject_en));
  v_body text := btrim(p_body);
  v_member_id text;
  v_members text[];
BEGIN
  IF NOT public.acadia_can_manage_message_groups() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF v_subject_en = '' OR v_body = '' OR btrim(COALESCE(p_group_scope_id, '')) = '' THEN
    RAISE EXCEPTION 'subject, scope, and opening message are required';
  END IF;

  SELECT array_agg(DISTINCT uid)
  INTO v_members
  FROM unnest(array_append(COALESCE(p_member_user_ids, ARRAY[]::text[]), v_sender_id)) AS uid
  WHERE btrim(uid) <> '';

  IF v_members IS NULL OR array_length(v_members, 1) IS NULL OR array_length(v_members, 1) < 2 THEN
    RAISE EXCEPTION 'add at least one member besides yourself';
  END IF;

  FOREACH v_member_id IN ARRAY v_members LOOP
    IF v_member_id = v_sender_id THEN
      CONTINUE;
    END IF;
    PERFORM 1
    FROM public."User" u
    WHERE u.id = v_member_id
      AND u."tenantId" = p_tenant_id
      AND u.status = 'ACTIVE'
      AND u."isTrashed" = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'member is not eligible';
    END IF;
  END LOOP;

  SELECT COALESCE(NULLIF(btrim(name), ''), email, v_sender_id)
  INTO v_sender_name
  FROM public."User"
  WHERE id = v_sender_id;

  v_thread_id := public.acadia_new_prefixed_id('mth');
  INSERT INTO public."MessageThread" (
    id, "tenantId", kind, "subjectEn", "subjectFr",
    "groupScope", "groupScopeId", "createdByUserId", "createdAt", "updatedAt"
  ) VALUES (
    v_thread_id,
    p_tenant_id,
    'GROUP',
    v_subject_en,
    v_subject_fr,
    p_group_scope,
    p_group_scope_id,
    v_sender_id,
    v_now,
    v_now
  );

  FOREACH v_member_id IN ARRAY v_members LOOP
    INSERT INTO public."MessageThreadMember" (
      id, "tenantId", "threadId", "userId", "joinedAt"
    ) VALUES (
      public.acadia_new_prefixed_id('mtm'), p_tenant_id, v_thread_id, v_member_id, v_now
    );
  END LOOP;

  v_message_id := public.acadia_new_prefixed_id('msg');
  INSERT INTO public."Message" (
    id, "tenantId", "threadId", "senderUserId", body, "createdAt"
  ) VALUES (
    v_message_id, p_tenant_id, v_thread_id, v_sender_id, v_body, v_now
  );

  PERFORM public.acadia_notify_message_recipients(
    p_tenant_id, v_thread_id, v_sender_id, COALESCE(v_sender_name, 'Someone'), v_subject_en
  );

  RETURN jsonb_build_object(
    'threadId', v_thread_id,
    'messageId', v_message_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_create_group_thread(
  text, text, text, public."MessageGroupScope", text, text[], text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_reply_to_thread(
  p_tenant_id text,
  p_thread_id text,
  p_body text,
  p_subject text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id text := auth.uid()::text;
  v_sender_name text;
  v_message_id text;
  v_now timestamptz := now();
  v_body text := btrim(p_body);
  v_subject text := COALESCE(NULLIF(btrim(p_subject), ''), 'Conversation');
BEGIN
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF v_body = '' THEN
    RAISE EXCEPTION 'message is required';
  END IF;

  PERFORM 1
  FROM public."MessageThreadMember"
  WHERE "tenantId" = p_tenant_id
    AND "threadId" = p_thread_id
    AND "userId" = v_sender_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not a thread member' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(NULLIF(btrim(name), ''), email, v_sender_id)
  INTO v_sender_name
  FROM public."User"
  WHERE id = v_sender_id;

  v_message_id := public.acadia_new_prefixed_id('msg');
  INSERT INTO public."Message" (
    id, "tenantId", "threadId", "senderUserId", body, "createdAt"
  ) VALUES (
    v_message_id, p_tenant_id, p_thread_id, v_sender_id, v_body, v_now
  );

  UPDATE public."MessageThread"
  SET "updatedAt" = v_now
  WHERE id = p_thread_id AND "tenantId" = p_tenant_id;

  PERFORM public.acadia_notify_message_recipients(
    p_tenant_id, p_thread_id, v_sender_id, COALESCE(v_sender_name, 'Someone'), v_subject
  );

  RETURN jsonb_build_object('messageId', v_message_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_reply_to_thread(
  text, text, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_mark_thread_read(
  p_tenant_id text,
  p_thread_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  v_now timestamptz := now();
BEGIN
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public."MessageThreadMember"
  SET "lastReadAt" = v_now
  WHERE "tenantId" = p_tenant_id
    AND "threadId" = p_thread_id
    AND "userId" = v_user_id;

  UPDATE public."Notification"
  SET "readAt" = v_now
  WHERE "tenantId" = p_tenant_id
    AND "userId" = v_user_id
    AND event = 'message.received'
    AND "readAt" IS NULL
    AND data->>'threadId' = p_thread_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_mark_thread_read(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_update_group_members(
  p_tenant_id text,
  p_thread_id text,
  p_add_user_ids text[],
  p_remove_user_ids text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  v_now timestamptz := now();
  v_kind public."MessageThreadKind";
  v_created_by text;
  v_is_manager boolean := public.acadia_can_manage_message_groups();
  v_is_creator boolean;
  v_is_member boolean;
  v_add text[];
  v_remove text[];
  v_remaining integer;
  v_member_id text;
  v_removing_others boolean;
BEGIN
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT kind, "createdByUserId"
  INTO v_kind, v_created_by
  FROM public."MessageThread"
  WHERE id = p_thread_id AND "tenantId" = p_tenant_id;

  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  IF v_kind <> 'GROUP'::public."MessageThreadKind" THEN
    RAISE EXCEPTION 'membership can only be changed on group conversations';
  END IF;

  v_is_creator := v_created_by = v_user_id;
  SELECT EXISTS (
    SELECT 1 FROM public."MessageThreadMember"
    WHERE "tenantId" = p_tenant_id AND "threadId" = p_thread_id AND "userId" = v_user_id
  ) INTO v_is_member;

  SELECT COALESCE(array_agg(DISTINCT uid), ARRAY[]::text[])
  INTO v_add
  FROM unnest(COALESCE(p_add_user_ids, ARRAY[]::text[])) AS uid
  WHERE btrim(uid) <> '';

  SELECT COALESCE(array_agg(DISTINCT uid), ARRAY[]::text[])
  INTO v_remove
  FROM unnest(COALESCE(p_remove_user_ids, ARRAY[]::text[])) AS uid
  WHERE btrim(uid) <> '';

  v_removing_others := EXISTS (
    SELECT 1 FROM unnest(v_remove) AS uid WHERE uid <> v_user_id
  );

  IF array_length(v_add, 1) IS NOT NULL AND NOT (v_is_manager OR v_is_creator) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF v_removing_others AND NOT (v_is_manager OR v_is_creator) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF array_length(v_remove, 1) IS NOT NULL AND NOT v_is_member AND NOT (v_is_manager OR v_is_creator) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  FOREACH v_member_id IN ARRAY v_add LOOP
    PERFORM 1
    FROM public."User" u
    WHERE u.id = v_member_id
      AND u."tenantId" = p_tenant_id
      AND u.status = 'ACTIVE'
      AND u."isTrashed" = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'member is not eligible';
    END IF;
  END LOOP;

  SELECT count(*)::integer
  INTO v_remaining
  FROM public."MessageThreadMember"
  WHERE "tenantId" = p_tenant_id
    AND "threadId" = p_thread_id
    AND ("userId" <> ALL (v_remove) OR array_length(v_remove, 1) IS NULL);

  v_remaining := v_remaining + COALESCE(
    (
      SELECT count(*)::integer
      FROM unnest(v_add) AS uid
      WHERE NOT EXISTS (
        SELECT 1 FROM public."MessageThreadMember" m
        WHERE m."tenantId" = p_tenant_id AND m."threadId" = p_thread_id AND m."userId" = uid
      )
    ),
    0
  );

  IF v_remaining < 1 THEN
    RAISE EXCEPTION 'cannot remove the last member';
  END IF;

  FOREACH v_member_id IN ARRAY v_add LOOP
    INSERT INTO public."MessageThreadMember" (
      id, "tenantId", "threadId", "userId", "joinedAt"
    )
    VALUES (
      public.acadia_new_prefixed_id('mtm'), p_tenant_id, p_thread_id, v_member_id, v_now
    )
    ON CONFLICT ON CONSTRAINT "MessageThreadMember_tenant_thread_user_key" DO NOTHING;
  END LOOP;

  IF array_length(v_remove, 1) IS NOT NULL THEN
    DELETE FROM public."MessageThreadMember"
    WHERE "tenantId" = p_tenant_id
      AND "threadId" = p_thread_id
      AND "userId" = ANY (v_remove);
  END IF;

  UPDATE public."MessageThread"
  SET "updatedAt" = v_now
  WHERE id = p_thread_id AND "tenantId" = p_tenant_id;

  RETURN jsonb_build_object(
    'added', COALESCE(array_length(v_add, 1), 0),
    'removed', COALESCE(array_length(v_remove, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_update_group_members(
  text, text, text[], text[]
) TO authenticated;
