export function shouldResetSession(status: number, message: string) {
  return status === 401 && message === 'Esta sessão expirou'
}
