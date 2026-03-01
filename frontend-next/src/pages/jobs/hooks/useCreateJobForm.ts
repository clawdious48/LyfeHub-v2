import { useState, useCallback, useMemo } from 'react'
import { useCreateJob } from '@/api/hooks/index.js'
import { JOB_TYPE_CODES } from '@/pages/jobs/utils/jobConstants.js'
import type {
  CreateApexJobData,
  AdditionalContact,
  SiteContact,
  JobContactAssignment,
} from '@/types/index.js'

const EMPTY_CONTACT: AdditionalContact = { name: '', phone: '', email: '' }
const EMPTY_SITE_CONTACT: SiteContact = { name: '', phone: '', email: '', relation: '' }

export interface CreateJobFormState {
  // Job Setup
  jobTypes: string[]
  // Client Info
  client_name: string
  client_phone: string
  client_email: string
  client_street: string
  client_unit: string
  client_city: string
  client_state: string
  client_zip: string
  additional_clients: AdditionalContact[]
  // Insurance Info
  ins_carrier: string
  ins_claim: string
  ins_policy: string
  deductible: string
  adj_name: string
  adj_phone: string
  adj_email: string
  additional_adjusters: AdditionalContact[]
  // Property Info
  same_as_client: boolean
  year_built: string
  prop_type: string
  prop_street: string
  prop_unit: string
  prop_city: string
  prop_state: string
  prop_zip: string
  access_info: string
  site_contacts: SiteContact[]
  // Loss Info
  loss_type: string
  loss_date: string
  water_category: string
  damage_class: string
  areas_affected: string
  hazards: string
  loss_description: string
  extraction_required: boolean
  ongoing_intrusion: boolean
  drywall_debris: boolean
  content_manipulation: boolean
  // Team — Internal
  mitigation_pm: string[]
  reconstruction_pm: string[]
  estimator: string[]
  project_coordinator: string[]
  mitigation_techs: string[]
  // Team — External
  contact_assignments: JobContactAssignment[]
  // Referral & Tracking
  referral_source: string
  referred_by: string
  how_heard: string
  internal_notes: string
}

const INITIAL_STATE: CreateJobFormState = {
  jobTypes: [],
  client_name: '',
  client_phone: '',
  client_email: '',
  client_street: '',
  client_unit: '',
  client_city: '',
  client_state: '',
  client_zip: '',
  additional_clients: [],
  ins_carrier: '',
  ins_claim: '',
  ins_policy: '',
  deductible: '',
  adj_name: '',
  adj_phone: '',
  adj_email: '',
  additional_adjusters: [],
  same_as_client: false,
  year_built: '',
  prop_type: 'residential',
  prop_street: '',
  prop_unit: '',
  prop_city: '',
  prop_state: '',
  prop_zip: '',
  access_info: '',
  site_contacts: [],
  loss_type: '',
  loss_date: '',
  water_category: '',
  damage_class: '',
  areas_affected: '',
  hazards: '',
  loss_description: '',
  extraction_required: false,
  ongoing_intrusion: false,
  drywall_debris: false,
  content_manipulation: false,
  mitigation_pm: [],
  reconstruction_pm: [],
  estimator: [],
  project_coordinator: [],
  mitigation_techs: [],
  contact_assignments: [],
  referral_source: '',
  referred_by: '',
  how_heard: '',
  internal_notes: '',
}

export function useCreateJobForm() {
  const [form, setForm] = useState<CreateJobFormState>(INITIAL_STATE)
  const createJob = useCreateJob()

  const updateField = useCallback(<K extends keyof CreateJobFormState>(
    field: K,
    value: CreateJobFormState[K]
  ) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const toggleJobType = useCallback((code: string) => {
    setForm(prev => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(code)
        ? prev.jobTypes.filter(c => c !== code)
        : [...prev.jobTypes, code],
    }))
  }, [])

  // Additional clients
  const addClient = useCallback(() => {
    setForm(prev => ({
      ...prev,
      additional_clients: [...prev.additional_clients, { ...EMPTY_CONTACT }],
    }))
  }, [])

  const removeClient = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      additional_clients: prev.additional_clients.filter((_, i) => i !== index),
    }))
  }, [])

  const updateClient = useCallback((index: number, field: keyof AdditionalContact, value: string) => {
    setForm(prev => ({
      ...prev,
      additional_clients: prev.additional_clients.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }))
  }, [])

  // Additional adjusters
  const addAdjuster = useCallback(() => {
    setForm(prev => ({
      ...prev,
      additional_adjusters: [...prev.additional_adjusters, { ...EMPTY_CONTACT }],
    }))
  }, [])

  const removeAdjuster = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      additional_adjusters: prev.additional_adjusters.filter((_, i) => i !== index),
    }))
  }, [])

  const updateAdjuster = useCallback((index: number, field: keyof AdditionalContact, value: string) => {
    setForm(prev => ({
      ...prev,
      additional_adjusters: prev.additional_adjusters.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }))
  }, [])

  // Site contacts
  const addSiteContact = useCallback(() => {
    setForm(prev => ({
      ...prev,
      site_contacts: [...prev.site_contacts, { ...EMPTY_SITE_CONTACT }],
    }))
  }, [])

  const removeSiteContact = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      site_contacts: prev.site_contacts.filter((_, i) => i !== index),
    }))
  }, [])

  const updateSiteContact = useCallback((index: number, field: keyof SiteContact, value: string) => {
    setForm(prev => ({
      ...prev,
      site_contacts: prev.site_contacts.map((sc, i) =>
        i === index ? { ...sc, [field]: value } : sc
      ),
    }))
  }, [])

  // CRM contact assignments
  const addContactAssignment = useCallback((assignment: JobContactAssignment) => {
    setForm(prev => ({
      ...prev,
      contact_assignments: [...prev.contact_assignments, assignment],
    }))
  }, [])

  const removeContactAssignment = useCallback((contactId: string) => {
    setForm(prev => ({
      ...prev,
      contact_assignments: prev.contact_assignments.filter(a => a.contact_id !== contactId),
    }))
  }, [])

  const isValid = useMemo(() => {
    return (
      form.client_name.trim() !== '' &&
      form.client_phone.trim() !== '' &&
      form.jobTypes.length > 0
    )
  }, [form.client_name, form.client_phone, form.jobTypes])

  const reset = useCallback(() => {
    setForm(INITIAL_STATE)
  }, [])

  const buildSubmitData = useCallback((): CreateApexJobData & {
    job_types: { job_type_code: string; job_type: string }[]
  } => {
    const job_types = form.jobTypes.map(code => {
      const found = JOB_TYPE_CODES.find(jt => jt.code === code)
      return { job_type_code: code, job_type: found?.type ?? '' }
    })

    return {
      name: `${form.client_name} - ${form.jobTypes.join('/')}`,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_email: form.client_email,
      client_street: form.client_street,
      client_unit: form.client_unit,
      client_city: form.client_city,
      client_state: form.client_state,
      client_zip: form.client_zip,
      additional_clients: JSON.stringify(form.additional_clients),
      ins_carrier: form.ins_carrier,
      ins_claim: form.ins_claim,
      ins_policy: form.ins_policy,
      deductible: form.deductible ? Number(form.deductible) : 0,
      adj_name: form.adj_name,
      adj_phone: form.adj_phone,
      adj_email: form.adj_email,
      additional_adjusters: JSON.stringify(form.additional_adjusters),
      same_as_client: form.same_as_client ? 1 : 0,
      year_built: form.year_built,
      prop_type: form.prop_type,
      prop_street: form.same_as_client ? form.client_street : form.prop_street,
      prop_unit: form.same_as_client ? form.client_unit : form.prop_unit,
      prop_city: form.same_as_client ? form.client_city : form.prop_city,
      prop_state: form.same_as_client ? form.client_state : form.prop_state,
      prop_zip: form.same_as_client ? form.client_zip : form.prop_zip,
      access_info: form.access_info,
      site_contacts: JSON.stringify(form.site_contacts),
      loss_type: form.loss_type,
      loss_date: form.loss_date,
      water_category: form.water_category,
      damage_class: form.damage_class,
      areas_affected: form.areas_affected,
      hazards: form.hazards,
      loss_description: form.loss_description,
      extraction_required: form.extraction_required ? 1 : 0,
      ongoing_intrusion: form.ongoing_intrusion ? 1 : 0,
      drywall_debris: form.drywall_debris ? 1 : 0,
      content_manipulation: form.content_manipulation ? 1 : 0,
      mitigation_pm: JSON.stringify(form.mitigation_pm),
      reconstruction_pm: JSON.stringify(form.reconstruction_pm),
      estimator: JSON.stringify(form.estimator),
      project_coordinator: JSON.stringify(form.project_coordinator),
      mitigation_techs: JSON.stringify(form.mitigation_techs),
      referral_source: form.referral_source,
      referred_by: form.referred_by,
      how_heard: form.how_heard,
      internal_notes: form.internal_notes,
      job_types,
    } as CreateApexJobData & { job_types: { job_type_code: string; job_type: string }[] }
  }, [form])

  return {
    form,
    updateField,
    toggleJobType,
    addClient,
    removeClient,
    updateClient,
    addAdjuster,
    removeAdjuster,
    updateAdjuster,
    addSiteContact,
    removeSiteContact,
    updateSiteContact,
    addContactAssignment,
    removeContactAssignment,
    isValid,
    reset,
    buildSubmitData,
    createJob,
  }
}
