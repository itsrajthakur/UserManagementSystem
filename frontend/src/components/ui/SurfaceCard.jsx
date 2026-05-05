export default function SurfaceCard({ children, className = '', padded = true }) {
  const c = `ui-surface${padded ? ' ui-surface--padded' : ''}${className ? ` ${className}` : ''}`;
  return <section className={c}>{children}</section>;
}
