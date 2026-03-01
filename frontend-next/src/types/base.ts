// --- Property type system ---

export type BasePropertyType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'relation'

export interface SelectOption {
  label: string
  color: string
  value?: string
}

export interface RelationOptions {
  relatedBaseId: string
  reversePropertyId?: string
  allowMultiple?: boolean
}

export type BasePropertyOptions =
  | SelectOption[]
  | RelationOptions
  | unknown[]
  | Record<string, unknown>

// --- Core entities ---

export interface BaseProperty {
  id: string
  base_id: string
  name: string
  type: BasePropertyType
  options: BasePropertyOptions
  position: number
  width: number
  created_at: string
  updated_at: string
}

export interface BaseRecord {
  id: string
  base_id: string
  global_id: number | null
  position: number
  values: Record<string, unknown>
  created_at: string
  updated_at: string
}

// --- View config ---

export interface FilterConfig {
  propertyId: string
  operator: string
  value: string
}

export interface SortConfig {
  propertyId: string
  direction: 'asc' | 'desc'
}

export interface BaseViewConfig {
  filters?: FilterConfig[]
  sorts?: SortConfig[]
  visibleColumns?: string[]
  columnOrder?: string[]
  columnWidths?: Record<string, number>
}

export interface BaseView {
  id: string
  base_id: string
  user_id: string
  name: string
  view_type: string
  config: BaseViewConfig
  is_default: number
  sort_order: number
  position: number
  created_at: string
  updated_at: string
}

// --- Groups ---

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

// --- Base ---

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
  records?: BaseRecord[]
}

// --- Mutation types ---

export type CreateBaseData = Partial<Omit<Base, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'properties' | 'records'>> & {
  name: string
}

export type UpdateBaseData = Partial<Omit<Base, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'properties' | 'records'>>

export interface CreateBaseRecordData {
  values: Record<string, unknown>
}

export interface UpdateBaseRecordData {
  values?: Record<string, unknown>
  position?: number
}

export interface CreatePropertyData {
  name: string
  type: BasePropertyType
  options?: BasePropertyOptions
  createReverse?: boolean
  reverseName?: string
}

export interface UpdatePropertyData {
  name?: string
  type?: BasePropertyType
  options?: BasePropertyOptions
  position?: number
  width?: number
}

export interface CreateViewData {
  name: string
  config: BaseViewConfig
}

export interface UpdateViewData {
  name?: string
  config?: BaseViewConfig
  position?: number
}

export interface CreateGroupData {
  name: string
  icon?: string
}

export interface UpdateGroupData {
  name?: string
  icon?: string
  position?: number
  collapsed?: boolean
}

export interface AssignBaseGroupData {
  group_id: string | null
  position?: number
}

export interface ReorderItem {
  id: string
  position: number
}
