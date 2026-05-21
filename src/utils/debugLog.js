export function logSmokeState(label, data) {
  console.log(`[smoke] ${label}`, {
    route: typeof window !== 'undefined' ? window.location.pathname : '',
    ...data,
  })
}
