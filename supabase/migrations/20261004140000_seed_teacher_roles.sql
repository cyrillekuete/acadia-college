-- Seed standard teacher and general staff roles in UserRole table if missing.
INSERT INTO public."UserRole" (id, slug, name, description, "isProtected", "isDefault")
VALUES
  ('role-teacher',  'teacher',  'Teacher',  'Teaches one or more subjects and classes.', true, false),
  ('role-lecturer', 'lecturer', 'Lecturer',  'University-style teaching role.', true, false),
  ('role-staff',    'staff',    'Staff',     'General school staff member.', true, false)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      "isProtected" = EXCLUDED."isProtected";
