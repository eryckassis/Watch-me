'use client'

import { useState } from 'react'
import { ProfileEntryScreen, type SessionProfile } from '@/components/auth/profile-entry-screen'
import { RoomApp, type RoomMode } from '@/components/room-app'

type SessionResponse = {
  accessToken: string
  roomId: string
  expiresAt: string
  inviteUrl: string
  user: { displayName: string }
}

async function startSession(path: string, profile: SessionProfile) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: profile.name }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Não foi possível iniciar a sessão')
  }
  return payload as SessionResponse
}

export function SessionEntry({ mode, inviteToken }: { mode: RoomMode; inviteToken?: string }) {
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [profile, setProfile] = useState<SessionProfile | null>(null)

  if (!session || !profile) {
    return (
      <ProfileEntryScreen
        title={mode === 'host' ? 'Nova sessão' : 'Entrar na sessão'}
        description={
          mode === 'host'
            ? 'Escolha seu nome e imagem. A sessão e o convite expiram em 24 horas.'
            : 'Este acesso é temporário. Seu nome e imagem precisam ser cadastrados novamente após 24 horas.'
        }
        buttonLabel={mode === 'host' ? 'Criar sessão de 24 horas' : 'Entrar com o convite'}
        onContinue={async (nextProfile) => {
          const path = inviteToken
            ? `/api/invites/${encodeURIComponent(inviteToken)}/accept`
            : '/api/session/start'
          const nextSession = await startSession(path, nextProfile)
          setProfile(nextProfile)
          setSession(nextSession)
        }}
      />
    )
  }

  return (
    <RoomApp
      accessToken={session.accessToken}
      roomId={session.roomId}
      initialMode={mode}
      initialProfile={profile}
      initialTag={`Expira em ${new Date(session.expiresAt).toLocaleString('pt-BR')}`}
      inviteUrl={session.inviteUrl}
    />
  )
}
