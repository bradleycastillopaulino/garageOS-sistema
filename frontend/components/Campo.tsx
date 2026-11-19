import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icons';

/** Sección numerada de un formulario. */
export function Seccion({ n, titulo, descripcion, children }: { n: number; titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <fieldset className="fsec">
      <legend className="fsec-head">
        <span className="fsec-n" aria-hidden="true">{n}</span>
        <span>
          <span className="fsec-title">{titulo}</span>
          {descripcion && <span className="fsec-desc">{descripcion}</span>}
        </span>
      </legend>
      <div className="fsec-body">{children}</div>
    </fieldset>
  );
}

/** Campo con etiqueta, indicador de obligatorio, ayuda y error inline. */
export function Campo({
  label, requerido, error, ayuda, children, className = '',
}: { label: string; requerido?: boolean; error?: string; ayuda?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`campo ${error ? 'campo-error' : ''} ${className}`}>
      <span className="campo-label">{label}{requerido && <i aria-hidden="true"> *</i>}</span>
      {children}
      {error ? <span className="campo-msg" role="alert">{error}</span> : ayuda ? <span className="campo-ayuda">{ayuda}</span> : null}
    </label>
  );
}

/** Input con icono o prefijo a la izquierda. */
export function Afijo({ icon, prefijo, children }: { icon?: IconName; prefijo?: string; children: ReactNode }) {
  return (
    <span className="afijo">
      {icon && <span className="afijo-lead"><Icon name={icon} size={18} /></span>}
      {prefijo && <span className="afijo-lead afijo-text">{prefijo}</span>}
      {children}
    </span>
  );
}

/** Barra de acciones fija al pie del formulario. */
export function BarraAcciones({
  etiqueta, guardando, faltan, onCancelar,
}: { etiqueta: string; guardando: boolean; faltan: number; onCancelar?: () => void }) {
  return (
    <div className="form-actions">
      <p className="form-hint" aria-live="polite">
        {faltan > 0 ? `${faltan} campo${faltan > 1 ? 's' : ''} obligatorio${faltan > 1 ? 's' : ''} por completar` : 'Todo listo para guardar'}
      </p>
      {onCancelar && <button type="button" className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>}
      <button className="btn" disabled={guardando}>{guardando ? 'Guardando…' : etiqueta}</button>
    </div>
  );
}
