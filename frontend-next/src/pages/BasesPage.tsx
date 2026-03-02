import { useState } from 'react'
import { useBases } from '@/api/hooks/index.js'
import type { Base } from '@/types/index.js'
import { BasesListView } from '@/pages/bases/components/list/BasesListView.js'
import { CreateBaseModal } from '@/pages/bases/components/modals/CreateBaseModal.js'
import { EditBaseModal } from '@/pages/bases/components/modals/EditBaseModal.js'
import { BaseDetailView } from '@/pages/bases/components/detail/BaseDetailView.js'

export default function BasesPage() {
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editBase, setEditBase] = useState<Base | null>(null)
  const { data: bases = [], isLoading } = useBases()

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-text-secondary text-sm">Loading bases...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {selectedBaseId ? (
        <BaseDetailView
          baseId={selectedBaseId}
          onBack={() => setSelectedBaseId(null)}
        />
      ) : (
        <BasesListView
          bases={bases}
          onSelectBase={setSelectedBaseId}
          onCreateBase={() => setCreateModalOpen(true)}
          onEditBase={setEditBase}
        />
      )}
      <CreateBaseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
      <EditBaseModal
        open={!!editBase}
        onOpenChange={(open) => { if (!open) setEditBase(null) }}
        base={editBase}
      />
    </div>
  )
}
