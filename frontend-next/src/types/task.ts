export interface Task {
  id: string
  title: string
  description: string
  due_date: string | null
  due_time: string | null
  due_time_end: string | null
  recurring: string | null
  recurring_days: string[]
  important: number
  completed: number
  completed_at: string | null
  subtasks: Subtask[]
  user_id: string
  my_day: number
  status: string
  priority: string | null
  snooze_date: string | null
  project_id: string | null
  energy: string | null
  location: string | null
  list_id: string | null
  people_ids: string[]
  note_ids: string[]
  smart_list: string
  tag_id: string | null
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface TaskList {
  id: string
  name: string
  icon: string
  color: string
  user_id: string
  position: number
  created_at: string
  updated_at: string
}

export type CreateTaskData = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  title: string
}

export type UpdateTaskData = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export interface ScheduleTaskData {
  due_date: string
  due_time?: string
  due_time_end?: string
}
