import { http } from '@/shared/api/http'
import type { FranchiseUser } from '@/entities/user/types'

/** Текущий пользователь CRM / franchising (cookie-сессия). */
export async function fetchCurrentUser(): Promise<FranchiseUser> {
  const { data } = await http.get<FranchiseUser>('/user/crm_info')
  return data
}
