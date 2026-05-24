interface Props {
  toasts: { id: number; msg: string }[];
}

export function ToastStack({ toasts }: Props) {
  if (!toasts.length) return null;
  return (
    <div className="if-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="if-toast">{t.msg}</div>
      ))}
    </div>
  );
}
