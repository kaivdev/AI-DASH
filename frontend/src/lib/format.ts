export function formatCurrency(value: number, currency: string = 'RUB', locale: string = navigator?.language ?? 'ru-RU') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0, maximumSignificantDigits: 12 }).format(value)
  } catch {
    return String(Math.round(value))
  }
}

export function formatDate(isoLike: string, locale: string = navigator?.language ?? 'en-US') {
  const d = new Date(isoLike)
  if (Number.isNaN(d.getTime())) return isoLike
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' })
} 