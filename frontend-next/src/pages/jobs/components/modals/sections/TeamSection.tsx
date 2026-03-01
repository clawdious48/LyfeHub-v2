import { useState } from 'react'
import { Users, X, Search, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Badge } from '@/components/ui/badge.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useOrgMembers, useSearchCrmContacts } from '@/api/hooks/index.js'
import { TEAM_ROLES, JOB_CONTACT_ROLES } from '@/pages/jobs/utils/jobConstants.js'
import { CreateContactMiniModal } from './CreateContactMiniModal.js'
import type { JobContactAssignment, CrmContact } from '@/types/index.js'

interface TeamSectionProps {
  mitigation_pm: string[]
  reconstruction_pm: string[]
  estimator: string[]
  project_coordinator: string[]
  mitigation_techs: string[]
  onUpdateField: (field: string, value: string[]) => void
  contact_assignments: JobContactAssignment[]
  onAddContactAssignment: (assignment: JobContactAssignment) => void
  onRemoveContactAssignment: (contactId: string) => void
}

export function TeamSection({
  mitigation_pm,
  reconstruction_pm,
  estimator,
  project_coordinator,
  mitigation_techs,
  onUpdateField,
  contact_assignments,
  onAddContactAssignment,
  onRemoveContactAssignment,
}: TeamSectionProps) {
  const { user } = useAuth()
  const orgId = (user as { org_id?: string } | null)?.org_id
  const { data: members = [] } = useOrgMembers(orgId)

  const [searchText, setSearchText] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const { data: searchResults = [] } = useSearchCrmContacts(searchText)

  const teamValues: Record<string, string[]> = {
    mitigation_pm,
    reconstruction_pm,
    estimator,
    project_coordinator,
    mitigation_techs,
  }

  function toggleMember(roleKey: string, userId: string) {
    const current = teamValues[roleKey] || []
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId]
    onUpdateField(roleKey, updated)
  }

  function handleSelectContact(contact: { id: string; first_name: string; last_name: string; phone: string; org_name: string | null }) {
    if (!selectedRole) return
    if (contact_assignments.some(a => a.contact_id === contact.id)) return
    onAddContactAssignment({
      contact_id: contact.id,
      job_role: selectedRole,
      display_name: `${contact.first_name} ${contact.last_name}`.trim(),
      org_name: contact.org_name,
      phone: contact.phone,
    })
    setSearchText('')
    setSelectedRole('')
  }

  function handleContactCreated(contact: CrmContact) {
    if (!selectedRole) return
    onAddContactAssignment({
      contact_id: contact.id,
      job_role: selectedRole || 'other',
      display_name: `${contact.first_name} ${contact.last_name}`.trim(),
      org_name: null,
      phone: contact.phone,
    })
    setSelectedRole('')
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-4 text-accent" />
        <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
          Team
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Internal Members */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            Internal Members
          </h4>
          <div className="space-y-3">
            {TEAM_ROLES.map(role => {
              const eligible = members.filter(m => role.eligible.includes(m.role))
              const selected = teamValues[role.key] || []
              return (
                <div key={role.key} className="space-y-1">
                  <Label className="text-xs">{role.label}</Label>
                  <div className="flex flex-wrap gap-1">
                    {eligible.length === 0 ? (
                      <span className="text-xs text-text-muted italic">No eligible members</span>
                    ) : (
                      eligible.map(m => (
                        <button
                          key={m.user_id}
                          type="button"
                          onClick={() => toggleMember(role.key, m.user_id)}
                          className={[
                            'px-2 py-1 rounded text-xs border transition-all cursor-pointer',
                            selected.includes(m.user_id)
                              ? 'bg-accent/20 border-accent text-accent'
                              : 'bg-bg-surface border-border text-text-secondary hover:border-accent/50',
                          ].join(' ')}
                        >
                          {m.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: External Members */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            External Members
          </h4>

          {/* Role selector */}
          <div className="space-y-1 mb-2">
            <Label className="text-xs">Role for new contact</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role first..." />
              </SelectTrigger>
              <SelectContent>
                {JOB_CONTACT_ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
            <Input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search contacts by name, phone, email..."
              className="pl-8"
              disabled={!selectedRole}
            />
            {/* Search results dropdown */}
            {searchText.length >= 2 && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-bg-surface border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((c: { id: string; first_name: string; last_name: string; phone: string; email: string; org_name: string | null }) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectContact(c)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-text-primary">
                      {c.first_name} {c.last_name}
                    </div>
                    <div className="text-xs text-text-muted">
                      {c.org_name && <span>{c.org_name} &middot; </span>}
                      {c.phone || c.email}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Contact button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            disabled={!selectedRole}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            <UserPlus className="size-3" /> Create Contact
          </button>

          {/* Added contacts list */}
          {contact_assignments.length > 0 && (
            <div className="space-y-2">
              {contact_assignments.map(a => (
                <div
                  key={a.contact_id}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-bg-surface border border-border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{a.display_name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {JOB_CONTACT_ROLES.find(r => r.value === a.job_role)?.label || a.job_role}
                      </Badge>
                    </div>
                    {(a.org_name || a.phone) && (
                      <div className="text-xs text-text-muted">
                        {a.org_name && <span>{a.org_name}</span>}
                        {a.org_name && a.phone && <span> &middot; </span>}
                        {a.phone && <span>{a.phone}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveContactAssignment(a.contact_id)}
                    className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateContactMiniModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={handleContactCreated}
      />
    </section>
  )
}
