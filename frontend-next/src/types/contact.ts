export interface CrmContact {
  id: string
  org_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  phone_alt: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  notes: string
  created_at: string
  updated_at: string
  created_by: string | null
  tags?: CrmContactTag[]
  organizations?: CrmContactOrgMembership[]
}

export interface CrmOrg {
  id: string
  org_id: string
  name: string
  phone: string
  email: string
  website: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  notes: string
  created_at: string
  updated_at: string
  created_by: string | null
  tags?: CrmOrgTag[]
}

export interface CrmContactTag {
  id: string
  org_id: string
  name: string
  color: string
  created_at: string
}

export interface CrmOrgTag {
  id: string
  org_id: string
  name: string
  color: string
  created_at: string
}

export interface CrmContactOrgMembership {
  id: string
  contact_id: string
  crm_organization_id: string
  role_title: string
  is_primary: number
  created_at: string
}

export interface CrmJobContact {
  id: string
  job_id: string
  contact_id: string
  crm_organization_id: string | null
  job_role: string
  notes: string
  created_at: string
}

export type CreateCrmContactData = Partial<Omit<CrmContact, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'tags' | 'organizations'>> & {
  first_name: string
}

export type UpdateCrmContactData = Partial<Omit<CrmContact, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'tags' | 'organizations'>>

export type CreateCrmOrgData = Partial<Omit<CrmOrg, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'tags'>> & {
  name: string
}

export type UpdateCrmOrgData = Partial<Omit<CrmOrg, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'tags'>>
