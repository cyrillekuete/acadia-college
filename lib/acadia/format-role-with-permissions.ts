type RolePermissionJoin = {
  permission?: { id: string; name: string; slug: string } | null;
};

type RoleWithNestedPermissions = {
  permissions?: RolePermissionJoin[];
  [key: string]: unknown;
};

/** Flatten join rows to `{ id, name, slug }` — same shape as the roles list endpoint. */
export function formatRoleWithPermissions<T extends RoleWithNestedPermissions>(
  role: T,
) {
  const { permissions: rolePermissions, ...roleFields } = role;
  return {
    ...roleFields,
    permissions:
      rolePermissions
        ?.map((entry) => entry.permission)
        .filter(
          (permission): permission is { id: string; name: string; slug: string } =>
            Boolean(permission),
        )
        .map(({ id, name, slug }) => ({ id, name, slug })) ?? [],
  };
}
