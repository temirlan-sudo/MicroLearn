/**
 * Форматирование валюты в тенге (₸) с неразрывными пробелами между разрядами.
 * Пример: 5900 → "5 900 ₸"
 */
export function formatKZT(value: number): string {
  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value)
  return `${formatted} \u20B8`
}

/**
 * Форматирование больших чисел с разделителями разрядов (без валюты).
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value)
}

/**
 * Компактное представление для кнопок и табличных ячеек, например «1 284».
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}
