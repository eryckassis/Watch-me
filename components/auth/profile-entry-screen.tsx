'use client'

import { Camera, ImagePlus } from 'lucide-react'
import { useState } from 'react'

export type SessionProfile = { name: string; avatar: string }

type ProfileEntryScreenProps = {
  onContinue: (profile: SessionProfile) => Promise<void>
  title?: string
  description?: string
  buttonLabel?: string
  initialError?: string
}

export function ProfileEntryScreen({
  onContinue,
  title = 'Nova sessão',
  description = 'Cadastre um nome e uma imagem para esta sessão temporária.',
  buttonLabel = 'Continuar',
  initialError = '',
}: ProfileEntryScreenProps) {
  const [profile, setProfile] = useState<SessionProfile>({ name: '', avatar: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError)

  function selectAvatar(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 700_000) {
      setError('Escolha uma imagem PNG, JPEG ou WebP de até 700 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setProfile((current) => ({ ...current, avatar: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    const name = profile.name.trim().replace(/\s+/g, ' ')
    if (name.length < 2) {
      setError('Informe um nome com pelo menos 2 caracteres.')
      return
    }
    if (!profile.avatar) {
      setError('Adicione uma imagem para esta sessão.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onContinue({ name, avatar: profile.avatar })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a sessão.')
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-y-auto bg-black px-5 py-10 text-[#151515] sm:px-8">
      <section className="w-full max-w-[590px]" aria-labelledby="session-entry-title">
        <h1 id="session-entry-title" className="mb-7 text-center font-[family-name:var(--font-login)] text-[clamp(3.8rem,11vw,7rem)] font-normal leading-[0.82] tracking-[-0.06em] text-white">
          Screen Gole
        </h1>
        <form onSubmit={submit} className="rounded-[28px] bg-[#f4f4f4] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:p-11">
          <div className="mx-auto max-w-[430px] text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.035em] sm:text-3xl">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-black/60 sm:text-base">{description}</p>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-black/10 text-black/45">
              {profile.avatar ? <img src={profile.avatar} alt="Prévia da imagem" className="size-full object-cover" /> : <Camera size={26} aria-hidden="true" />}
            </span>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-black/15 px-4 text-sm font-bold text-black transition hover:bg-black/5">
              <ImagePlus size={17} aria-hidden="true" />
              Adicionar imagem
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => selectAvatar(event.target.files?.[0])} />
            </label>
          </div>
          <label className="mt-6 block text-sm font-bold text-black" htmlFor="session-name">
            Seu nome
            <input
              id="session-name"
              value={profile.name}
              minLength={2}
              maxLength={24}
              required
              autoFocus
              autoComplete="off"
              onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
              className="mt-2 min-h-13 w-full rounded-xl border border-black/15 bg-white px-4 text-base text-black outline-none focus:border-black/35 focus:ring-4 focus:ring-black/10"
              placeholder="Como você quer aparecer?"
            />
          </label>
          {error && <div className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800" role="alert">{error}</div>}
          <button type="submit" disabled={loading} className="mt-7 flex min-h-14 w-full items-center justify-center rounded-xl bg-[#6d3bff] px-5 text-base font-bold text-white shadow-[0_12px_30px_rgba(109,59,255,0.28)] transition hover:bg-[#7a4aff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6d3bff]/30 disabled:cursor-wait disabled:opacity-70">
            {loading ? <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-label="Carregando" /> : buttonLabel}
          </button>
          <p className="mt-5 text-center text-xs leading-5 text-black/45">Nada do perfil é salvo depois que o token expira.</p>
        </form>
      </section>
    </main>
  )
}
