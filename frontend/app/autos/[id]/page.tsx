'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';
import { api, etiquetaDia, formatearFecha, formatearMonto, hora12, isoLocal, type Cita, type Servicio, type Vehiculo } from '@/lib/api';
import Badge from '@/components/Badge';
import Icon from '@/components/Icons';
import Modal, { Confirmar } from '@/components/Modal';
import VehiculoForm from '@/components/VehiculoForm';

export default function DetalleAuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [noExiste, setNoExiste] = useState(false);
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(() => {
    api.vehiculo(id).then(setVehiculo).catch(() => setNoExiste(true));
    api.serviciosDeVehiculo(id).then(setServicios).catch(() => {});
    api.citas().then(c => setCitas(c.filter(x => x.vehiculoId === id))).catch(() => {});
  }, [id]);

  useEffect(cargar, [cargar]);

  if (noExiste) return <div className="empty"><Icon name="car" size={32} /><p>Vehículo no encontrado.</p><Link href="/autos" className="btn">Volver a Autos</Link></div>;
  if (!vehiculo) return null;

  const abiertas = servicios.filter(s => s.estado !== 'Completado').length;
  const total = servicios.reduce((t, s) => t + s.costo, 0);
  const proximas = citas.filter(c => c.estado === 'Programada' && c.fecha >= isoLocal());

  return (
    <>
      <Link href="/autos" className="back"><Icon name="back" size={18} /> Autos</Link>

      <div className="detail-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="detail-photo" src={vehiculo.foto || '/img/auto-default.svg'} alt={`${vehiculo.marca} ${vehiculo.modelo}`} />
        <div>
          <p className="eyebrow">{vehiculo.anio} · {vehiculo.color}</p>
          <h1 className="h1">{vehiculo.marca} {vehiculo.modelo}</h1>
          <p style={{ margin: '12px 0 0' }}><span className="plate">{vehiculo.matricula}</span></p>

          <dl className="spec">
            <div><dt>Propietario</dt><dd>{vehiculo.propietario}</dd></div>
            <div><dt>Color</dt><dd>{vehiculo.color}</dd></div>
          </dl>

          <div className="btn-group">
            <Link className="btn" href={`/servicios/nuevo?vehiculoId=${vehiculo.id}`}><Icon name="plus" /> Nueva orden</Link>
            <Link className="btn btn-ghost" href={`/citas?nueva=1&vehiculoId=${vehiculo.id}`}><Icon name="calendar" /> Agendar</Link>
          </div>
          <div className="btn-group" style={{ marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={() => setEditando(true)}><Icon name="edit" /> Editar</button>
            <button className="btn btn-ghost btn-danger-text" onClick={() => setBorrando(true)}><Icon name="trash" /> Eliminar</button>
          </div>
        </div>
      </div>

      <section className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 24 }}>
        <div className="stat"><span className="stat-num">{servicios.length}</span><span className="stat-label">Servicios</span></div>
        <div className="stat"><span className="stat-num">{abiertas}</span><span className="stat-label">Abiertos</span></div>
        <div className="stat"><span className="stat-num sm">{formatearMonto(total)}</span><span className="stat-label">Total gastado</span></div>
      </section>

      {proximas.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2 className="card-title">Próximas citas</h2>
          {proximas.map(c => (
            <div className="mini-row" key={c.id}>
              <span className="time sm">{etiquetaDia(c.fecha)}</span>
              <div className="row-main"><p className="row-title">{c.motivo}</p><p className="row-sub">{hora12(c.hora)}</p></div>
            </div>
          ))}
        </section>
      )}

      <h2 className="h2">Historial <span className="count">{servicios.length} órdenes</span></h2>
      {servicios.length ? (
        <div className="panel">
          {servicios.map(s => (
            <div className="row" key={s.id}>
              <div className="row-main">
                <p className="row-title">{s.problema}</p>
                <p className="row-sub">{formatearFecha(s.fecha)}{s.piezas ? ` · ${s.piezas}` : ''}</p>
              </div>
              <span className="row-amount">{formatearMonto(s.costo)}</span>
              <Badge estado={s.estado} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty"><Icon name="wrench" size={32} /><p>Este vehículo aún no tiene servicios.</p></div>
      )}

      <Modal abierto={editando} titulo="Editar vehículo" onCerrar={() => setEditando(false)}>
        <VehiculoForm
          inicial={vehiculo}
          etiqueta="Guardar cambios"
          onCancelar={() => setEditando(false)}
          onGuardar={async d => { setVehiculo(await api.actualizarVehiculo(id, d)); setEditando(false); }}
        />
      </Modal>

      <Confirmar
        abierto={borrando}
        titulo="Eliminar vehículo"
        mensaje={`Se eliminará ${vehiculo.marca} ${vehiculo.modelo} junto con sus ${servicios.length} servicios y sus citas. Esta acción no se puede deshacer.`}
        onCerrar={() => setBorrando(false)}
        onConfirmar={async () => { await api.eliminarVehiculo(id); router.push('/autos'); }}
      />
    </>
  );
}
