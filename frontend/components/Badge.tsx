import type { EstadoServicio } from '@/lib/api';
import Icon, { type IconName } from './Icons';

const ICONO: Record<EstadoServicio, IconName> = {
  Pendiente: 'clock',
  'En proceso': 'loader',
  Completado: 'check',
};

// El estado se comunica con icono + texto + color (no solo color).
export default function Badge({ estado }: { estado: EstadoServicio }) {
  return (
    <span className={`pill ${estado.replace(' ', '-')}`}>
      <Icon name={ICONO[estado]} size={14} />
      {estado}
    </span>
  );
}
