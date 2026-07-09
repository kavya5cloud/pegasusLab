/**
 * Fixed, full-viewport animated background. Sits at z-0; place glass panels
 * above it. Purely decorative (aria-hidden) and GPU-composited, so it stays
 * smooth and is disabled under prefers-reduced-motion (see globals.css).
 */
export default function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora__blob aurora__blob--1" />
      <div className="aurora__blob aurora__blob--2" />
      <div className="aurora__blob aurora__blob--3" />
      <div className="aurora__blob aurora__blob--4" />
    </div>
  );
}
