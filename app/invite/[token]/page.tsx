import { SessionEntry } from '@/components/session-entry'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <SessionEntry mode="viewer" inviteToken={token} />
}
