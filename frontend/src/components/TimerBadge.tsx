import { useEffect, useState } from 'react';

interface Props {
  startedAt: string;
}

export function TimerBadge({ startedAt }: Props) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsedSec(Math.max(0, Math.round((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;

 return (
  <div className="inline-flex items-center gap-1 rounded-full border border-orange-400 bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
    <span>
      Time on question: {minutes.toString().padStart(2, '0')}:
      {seconds.toString().padStart(2, '0')}
    </span>
  </div>
);
}

