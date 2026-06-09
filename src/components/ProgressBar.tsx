type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="progress-wrap" aria-label={label ?? "Progress"}>
      <div className="progress-track">
        <span className="progress-fill" style={{ width: `${normalizedValue}%` }} />
      </div>
      {label ? <span className="progress-label">{label}</span> : null}
    </div>
  );
}
