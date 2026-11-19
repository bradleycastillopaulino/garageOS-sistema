'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, formatearMonto, type Servicio, type Vehiculo } from '@/lib/api';
import Icon from '@/components/Icons';

type Orden = 'recientes' | 'marca' | 'abiertas';

export default function Autos() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [q, setQ] = useState('');
  const [orden, setOrden] = useState<Orden>('recientes');
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    Promise.all([api.vehiculos(), api.servicios()])
      .then(([v, s]) => { setVehiculos(v); setServicios(s); })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  const info = useMemo(() => {
    const m = new Map<string, { abiertas: number; gastado: number }>();
    for (const s of servicios) {
      const x = m.get(s.vehiculoId) ?? { abiertas: 0, gastado: 0 };
      if (s.estado !== 'Completado') x.abiertas++;
      x.gastado += s.costo;
      m.set(s.vehiculoId, x);
    }
    return m;
  }, [servicios]);

  const filtro = q.trim().toLowerCase();
  const lista = vehiculos
    .filter(v => !filtro || [v.marca, v.modelo, v.matricula, v.propietario, v.color].join(' ').toLowerCase().includes(filtro))
    .filter(v => !soloAbiertos || (info.get(v.id)?.abiertas ?? 0) > 0)
    .sort((a, b) =>
      orden === 'marca' ? `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`)
      : orden === 'abiertas' ? (info.get(b.id)?.abiertas ?? 0) - (info.get(a.id)?.abiertas ?? 0)
      : b.id.localeCompare(a.id));

  const enTaller = vehiculos.filter(v => (info.get(v.id)?.abiertas ?? 0) > 0).length;

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">{vehiculos.length} registrados · {enTaller} en taller</p>
          <h1 className="h1">Autos</h1>
        </div>
        <Link href="/autos/nuevo" className="btn"><Icon name="plus" /> Agregar auto</Link>
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <span className="sr-only">Buscar autos</span>
          <input placeholder="Buscar por marca, modelo, placa o dueño" value={q} onChange={e => setQ(e.target.value)} />
        </label>
        <button className="chip" aria-pressed={soloAbiertos} onClick={() => setSoloAbiertos(v => !v)}>En el taller</button>
        <label className="select-inline">
          <span className="sr-only">Ordenar por</span>
          <select value={orden} onChange={e => setOrden(e.target.value as Orden)}>
            <option value="recientes">Más recientes</option>
            <option value="marca">Marca (A-Z)</option>
            <option value="abiertas">Más órdenes abiertas</option>
          </select>
        </label>
      </div>

      {lista.length ? (
        <div className="grid-cars">
          {lista.map(v => {
            const i = info.get(v.id);
            return (
              <Link className="car-card" key={v.id} href={`/autos/${v.id}`}>
                <div className="car-photo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="car-photo" src={v.foto || '/img/auto-default.svg'} alt={`${v.marca} ${v.modelo}`} />
                  {!!i?.abiertas && <span className="car-flag"><Icon name="wrench" size={14} /> {i.abiertas} abierta{i.abiertas > 1 ? 's' : ''}</span>}
                </div>
                <div className="car-body">
                  <h3 className="car-name">{v.marca} {v.modelo}</h3>
                  <div className="car-meta"><span>{v.anio} · {v.color}</span><span className="plate">{v.matricula}</span></div>
                  <div className="car-meta"><span><Icon name="user" size={14} /> {v.propietario}</span><span>{formatearMonto(i?.gastado ?? 0)}</span></div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : cargado ? (
        <div className="empty">
          <Icon name="car" size={32} />
          <p>{vehiculos.length ? 'Ningún auto coincide con los filtros.' : 'Todavía no hay autos registrados.'}</p>
          {!vehiculos.length && <Link href="/autos/nuevo" className="btn">Registrar el primero</Link>}
        </div>
      ) : null}
    </>
  );
}
