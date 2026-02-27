export interface Goal {
  id: string
  user_id: string
  name: string
  status: 'dream' | 'active' | 'achieved'
  target_deadline: string | null
  goal_set: string | null
  achieved_date: string | null
  tag_id: string | null
  archived: number
  review_notes: string
  created_at: string
  updated_at: string
}

export type CreateGoalData = Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  name: string
}

export type UpdateGoalData = Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
