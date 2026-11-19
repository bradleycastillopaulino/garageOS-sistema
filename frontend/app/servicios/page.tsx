'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, formatearFecha, formatearMonto, nombreAuto, type EstadoServicio, type Servicio, type Vehiculo } from '@/lib/api';
import Icon from '@/components/Icons';
import Modal, { Confirmar } from '@/components/Modal';
import ServicioForm from '@/components/ServicioForm';

const COLUMNAS: { estado: EstadoServicio; color: string; siguiente?: EstadoServicio; accion?: string; previo?: EstadoServicio }[] = [
  { estado: 'Pendiente', color: 'var(--idle)', siguiente: 'En proceso', accion: 'Iniciar' },
  { estado: 'En proceso', color: 'var(--warn)', siguiente: 'Completado', accion: 'Completar', previo: 'Pendiente' },
  { estado: 'Completado', color: 'var(--ok)', previo: 'En proceso' },
];

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargado, setCargado] = useState(false);
  const [q, setQ] = useState('');
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [borrando, setBorrando] = useState<Servicio | null>(null);

  const cargar = useCallback(() => {
    Promise.all([api.servicios(), api.vehiculos()])
      .then(([s, v]) => { setServicios(s); setVehiculos(v); })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  useEffect(cargar, [cargar]);

  const auto = (id: string) => vehiculos.find(v => v.id === id);
  const filtro = q.trim().toLowerCase();
  const visibles = servicios.filter(s => {
    if (!filtro) return true;
    const v = auto(s.vehiculoId);
    return [s.problema, s.piezas, s.notas, v?.marca, v?.modelo, v?.matricula, v?.propietario].join(' ').toLowerCase().includes(filtro);
  });

  async function mover(s: Servicio, estado: EstadoServicio) {
    const nuevo = await api.estadoServicio(s.id, estado);
    setServicios(prev => prev.map(x => (x.id === s.id ? nuevo : x)));
  }

  const totalAbierto = servicios.filter(s => s.estado !== 'Completado').reduce((t, s) => t + s.costo, 0);

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatearMonto(totalAbierto)} por cobrar en órdenes abiertas</p>
          <h1 className="h1">Servicios</h1>
        </div>
        <Link href="/servicios/nuevo" className="btn"><Icon name="plus" /> Nueva orden</Link>
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <span className="sr-only">Buscar órdenes</span>
          <input placeholder="Buscar por problema, auto, placa o dueño" value={q} onChange={e => setQ(e.target.value)} />
        </label>
      </div>

      {servicios.length ? (
        <div className="board">
          {COLUMNAS.map(c => {
            const items = visibles.filter(s => s.estado === c.estado);
            const suma = items.reduce((t, s) => t + s.costo, 0);
            return (
              <section className="col" key={c.estado} aria-label={c.estado}>
                <div className="col-head">
                  <span><i className="dot" style={{ background: c.color }} />{c.estado}</span>
                  <span className="col-count">{items.length} · {formatearMonto(suma)}</span>
                </div>
                {items.length ? items.map(s => {
                  const v = auto(s.vehiculoId);
                  return (
                    <article className="order" key={s.id}>
                      <div className="order-top">
                        <p className="order-title">{s.problema}</p>
                        {v && <span className="plate" style={{ fontSize: 13 }}>{v.matricula}</span>}
                      </div>
                      <p className="order-sub">{nombreAuto(v)}</p>
                      {s.piezas && <p className="order-sub">Piezas: {s.piezas}</p>}
                      <div className="order-foot"><span>{formatearFecha(s.fecha)}</span><b>{formatearMonto(s.costo)}</b></div>
                      <div className="order-actions">
                        {c.siguiente && (
                          <button className="btn btn-sm" onClick={() => mover(s, c.siguiente!)}>
                            <Icon name={c.siguiente === 'Completado' ? 'check' : 'play'} size={16} /> {c.accion}
                          </button>
                        )}
                        {c.previo && <button className="btn btn-sm btn-ghost" onClick={() => mover(s, c.previo!)}>Reabrir</button>}
                        <span className="spacer" />
                        <button className="icon-btn" aria-label={`Editar ${s.problema}`} onClick={() => setEditando(s)}><Icon name="edit" size={18} /></button>
                        <button className="icon-btn" aria-label={`Eliminar ${s.problema}`} onClick={() => setBorrando(s)}><Icon name="trash" size={18} /></button>
                      </div>
                    </article>
                  );
                }) : <p className="order-sub" style={{ padding: '8px 4px' }}>Sin órdenes</p>}
              </section>
            );
          })}
        </div>
      ) : cargado ? (
        <div className="empty">
          <Icon name="wrench" size={32} />
          <p>Todavía no hay servicios registrados.</p>
          <Link href="/servicios/nuevo" className="btn">Crear la primera orden</Link>
        </div>
      ) : null}

      <Modal abierto={!!editando} titulo="Editar orden" onCerrar={() => setEditando(null)}>
        {editando && (
          <ServicioForm
            inicial={editando}
            etiqueta="Guardar cambios"
            onCancelar={() => setEditando(null)}
            onGuardar={async d => { await api.actualizarServicio(editando.id, d); setEditando(null); cargar(); }}
          />
        )}
      </Modal>

      <Confirmar
        abierto={!!borrando}
        titulo="Eliminar orden"
        mensaje={`¿Eliminar la orden "${borrando?.problema ?? ''}"? Esta acción no se puede deshacer.`}
        onCerrar={() => setBorrando(null)}
        onConfirmar={async () => { if (borrando) { await api.eliminarServicio(borrando.id); setBorrando(null); cargar(); } }}
      />
    </>
  );
}
