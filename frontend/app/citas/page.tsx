'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { api, etiquetaDia, hora12, isoLocal, nombreAuto, type Cita, type Vehiculo } from '@/lib/api';
import Icon from '@/components/Icons';
import Modal, { Confirmar } from '@/components/Modal';
import Link from 'next/link';

type Vista = 'proximas' | 'hoy' | 'pasadas' | 'todas';

function CitaForm({ inicial, vehiculos, vehiculoIdInicial, onGuardar }: {
  inicial?: Cita; vehiculos: Vehiculo[]; vehiculoIdInicial?: string; onGuardar: (d: Omit<Cita, 'id'>) => Promise<void>;
}) {
  const [vehiculoId, setVehiculoId] = useState(inicial?.vehiculoId ?? vehiculoIdInicial ?? '');
  const [fecha, setFecha] = useState(inicial?.fecha ?? isoLocal(1));
  const [hora, setHora] = useState(inicial?.hora ?? '09:00');
  const [motivo, setMotivo] = useState(inicial?.motivo ?? '');
  const [notas, setNotas] = useState(inicial?.notas ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const valido = !!(vehiculoId && fecha && hora && motivo.trim());

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    setError('');
    try {
      await onGuardar({ vehiculoId, fecha, hora, motivo: motivo.trim(), notas, estado: inicial?.estado ?? 'Programada' });
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form className="form" onSubmit={enviar}>
      <label className="field"><span>Auto</span>
        <select value={vehiculoId} onChange={e => setVehiculoId(e.target.value)}>
          <option value="">Selecciona un vehículo</option>
          {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.anio} · {v.matricula}</option>)}
        </select>
      </label>
      <div className="form-row">
        <label className="field"><span>Fecha</span><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></label>
        <label className="field"><span>Hora</span><input type="time" value={hora} onChange={e => setHora(e.target.value)} /></label>
      </div>
      <label className="field"><span>Motivo de la visita</span><input placeholder="Revisión de frenos" value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
      <label className="field"><span>Notas</span><textarea rows={2} placeholder="Detalles para el mecánico" value={notas} onChange={e => setNotas(e.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-block" disabled={!valido || guardando}>{guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Agendar cita'}</button>
    </form>
  );
}

function Contenido() {
  const router = useRouter();
  const params = useSearchParams();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargado, setCargado] = useState(false);
  const [vista, setVista] = useState<Vista>('proximas');
  const [modal, setModal] = useState<{ editar?: Cita } | null>(params.get('nueva') ? {} : null);
  const [borrando, setBorrando] = useState<Cita | null>(null);

  const cargar = useCallback(() => {
    Promise.all([api.citas(), api.vehiculos()])
      .then(([c, v]) => { setCitas(c); setVehiculos(v); })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);
  useEffect(cargar, [cargar]);

  const hoy = isoLocal();
  const auto = (id: string) => vehiculos.find(v => v.id === id);
  const filtradas = citas.filter(c =>
    vista === 'todas' ? true
    : vista === 'hoy' ? c.fecha === hoy
    : vista === 'pasadas' ? c.fecha < hoy
    : c.fecha >= hoy);
  const ordenadas = vista === 'pasadas' ? [...filtradas].reverse() : filtradas;
  const dias = [...new Set(ordenadas.map(c => c.fecha))];
  const nHoy = citas.filter(c => c.fecha === hoy && c.estado === 'Programada').length;

  async function atender(c: Cita) {
    await api.convertirCita(c.id);
    router.push('/servicios');
  }
  async function cambiar(c: Cita, estado: Cita['estado']) {
    const n = await api.estadoCita(c.id, estado);
    setCitas(prev => prev.map(x => (x.id === c.id ? n : x)));
  }

  const VISTAS: { id: Vista; texto: string }[] = [
    { id: 'proximas', texto: 'Próximas' }, { id: 'hoy', texto: `Hoy${nHoy ? ` (${nHoy})` : ''}` },
    { id: 'pasadas', texto: 'Pasadas' }, { id: 'todas', texto: 'Todas' },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">{nHoy ? `${nHoy} cita${nHoy > 1 ? 's' : ''} para hoy` : 'Agenda del taller'}</p>
          <h1 className="h1">Citas</h1>
        </div>
        <button className="btn" onClick={() => setModal({})}><Icon name="plus" /> Agendar cita</button>
      </header>

      <div className="chips" style={{ marginBottom: 20 }} role="group" aria-label="Filtrar citas">
        {VISTAS.map(v => <button key={v.id} className="chip" aria-pressed={vista === v.id} onClick={() => setVista(v.id)}>{v.texto}</button>)}
      </div>

      {dias.length ? dias.map(dia => (
        <section key={dia} className="day">
          <h2 className="day-title">{etiquetaDia(dia)} <span>{dia}</span></h2>
          <div className="panel">
            {ordenadas.filter(c => c.fecha === dia).map(c => {
              const v = auto(c.vehiculoId);
              const activa = c.estado === 'Programada';
              return (
                <div className={`row cita ${activa ? '' : 'cita-off'}`} key={c.id}>
                  <span className="time">{hora12(c.hora)}</span>
                  <div className="row-main">
                    <p className="row-title">{c.motivo}</p>
                    <p className="row-sub">{nombreAuto(v)}{c.notas ? ` · ${c.notas}` : ''}</p>
                  </div>
                  {v && <span className="plate" style={{ fontSize: 14 }}>{v.matricula}</span>}
                  <span className={`pill ${c.estado}`}>{c.estado}</span>
                  <div className="row-tools">
                    {activa && <button className="btn btn-sm" onClick={() => atender(c)}><Icon name="play" size={16} /> Atender</button>}
                    {activa && <button className="btn btn-sm btn-ghost" onClick={() => cambiar(c, 'Cancelada')}>Cancelar</button>}
                    {c.estado === 'Cancelada' && <button className="btn btn-sm btn-ghost" onClick={() => cambiar(c, 'Programada')}>Reprogramar</button>}
                    <button className="icon-btn" aria-label={`Editar cita ${c.motivo}`} onClick={() => setModal({ editar: c })}><Icon name="edit" size={18} /></button>
                    <button className="icon-btn" aria-label={`Eliminar cita ${c.motivo}`} onClick={() => setBorrando(c)}><Icon name="trash" size={18} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )) : cargado ? (
        <div className="empty">
          <Icon name="calendar" size={32} />
          <p>{citas.length ? 'No hay citas en esta vista.' : 'Todavía no hay citas agendadas.'}</p>
          {vehiculos.length ? <button className="btn" onClick={() => setModal({})}>Agendar una cita</button> : <Link href="/autos/nuevo" className="btn">Primero registra un auto</Link>}
        </div>
      ) : null}

      <Modal abierto={!!modal} titulo={modal?.editar ? 'Editar cita' : 'Agendar cita'} onCerrar={() => setModal(null)}>
        {modal && (
          <CitaForm
            inicial={modal.editar}
            vehiculos={vehiculos}
            vehiculoIdInicial={params.get('vehiculoId') ?? ''}
            onGuardar={async d => {
              if (modal.editar) await api.actualizarCita(modal.editar.id, d); else await api.crearCita(d);
              setModal(null);
              cargar();
            }}
          />
        )}
      </Modal>

      <Confirmar
        abierto={!!borrando}
        titulo="Eliminar cita"
        mensaje={`¿Eliminar la cita "${borrando?.motivo ?? ''}"?`}
        onCerrar={() => setBorrando(null)}
        onConfirmar={async () => { if (borrando) { await api.eliminarCita(borrando.id); setBorrando(null); cargar(); } }}
      />
    </>
  );
}

export default function Citas() {
  return <Suspense fallback={null}><Contenido /></Suspense>;
}
