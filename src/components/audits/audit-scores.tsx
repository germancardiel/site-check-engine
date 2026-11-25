type AuditScoresProps = {
  score: number | null
  seoScore: number | null
  aiScore: number | null
  size?: 'sm' | 'lg'
}

function ScoreItem({ label, value, large }: { label: string; value: number | null; large: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-zinc-700 dark:text-zinc-300">{label}</dt>
      <dd className={large ? 'text-2xl font-semibold text-zinc-900 dark:text-zinc-100' : 'font-semibold text-zinc-900 dark:text-zinc-100'}>
        {value ?? '–'}
        <span className="text-sm font-normal text-zinc-700 dark:text-zinc-300">/100</span>
      </dd>
    </div>
  )
}

/** Total, SEO and IA scores of an audit. */
export function AuditScores({ score, seoScore, aiScore, size = 'sm' }: AuditScoresProps) {
  const large = size === 'lg'
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      <ScoreItem label="Nota" value={score} large={large} />
      <ScoreItem label="SEO" value={seoScore} large={large} />
      <ScoreItem label="IA" value={aiScore} large={large} />
    </dl>
  )
}
