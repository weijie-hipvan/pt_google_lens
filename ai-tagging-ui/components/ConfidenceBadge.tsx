interface ConfidenceBadgeProps {
  confidence: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CONFIDENCE_LEVELS = {
  high: { color: 'bg-green-500', text: 'text-green-500', label: 'High' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-500', label: 'Medium' },
  low: { color: 'bg-red-500', text: 'text-red-500', label: 'Low' },
};

const SIZES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export default function ConfidenceBadge({
  confidence,
  showPercentage = true,
  size = 'md',
}: ConfidenceBadgeProps) {
  const level =
    confidence >= 0.85 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';
  const { color, text } = CONFIDENCE_LEVELS[level];
  const percentage = Math.round(confidence * 100);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${SIZES[size]}`}
      title={`${CONFIDENCE_LEVELS[level].label} confidence`}
    >
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {showPercentage && (
        <span className={`font-medium ${text}`}>{percentage}%</span>
      )}
    </span>
  );
}
