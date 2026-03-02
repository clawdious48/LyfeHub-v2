export interface NavRouteItem {
  id: string
  type: 'route'
  route: string  // path from APP_ROUTES, e.g. '/jobs'
}

export interface NavHeaderItem {
  id: string
  type: 'header'
  label: string
}

export interface NavToggleHeaderItem {
  id: string
  type: 'toggle-header'
  label: string
  children: NavItem[]
  collapsed: boolean
}

export interface NavCaptureItem {
  id: string
  type: 'quick-capture'
  captureType: 'note' | 'task' | 'contact'
}

export type NavItem = NavRouteItem | NavHeaderItem | NavToggleHeaderItem | NavCaptureItem

export type OverflowTriggerStyle = 'ellipsis' | 'hamburger' | 'arrow' | 'invisible'
export type TriggerPosition = 'start' | 'end'

export interface NavWidgetConfig {
  items: NavItem[]
  overflowTrigger: OverflowTriggerStyle
  overflowPosition: TriggerPosition
  dockCollapseTrigger: OverflowTriggerStyle
  collapsed: boolean
  savedW?: number
  savedH?: number
}

export const DEFAULT_NAV_CONFIG: NavWidgetConfig = {
  items: [],
  overflowTrigger: 'ellipsis',
  overflowPosition: 'end',
  dockCollapseTrigger: 'arrow',
  collapsed: false,
}
