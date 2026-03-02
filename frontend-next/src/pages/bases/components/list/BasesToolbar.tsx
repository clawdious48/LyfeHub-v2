import { Plus, LayoutGrid, List, Grid2x2, Grid3x3, StretchHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Badge } from '@/components/ui/badge.js'
import { Separator } from '@/components/ui/separator.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'

interface BasesToolbarProps {
  baseCount: number
  onCreateBase: () => void
}

const CARD_SIZES = [
  { size: 'small' as const, icon: Grid3x3, label: 'Small' },
  { size: 'medium' as const, icon: Grid2x2, label: 'Medium' },
  { size: 'large' as const, icon: StretchHorizontal, label: 'Large' },
]

export function BasesToolbar({ baseCount, onCreateBase }: BasesToolbarProps) {
  const { displayMode, cardSize, setDisplayMode, setCardSize } = useBasesUiStore()

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-heading text-text-primary">Bases</h1>
        <Badge variant="secondary" className="text-xs">
          {baseCount}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onCreateBase} size="sm">
          <Plus />
          Create Base
        </Button>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <Button
            variant={displayMode === 'card' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setDisplayMode('card')}
            title="Card view"
          >
            <LayoutGrid />
          </Button>
          <Button
            variant={displayMode === 'list' ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => setDisplayMode('list')}
            title="List view"
          >
            <List />
          </Button>
        </div>
        {displayMode === 'card' && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
              {CARD_SIZES.map(({ size, icon: Icon, label }) => (
                <Button
                  key={size}
                  variant={cardSize === size ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setCardSize(size)}
                  title={label}
                >
                  <Icon />
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
