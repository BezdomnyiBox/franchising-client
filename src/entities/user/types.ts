export interface FranchiseUser {
  id: number
  name?: string
  email?: string
  roles?: string[] | Record<string, string>
  manager?: {
    branchId: number
    branchName?: string
    accessibleClientSources?: Array<{
      alias: string
      description: string
    }>
  }
  permissions?: {
    pages?: Record<string, Record<string, boolean> | boolean>
  }
  /** CRM иногда отдаёт пустой объект без прав, если сессии нет. */
  [key: string]: unknown
}

export function normalizeRoles(roles: FranchiseUser['roles']): string[] {
  if (!roles) return []
  if (Array.isArray(roles)) return roles.map(String)
  return Object.values(roles).map(String)
}

/** Есть рабочая CRM-сессия с доступом к страницам. */
export function hasCrmSession(user: FranchiseUser | null | undefined): boolean {
  return Boolean(user?.permissions?.pages && Object.keys(user.permissions.pages).length > 0)
}

/** Менеджер франшизы / ПВ (или manager с branchId — запасной критерий). */
export function isFranchiseManager(user: FranchiseUser | null | undefined): boolean {
  if (!user || !hasCrmSession(user)) return false
  const roles = normalizeRoles(user.roles).map((r) => r.toLowerCase())
  if (roles.some((r) => r.includes('franchising'))) return true
  // В CRM роль может приходить иначе — пускаем, если есть branch и pages
  return Boolean(user.manager?.branchId)
}
