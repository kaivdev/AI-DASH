export function formatCurrency(value: number, currency: string = 'USD', locale: string = navigator?.language ?? 'en-US') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
  } catch {
    return value.toFixed(2)
  }
}

export function formatDate(isoLike: string, locale: string = navigator?.language ?? 'en-US') {
  const d = new Date(isoLike)
  if (Number.isNaN(d.getTime())) return isoLike
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' })
} 