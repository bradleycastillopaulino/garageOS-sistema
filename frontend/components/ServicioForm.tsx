'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, formatearFecha, formatearMonto, isoLocal, type EstadoServicio, type Servicio, type Vehiculo } from '@/lib/api';
import Icon, { type IconName } from './Icons';
import { Afijo, BarraAcciones, Campo, Seccion } from './Campo';

type Datos = Omit<Servicio, 'id'>;

const ESTADOS: { v: EstadoServicio; icon: IconName; color: string }[] = [
  { v: 'Pendiente', icon: 'clock', color: 'var(--idle)' },
  { v: 'En proceso', icon: 'loader', color: 'var(--warn)' },
  { v: 'Completado', icon: 'check', color: 'var(--ok)' },
];
const SUGERENCIAS = ['Cambio de aceite', 'Frenos', 'Alineación y balanceo', 'Revisión general', 'Batería', 'Suspensión', 'Aire acondicionado'];

type Clave = 'vehiculoId' | 'problema' | 'fecha' | 'costo';

export default function ServicioForm({
  inicial,
  vehiculoIdInicial = '',
  etiqueta,
  onGuardar,
  onCancelar,
}: {
  inicial?: Servicio;
  vehiculoIdInicial?: string;
  etiqueta: string;
  onGuardar: (d: Datos) => Promise<void>;
  onCancelar?: () => void;
}) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargado, setCargado] = useState(false);
  const [f, setF] = useState<Record<Clave, string>>({
    vehiculoId: inicial?.vehiculoId ?? vehiculoIdInicial,
    problema: inicial?.problema ?? '',
    fecha: inicial?.fecha ?? isoLocal(),
    costo: inicial ? String(inicial.costo) : '',
  });
  const [estado, setEstado] = useState<EstadoServicio>(inicial?.estado ?? 'Pendiente');
  const [piezas, setPiezas] = useState(inicial?.piezas ?? '');
  const [notas, setNotas] = useState(inicial?.notas ?? '');
  const [tocados, setTocados] = useState<Partial<Record<Clave, boolean>>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.vehiculos().then(setVehiculos).finally(() => setCargado(true));
  }, []);

  const claves: Clave[] = ['vehiculoId', 'problema', 'fecha', 'costo'];
  const errorDe = (k: Clave) => (tocados[k] && !f[k].trim() ? 'Este campo es obligatorio' : '');
  const set = (k: Clave) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const blur = (k: Clave) => () => setTocados(p => ({ ...p, [k]: true }));
  const faltan = claves.filter(k => !f[k].trim()).length;
  const veh = vehiculos.find(v => v.id === f.vehiculoId);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (faltan) {
      setTocados(Object.fromEntries(claves.map(k => [k, true])));
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await onGuardar({ vehiculoId: f.vehiculoId, problema: f.problema.trim(), fecha: f.fecha, costo: Number(f.costo), estado, piezas, notas });
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  if (!cargado) return null;

  if (!vehiculos.length) {
    return (
      <div className="empty">
        <Icon name="car" size={32} />
        <p>Primero debes registrar un auto.</p>
        <Link href="/autos/nuevo" className="btn">Registrar auto</Link>
      </div>
    );
  }

  const est = ESTADOS.find(x => x.v === estado)!;

  return (
    <form className="form-layout" onSubmit={enviar} noValidate>
      <div className="form-main">
        <Seccion n={1} titulo="Vehículo y trabajo" descripcion="¿Qué auto entra y qué hay que hacerle?">
          <Campo label="Auto" requerido error={errorDe('vehiculoId')}>
            <select value={f.vehiculoId} onChange={set('vehiculoId')} onBlur={blur('vehiculoId')} aria-invalid={!!errorDe('vehiculoId')}>
              <option value="">Selecciona un vehículo</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.anio} · {v.matricula}</option>)}
            </select>
          </Campo>
          <div>
            <Campo label="Descripción del problema" requerido error={errorDe('problema')}>
              <input placeholder="Ej. Cambio de aceite" value={f.problema} onChange={set('problema')} onBlur={blur('problema')} autoComplete="off" aria-invalid={!!errorDe('problema')} />
            </Campo>
            <div className="sugerencias" role="group" aria-label="Sugerencias">
              {SUGERENCIAS.map(s => (
                <button type="button" key={s} className="sug" onClick={() => setF(p => ({ ...p, problema: s }))}>{s}</button>
              ))}
            </div>
          </div>
        </Seccion>

        <Seccion n={2} titulo="Fecha y costo">
          <div className="form-row">
            <Campo label="Fecha" requerido error={errorDe('fecha')}>
              <input type="date" value={f.fecha} onChange={set('fecha')} onBlur={blur('fecha')} aria-invalid={!!errorDe('fecha')} />
            </Campo>
            <Campo label="Costo" requerido error={errorDe('costo')}>
              <Afijo prefijo="RD$">
                <input type="number" inputMode="decimal" min="0" placeholder="0" value={f.costo} onChange={set('costo')} onBlur={blur('costo')} aria-invalid={!!errorDe('costo')} />
              </Afijo>
            </Campo>
          </div>
        </Seccion>

        <Seccion n={3} titulo="Estado de la orden">
          <div className="seg" role="group" aria-label="Estado">
            {ESTADOS.map(o => (
              <button type="button" key={o.v} aria-pressed={estado === o.v} style={{ ['--c' as string]: o.color }} onClick={() => setEstado(o.v)}>
                <Icon name={o.icon} size={18} /> {o.v}
              </button>
            ))}
          </div>
        </Seccion>

        <Seccion n={4} titulo="Detalles" descripcion="Opcional.">
          <Campo label="Piezas utilizadas"><textarea rows={2} placeholder="Filtro de aceite, aceite 5W30" value={piezas} onChange={e => setPiezas(e.target.value)} /></Campo>
          <Campo label="Notas"><textarea rows={2} placeholder="Observaciones para el equipo" value={notas} onChange={e => setNotas(e.target.value)} /></Campo>
        </Seccion>

        {error && <p className="error" role="alert">{error}</p>}
        <BarraAcciones etiqueta={etiqueta} guardando={guardando} faltan={faltan} onCancelar={onCancelar} />
      </div>

      <aside className="form-aside" aria-label="Resumen de la orden">
        <p className="aside-label">Resumen de la orden</p>
        <div className="preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={veh?.foto || '/img/auto-default.svg'} alt="" />
          <div className="preview-body">
            <p className={`preview-name ${veh ? '' : 'vacio'}`}>{veh ? `${veh.marca} ${veh.modelo}` : 'Selecciona un auto'}</p>
            <div className="preview-line">
              <span className={veh ? '' : 'ghost'}>{veh ? `${veh.anio} · ${veh.propietario}` : 'Propietario'}</span>
              <span className="plate">{veh?.matricula || 'PLACA'}</span>
            </div>
            <div className="preview-line"><span className={f.problema ? '' : 'ghost'}>{f.problema || 'Descripción del trabajo'}</span></div>
            <div className="preview-line"><span>{f.fecha ? formatearFecha(f.fecha) : '—'}</span>
              <span className={`pill ${estado.replace(' ', '-')}`} style={{ color: est.color }}><Icon name={est.icon} size={14} />{estado}</span>
            </div>
            <p className="preview-total">{formatearMonto(Number(f.costo) || 0)}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}
