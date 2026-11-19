'use client';

import { useEffect, useRef } from 'react';
import Icon from './Icons';

/** Diálogo accesible basado en <dialog>: foco atrapado, Esc para cerrar, clic fuera para cerrar. */
export default function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onCerrar}
      onClick={e => { if (e.target === ref.current) onCerrar(); }}
      aria-label={titulo}
    >
      {abierto && (
        <div className="modal-body">
          <div className="modal-head">
            <h2>{titulo}</h2>
            <button type="button" className="icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icon name="x" /></button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Confirmación para acciones destructivas. */
export function Confirmar({
  abierto,
  titulo,
  mensaje,
  etiqueta = 'Eliminar',
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  etiqueta?: string;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={onCerrar}>
      <p style={{ margin: '0 0 20px', color: 'var(--muted)' }}>{mensaje}</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn btn-danger" onClick={onConfirmar}>{etiqueta}</button>
      </div>
    </Modal>
  );
}
