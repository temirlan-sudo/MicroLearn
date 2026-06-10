/**
 * Masthead — редакционные «выходные данные» страницы.
 * Повторяется на каждом разделе, создаёт ощущение номера журнала.
 */
export function Masthead({
  volume = "Том I · Выпуск 04",
  tagline = "Издаём с 2026 года",
  section = "Astana IT College",
}: {
  volume?: string
  tagline?: string
  section?: string
}) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-10">
      <div className="grid grid-cols-12 items-center gap-x-4 gap-y-1 border-b border-rule py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground tnum md:gap-x-6 md:tracking-[0.22em]">
        <span className="col-span-12 md:col-span-4">{volume}</span>
        <span className="col-span-7 text-center md:col-span-4">{tagline}</span>
        <span className="col-span-5 text-right md:col-span-4">{section}</span>
      </div>
    </div>
  )
}
