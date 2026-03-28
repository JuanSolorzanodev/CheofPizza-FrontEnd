export type RoleName = 'admin' | 'customer' | 'operator';

export const ROLE_IDS: Record<RoleName, number> = {
  admin: 1,
  customer: 2,
  operator: 3,
};

export function roleNameFromId(roleId?: number | null): RoleName | null {
  if (!roleId) return null;
  const entry = Object.entries(ROLE_IDS).find(([, id]) => id === roleId);
  return (entry?.[0] as RoleName) ?? null;
}

export function isAnyRole(roleId: number | null | undefined, allowed: RoleName[]): boolean {
  const name = roleNameFromId(roleId);
  return !!name && allowed.includes(name);
}
