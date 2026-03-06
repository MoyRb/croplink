interface SectionTitleProps {
  eyebrow?: string
  title: string
  description?: string
  centered?: boolean
  className?: string
  titleClassName?: string
  descriptionClassName?: string
  eyebrowClassName?: string
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  centered = false,
  className,
  titleClassName,
  descriptionClassName,
  eyebrowClassName,
}: SectionTitleProps) {
  return (
    <div className={`${centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'} ${className ?? ''}`.trim()}>
      {eyebrow ? (
        <p className={`text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700 ${eyebrowClassName ?? ''}`.trim()}>{eyebrow}</p>
      ) : null}
      <h2 className={`mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl ${titleClassName ?? ''}`.trim()}>{title}</h2>
      {description ? (
        <p className={`mt-4 text-base leading-relaxed text-slate-600 ${descriptionClassName ?? ''}`.trim()}>{description}</p>
      ) : null}
    </div>
  )
}
