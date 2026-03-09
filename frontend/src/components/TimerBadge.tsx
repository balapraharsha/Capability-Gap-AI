/*
TimerBadge Component

This component displays how long the user has been spending on the
current question in the assessment.

How it works:
1. The component receives a `startedAt` timestamp from the parent.
2. When the component mounts, it calculates the difference between
   the current time and the start time.
3. A timer updates every second using `setInterval`.
4. The elapsed time is displayed in MM:SS format.

This timer is useful for:
- Tracking how long candidates spend on each question
- Providing real-time feedback during the assessment
- Allowing analytics on time-per-question in the backend
*/

import { useEffect, useState } from 'react';

interface Props {
  // Timestamp representing when the current question started
  startedAt: string;
}

export function TimerBadge({ startedAt }: Props) {

  // Stores elapsed time in seconds
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    // Convert the start time into milliseconds
    const start = new Date(startedAt).getTime();

    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsedSec(
        Math.max(
          0,
          Math.round((Date.now() - start) / 1000)
        )
      );
    }, 1000);

    // Cleanup interval when component unmounts
    return () => clearInterval(interval);

  }, [startedAt]);

  // Convert total seconds into minutes
  const minutes = Math.floor(elapsedSec / 60);

  // Remaining seconds after removing minutes
  const seconds = elapsedSec % 60;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-orange-400 bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">

      {/* Pulsing indicator showing the timer is active */}
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />

      {/* Time display in MM:SS format */}
      <span>
        Time on question: {minutes.toString().padStart(2, '0')}:
        {seconds.toString().padStart(2, '0')}
      </span>

    </div>
  );
}