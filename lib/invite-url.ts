const APP_INVITE_ORIGIN = 'screen-gole://invite'
const WEB_INVITE_ORIGIN = 'https://screen-gole.vercel.app'

export function toAppInviteUrl(inviteUrlOrPath: string) {
  const inviteUrl = new URL(inviteUrlOrPath, WEB_INVITE_ORIGIN)
  const token = inviteUrl.pathname.match(/^\/invite\/([^/]+)$/)?.[1]
  if (!token) throw new Error('Link de convite inválido')
  return `${APP_INVITE_ORIGIN}/${token}`
}

export function inviteTokenFromAppUrl(value: string) {
  try {
    const url = new URL(value)
    const token = url.pathname.match(/^\/([^/]+)$/)?.[1]
    return url.protocol === 'screen-gole:' && url.hostname === 'invite' && token ? token : null
  } catch {
    return null
  }
}
