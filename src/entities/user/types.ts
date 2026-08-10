export interface FranchiseUser {
  id: number
  name?: string
  roles: string[]
  manager: {
    branchId: number
    branchName?: string
  }
  permissions?: {
    pages?: Record<string, Record<string, boolean>>
  }
}
