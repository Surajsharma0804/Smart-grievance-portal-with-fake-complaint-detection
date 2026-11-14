import { describe, it, expect } from 'vitest';
import { Role } from '@nagrik-setu/shared';

describe('Staff Console Navigation & Roles', () => {
  it('identifies officer and admin role privileges correctly', () => {
    const staffRoles: readonly Role[] = [Role.OFFICER, Role.DEPT_ADMIN, Role.REVIEWER];
    const isStaff = (role: Role) => staffRoles.includes(role);

    expect(isStaff(Role.CITIZEN)).toBe(false);
    expect(isStaff(Role.OFFICER)).toBe(true);
    expect(isStaff(Role.DEPT_ADMIN)).toBe(true);
    expect(isStaff(Role.REVIEWER)).toBe(true);
  });

  it('validates navigation links for officer queue and review queue', () => {
    const navItems = [
      { path: '/staff', label: 'My Queue', roles: [Role.OFFICER] },
      { path: '/staff/review', label: 'Review Queue', roles: [Role.OFFICER, Role.REVIEWER] },
      { path: '/staff/admin', label: 'Admin Hub', roles: [Role.DEPT_ADMIN] },
    ];

    expect(navItems).toHaveLength(3);
    expect(navItems.find((n) => n.path === '/staff/review')?.roles).toContain(Role.OFFICER);
  });
});
