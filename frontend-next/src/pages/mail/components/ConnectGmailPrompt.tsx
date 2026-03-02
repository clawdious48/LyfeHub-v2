import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { apiClient } from '@/api/client.js'

export function ConnectGmailPrompt() {
  async function handleConnect() {
    const { url } = await apiClient.get<{ url: string }>('/mail/oauth/authorize')
    window.location.href = url
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-accent-light flex items-center justify-center">
        <Mail className="size-8 text-accent" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Connect your Gmail</h2>
        <p className="text-text-secondary text-sm max-w-md">
          Read, compose, and manage your email right from LyfeHub.
          Your emails stay in Gmail — nothing is stored locally.
        </p>
      </div>
      <Button onClick={handleConnect} size="lg">
        Connect Gmail Account
      </Button>
    </div>
  )
}
