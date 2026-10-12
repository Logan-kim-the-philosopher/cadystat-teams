type Props = {
  title: string;
  date: string;
  index?: number;
  compact?: boolean;
  short?: boolean;
};

/** Adapted from the original Teams editorial thumbnail for both SSR and React lists. */
export function MeetingEditorialThumbnail({ title, date, index = 0, compact = false, short = false }: Props) {
  const number = compact ? date.slice(8) : String(index + 1).padStart(2, '0');
  const background = compact ? 'rounded-[2rem] border border-border bg-slate-950 sm:p-8' : index % 3 === 0 ? 'bg-slate-950' : index % 3 === 1 ? 'bg-zinc-900' : 'bg-stone-950';
  return (
    <div className={`relative ${short ? 'aspect-[16/8]' : 'aspect-[16/9]'} overflow-hidden p-6 text-white ${background}`}>
      <div className="absolute -right-10 -top-16 text-[10rem] font-black leading-none tracking-tighter text-white/[0.04]" aria-hidden="true">{number}</div>
      <div className={`absolute border-l border-white/20 ${compact ? 'bottom-6 left-6 right-6 top-6 sm:bottom-8 sm:left-8 sm:right-8 sm:top-8' : 'bottom-6 left-6 right-6 top-6'}`} aria-hidden="true"></div>
      <div className={`relative flex h-full flex-col justify-between pl-4 ${compact ? 'sm:pl-6' : ''}`}>
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.28em] text-white/50">
          <span>Codystat / Meeting</span>
          <span>{compact ? date.slice(0, 4) : String(index + 1).padStart(2, '0')}</span>
        </div>
        <div>
          <p className={`font-black leading-none tracking-[-0.08em] ${compact ? 'text-6xl sm:text-8xl' : 'text-5xl'}`}>{date.slice(5, 7)}</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <p className={`font-medium leading-5 text-white/80 ${compact ? 'max-w-md text-base sm:text-lg sm:leading-6' : 'max-w-[13rem] text-sm'}`}>{title}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">{compact ? date : `${date.slice(0, 4)} / ${date.slice(8)}`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
