export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function formatMinutes(minutes) {
  if (minutes === 60) return '1 hour';
  if (minutes > 60) return `${(minutes / 60).toFixed(1)} hours`;
  return `${minutes} min`;
}

export function difficultyColor(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'pill-easy';
    case 'medium':
      return 'pill-medium';
    case 'hard':
      return 'pill-hard';
    default:
      return 'bg-gray-200';
  }
}

export function difficultyLabel(difficulty) {
  return difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : '—';
}
