import { Search, RefreshCw, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Button } from '@/components/ui/button.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'

interface Props {
  onRefresh: () => void
  isRefreshing: boolean
  onOpenSettings?: () => void
}

export function MailListToolbar({ onRefresh, isRefreshing, onOpenSettings }: Props) {
  const { searchQuery, setSearchQuery } = useMailUiStore()

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
        <Input
          placeholder="Search mail..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 text-sm"
          id="mail-search-input"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh"
      >
        <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
      {onOpenSettings && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onOpenSettings}
          title="Mail settings"
        >
          <Settings className="size-4" />
        </Button>
      )}
    </div>
  )
}
