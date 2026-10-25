import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** Native modal focus containment and Escape handling for the client books. */
export default function ClientModal({ label, className, onClose, children }: { label: string; className: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    ref.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={label} className={`client-modal ${className}`} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
