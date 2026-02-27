export interface Milestone {
  id: string
  user_id: string
  goal_id: string | null
  name: string
  target_deadline: string | null
  completed_date: string | null
  created_at: string
  updated_at: string
}

export type CreateMilestoneData = Partial<Omit<Milestone, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  name: string
}

export type UpdateMilestoneData = Partial<Omit<Milestone, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
