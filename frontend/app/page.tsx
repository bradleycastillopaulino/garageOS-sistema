'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  api, etiquetaDia, formatearMonto, hora12, isoLocal, nombreAuto, ultimosMeses,
  type Cita, type Repuesto, type Servicio, type Vehiculo,
} from '@/lib/api';
import Badge from '@/components/Badge';
import Icon from '@/components/Icons';

export default function Panel() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.servicios(), api.vehiculos(), api.repuestos(), api.citas()])
      .then(([s, v, r, c]) => { setServicios(s); setVehiculos(v); setRepuestos(r); setCitas(c); })
      .catch(e => setError(e.message));
  }, []);

  const auto = (id: string) => vehiculos.find(v => v.id === id);
  const abiertas = servicios.filter(s => s.estado !== 'Completado');
  const enProceso = servicios.filter(s => s.estado === 'En proceso').length;
  const mesActual = isoLocal().slice(0, 7);
  const ingresosMes = servicios
    .filter(s => s.estado === 'Completado' && s.fecha.startsWith(mesActual))
    .reduce((t, s) => t + s.costo, 0);

  const meses = ultimosMeses(6).map(m => ({
    ...m,
    total: servicios.filter(s => s.estado === 'Completado' && s.fecha.startsWith(m.clave)).reduce((t, s) => t + s.costo, 0),
  }));
  const maxMes = Math.max(...meses.map(m => m.total), 1);

  const hoy = isoLocal();
  const citasHoy = citas.filter(c => c.fecha === hoy && c.estado === 'Programada');
  const proximas = citas.filter(c => c.fecha > hoy && c.estado === 'Programada').slice(0, 3);
  const stockBajo = repuestos.filter(r => r.stock <= r.minimo);

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">{etiquetaDia(hoy)} · resumen del taller</p>
          <h1 className="h1">Panel</h1>
        </div>
        <div className="head-actions">
          <Link href="/citas?nueva=1" className="btn btn-ghost"><Icon name="calendar" /> Agendar cita</Link>
          <Link href="/servicios/nuevo" className="btn"><Icon name="plus" /> Nueva orden</Link>
        </div>
      </header>

      {error && <p className="error">No se pudo conectar con el servidor: {error}</p>}

      <section className="stats" aria-label="Indicadores">
        <Link href="/servicios" className="stat stat-link">
          <span className="stat-icon"><Icon name="wrench" /></span>
          <span className="stat-num">{abiertas.length}</span>
          <span className="stat-label">Órdenes abiertas · {enProceso} en proceso</span>
        </Link>
        <Link href="/autos" className="stat stat-link">
          <span className="stat-icon"><Icon name="car" /></span>
          <span className="stat-num">{vehiculos.length}</span>
          <span className="stat-label">Autos registrados</span>
        </Link>
        <div className="stat">
          <span className="stat-icon"><Icon name="cash" /></span>
          <span className="stat-num sm">{formatearMonto(ingresosMes)}</span>
          <span className="stat-label">Ingresos del mes</span>
        </div>
        <Link href="/inventario" className={`stat stat-link ${stockBajo.length ? 'stat-alert' : ''}`}>
          <span className="stat-icon"><Icon name={stockBajo.length ? 'alert' : 'box'} /></span>
          <span className="stat-num">{stockBajo.length}</span>
          <span className="stat-label">Repuestos con stock bajo</span>
        </Link>
      </section>

      <div className="dash-grid">
        <section className="card">
          <h2 className="card-title">Ingresos · últimos 6 meses</h2>
          <div className="chart" role="img" aria-label={meses.map(m => `${m.etiqueta}: ${formatearMonto(m.total)}`).join(', ')}>
            {meses.map(m => (
              <div className="chart-col" key={m.clave}>
                <span className="chart-val">{m.total ? formatearMonto(m.total).replace('RD$ ', '') : ''}</span>
                <div className="chart-track">
                  <div className={`chart-bar ${m.clave === mesActual ? 'now' : ''}`} style={{ height: `${Math.max((m.total / maxMes) * 100, m.total ? 4 : 0)}%` }} />
                </div>
                <span className="chart-label">{m.etiqueta}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Agenda de hoy</h2>
            <Link href="/citas" className="link-sm">Ver todo <Icon name="arrow" size={14} /></Link>
          </div>
          {citasHoy.length ? citasHoy.map(c => (
            <div className="mini-row" key={c.id}>
              <span className="time">{hora12(c.hora)}</span>
              <div className="row-main">
                <p className="row-title">{c.motivo}</p>
                <p className="row-sub">{nombreAuto(auto(c.vehiculoId))}</p>
              </div>
            </div>
          )) : <p className="muted-sm">No hay citas para hoy.</p>}
          {proximas.length > 0 && (
            <>
              <p className="mini-title">Próximas</p>
              {proximas.map(c => (
                <div className="mini-row" key={c.id}>
                  <span className="time sm">{etiquetaDia(c.fecha)}</span>
                  <div className="row-main"><p className="row-title">{c.motivo}</p><p className="row-sub">{hora12(c.hora)} · {nombreAuto(auto(c.vehiculoId))}</p></div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">En el taller ahora</h2>
            <Link href="/servicios" className="link-sm">Tablero <Icon name="arrow" size={14} /></Link>
          </div>
          {abiertas.length ? abiertas.slice(0, 5).map(s => (
            <div className="mini-row" key={s.id}>
              <div className="row-main">
                <p className="row-title">{s.problema}</p>
                <p className="row-sub">{nombreAuto(auto(s.vehiculoId))}</p>
              </div>
              <Badge estado={s.estado} />
            </div>
          )) : <p className="muted-sm">Sin órdenes abiertas. ¡Todo al día!</p>}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Reponer pronto</h2>
            <Link href="/inventario" className="link-sm">Inventario <Icon name="arrow" size={14} /></Link>
          </div>
          {stockBajo.length ? stockBajo.slice(0, 5).map(r => (
            <div className="mini-row" key={r.id}>
              <div className="row-main"><p className="row-title">{r.nombre}</p><p className="row-sub">{r.categoria} · mínimo {r.minimo}</p></div>
              <span className={`stock-pill ${r.stock === 0 ? 'out' : 'low'}`}>{r.stock === 0 ? 'Agotado' : `${r.stock} uds`}</span>
            </div>
          )) : <p className="muted-sm">Todo el inventario está por encima del mínimo.</p>}
        </section>
      </div>
    </>
  );
}
