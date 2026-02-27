export interface Base {
  id: string
  name: string
  description: string
  icon: string
  user_id: string
  group_id: string | null
  position: number
  created_at: string
  updated_at: string
  properties?: BaseProperty[]
}

export type BasePropertyType = 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'relation'

export interface BaseProperty {
  id: string
  base_id: string
  name: string
  type: BasePropertyType
  options: string
  position: number
  width: number
  created_at: string
  updated_at: string
}

export interface BaseRecord {
  id: string
  base_id: string
  data: Record<string, unknown>
  global_id: number | null
  position: number
  created_at: string
  updated_at: string
}

export interface BaseView {
  id: string
  base_id: string
  user_id: string
  name: string
  view_type: string
  config: string
  is_default: number
  sort_order: number
  position: number
  created_at: string
  updated_at: string
}

export interface BaseGroup {
  id: string
  name: string
  icon: string
  user_id: string
  position: number
  collapsed: number
  created_at: string
  updated_at: string
}

export type CreateBaseData = Partial<Omit<Base, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'properties'>> & {
  name: string
}

export type UpdateBaseData = Partial<Omit<Base, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'properties'>>

export type CreateBaseRecordData = {
  data?: Record<string, unknown>
}

export type UpdateBaseRecordData = {
  data?: Record<string, unknown>
  position?: number
}
