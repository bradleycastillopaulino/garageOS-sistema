'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  adminApi, ApiError, formatearFecha, formatearMonto, hora12, nombreAuto,
  type Cliente, type ClienteDetalle, type ClienteResumen,
} from '@/lib/api';
import Badge from '@/components/Badge';
import Icon from '@/components/Icons';
import Modal, { Confirmar } from '@/components/Modal';

const CLAVE_SESION = 'garageos-admin';
type Datos = Omit<Cliente, 'id'>;

function Login({ onEntrar }: { onEntrar: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setEnviando(true);
    setError('');
    try {
      onEntrar((await adminApi.login(password)).token);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="admin-login">
      <header className="page-head">
        <div>
          <p className="eyebrow">Acceso restringido</p>
          <h1 className="h1">Administrador</h1>
        </div>
      </header>
      <div className="card">
        <p className="muted-sm" style={{ marginTop: 0 }}>Ingresa la contraseña para ver y gestionar los datos de tus clientes.</p>
        <form className="form" onSubmit={enviar}>
          <label className="field"><span>Contraseña</span>
            <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          {error && <p className="error" role="alert" style={{ margin: 0 }}>{error}</p>}
          <button className="btn btn-block" disabled={!password || enviando}><Icon name="lock" size={18} /> {enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  );
}

function ClienteForm({ inicial, onGuardar }: { inicial?: Cliente; onGuardar: (d: Datos) => Promise<void> }) {
  const [f, setF] = useState<Datos>({
    nombre: inicial?.nombre ?? '',
    telefono: inicial?.telefono ?? '',
    email: inicial?.email ?? '',
    direccion: inicial?.direccion ?? '',
    notas: inicial?.notas ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof Datos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await onGuardar(f);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <label className="field"><span>Nombre completo *</span><input placeholder="Nombre y apellido" value={f.nombre} onChange={set('nombre')} maxLength={120} autoComplete="off" /></label>
      <div className="form-row">
        <label className="field"><span>Teléfono</span><input type="tel" placeholder="809-000-0000" value={f.telefono} onChange={set('telefono')} maxLength={30} autoComplete="off" /></label>
        <label className="field"><span>Correo</span><input type="email" placeholder="cliente@ejemplo.com" value={f.email} onChange={set('email')} maxLength={120} autoComplete="off" /></label>
      </div>
      <label className="field"><span>Dirección</span><input placeholder="Calle, sector, ciudad" value={f.direccion} onChange={set('direccion')} maxLength={200} autoComplete="off" /></label>
      <label className="field"><span>Notas</span><textarea rows={3} placeholder="Preferencias, acuerdos de pago…" value={f.notas} onChange={set('notas')} maxLength={1000} /></label>
      {error && <p className="error" role="alert" style={{ margin: 0 }}>{error}</p>}
      <button className="btn btn-block" disabled={!f.nombre.trim() || guardando}>{guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Agregar cliente'}</button>
    </form>
  );
}

/** Genera un CSV (compatible con Excel) sin permitir que una celda se interprete como fórmula. */
function descargarCsv(clientes: ClienteResumen[]) {
  const celda = (v: string | number) => {
    let t = String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const filas = [
    ['Nombre', 'Teléfono', 'Correo', 'Dirección', 'Vehículos', 'Servicios', 'Total pagado', 'Por cobrar', 'Última visita', 'Notas'],
    ...clientes.map(c => [c.nombre, c.telefono, c.email, c.direccion, c.vehiculos, c.servicios, c.totalPagado, c.totalPendiente, c.ultimaVisita ?? '', c.notas]),
  ];
  const csv = '﻿' + filas.map(f => f.map(celda).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clientes-garageos.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function Detalle({ datos, onVolver, onEditar, onEliminar }: {
  datos: ClienteDetalle; onVolver: () => void; onEditar: () => void; onEliminar: () => void;
}) {
  const { cliente: c, vehiculos, servicios, citas } = datos;
  const auto = (id: string) => nombreAuto(vehiculos.find(v => v.id === id));

  return (
    <>
      <button type="button" className="back cli-name" onClick={onVolver}><Icon name="back" size={18} /> Todos los clientes</button>
      <header className="page-head">
        <div>
          <p className="eyebrow">Ficha del cliente</p>
          <h1 className="h1">{c.nombre}</h1>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={onEditar}><Icon name="edit" size={18} /> Editar</button>
          <button className="btn btn-ghost btn-danger-text" onClick={onEliminar}><Icon name="trash" size={18} /> Eliminar</button>
        </div>
      </header>

      <dl className="spec">
        <div><dt>Teléfono</dt><dd>{c.telefono ? <a href={`tel:${c.telefono}`}>{c.telefono}</a> : 'Sin registrar'}</dd></div>
        <div><dt>Correo</dt><dd>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : 'Sin registrar'}</dd></div>
        <div><dt>Dirección</dt><dd>{c.direccion || 'Sin registrar'}</dd></div>
        <div><dt>Notas</dt><dd>{c.notas || 'Sin notas'}</dd></div>
      </dl>

      <section className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat"><span className="stat-icon"><Icon name="wrench" /></span><span className="stat-num">{c.servicios}</span><span className="stat-label">Servicios realizados o en curso</span></div>
        <div className="stat"><span className="stat-icon"><Icon name="cash" /></span><span className="stat-num sm">{formatearMonto(c.totalPagado)}</span><span className="stat-label">Total en servicios completados</span></div>
        <div className="stat"><span className="stat-icon"><Icon name="clock" /></span><span className="stat-num sm">{formatearMonto(c.totalPendiente)}</span><span className="stat-label">Por cobrar (órdenes abiertas)</span></div>
      </section>

      <h2 className="h2">Vehículos <span className="count">{vehiculos.length}</span></h2>
      {vehiculos.length ? (
        <div className="panel">
          {vehiculos.map(v => (
            <Link className="row" key={v.id} href={`/autos/${v.id}`}>
              <div className="row-main"><p className="row-title">{nombreAuto(v)}</p><p className="row-sub">{v.color}</p></div>
              <span className="plate">{v.matricula}</span>
              <Icon name="arrow" size={18} />
            </Link>
          ))}
        </div>
      ) : <p className="muted-sm">Sin vehículos. Registra un auto con el nombre de este cliente como propietario para vincularlo.</p>}

      <h2 className="h2">Historial de servicios <span className="count">{servicios.length}</span></h2>
      {servicios.length ? (
        <div className="panel">
          {servicios.map(s => (
            <div className="row" key={s.id}>
              <div className="row-main"><p className="row-title">{s.problema}</p><p className="row-sub">{formatearFecha(s.fecha)} · {auto(s.vehiculoId)}</p></div>
              <Badge estado={s.estado} />
              <span className="row-amount">{formatearMonto(s.costo)}</span>
            </div>
          ))}
        </div>
      ) : <p className="muted-sm">Todavía no tiene servicios.</p>}

      <h2 className="h2">Citas <span className="count">{citas.length}</span></h2>
      {citas.length ? (
        <div className="panel">
          {citas.map(t => (
            <div className="row" key={t.id}>
              <div className="row-main"><p className="row-title">{t.motivo}</p><p className="row-sub">{formatearFecha(t.fecha)} · {hora12(t.hora)} · {auto(t.vehiculoId)}</p></div>
              <span className={`pill ${t.estado}`}>{t.estado}</span>
            </div>
          ))}
        </div>
      ) : <p className="muted-sm">No tiene citas registradas.</p>}
    </>
  );
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [cargado, setCargado] = useState(false);
  const [detalle, setDetalle] = useState<ClienteDetalle | null>(null);
  const [q, setQ] = useState('');
  const [soloDeuda, setSoloDeuda] = useState(false);
  const [modal, setModal] = useState<{ editar?: Cliente } | null>(null);
  const [borrando, setBorrando] = useState<Cliente | null>(null);
  const [error, setError] = useState('');

  const salir = useCallback(() => {
    sessionStorage.removeItem(CLAVE_SESION);
    setToken(null);
    setClientes([]);
    setDetalle(null);
    setModal(null);
    setBorrando(null);
    setCargado(false);
    setError('');
  }, []);

  /** Ejecuta una llamada protegida; si la sesión venció vuelve al inicio de sesión. */
  const fallo = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) salir();
    else setError((err as Error).message);
  }, [salir]);

  useEffect(() => {
    setToken(sessionStorage.getItem(CLAVE_SESION));
    setListo(true);
  }, []);

  const cargar = useCallback(() => {
    if (!token) return;
    adminApi.clientes(token).then(setClientes).catch(fallo).finally(() => setCargado(true));
  }, [token, fallo]);
  useEffect(cargar, [cargar]);

  const abrir = (id: string) => {
    if (!token) return;
    setError('');
    adminApi.cliente(token, id).then(setDetalle).catch(fallo);
  };

  if (!listo) return null;
  if (!token) {
    return <Login onEntrar={t => { sessionStorage.setItem(CLAVE_SESION, t); setToken(t); }} />;
  }

  const filtro = q.trim().toLowerCase();
  const lista = clientes
    .filter(c => !filtro || `${c.nombre} ${c.telefono} ${c.email} ${c.direccion}`.toLowerCase().includes(filtro))
    .filter(c => !soloDeuda || c.totalPendiente > 0);
  const pagado = clientes.reduce((t, c) => t + c.totalPagado, 0);
  const pendiente = clientes.reduce((t, c) => t + c.totalPendiente, 0);

  return (
    <>
      {error && <p className="error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      {detalle ? (
        <Detalle
          datos={detalle}
          onVolver={() => { setDetalle(null); setError(''); cargar(); }}
          onEditar={() => setModal({ editar: detalle.cliente })}
          onEliminar={() => setBorrando(detalle.cliente)}
        />
      ) : (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">Panel del administrador</p>
              <h1 className="h1">Clientes</h1>
            </div>
            <div className="head-actions">
              <button className="btn btn-ghost" onClick={() => { adminApi.logout(token).catch(() => {}); salir(); }}>Cerrar sesión</button>
              <button className="btn btn-ghost" onClick={() => descargarCsv(lista)} disabled={!lista.length}><Icon name="download" size={18} /> Exportar CSV</button>
              <button className="btn" onClick={() => setModal({})}><Icon name="plus" /> Agregar cliente</button>
            </div>
          </header>

          <section className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat"><span className="stat-icon"><Icon name="user" /></span><span className="stat-num">{clientes.length}</span><span className="stat-label">Clientes registrados</span></div>
            <div className="stat"><span className="stat-icon"><Icon name="cash" /></span><span className="stat-num sm">{formatearMonto(pagado)}</span><span className="stat-label">Total en servicios completados</span></div>
            <div className="stat"><span className="stat-icon"><Icon name="clock" /></span><span className="stat-num sm">{formatearMonto(pendiente)}</span><span className="stat-label">Por cobrar (órdenes abiertas)</span></div>
          </section>

          <div className="toolbar" style={{ marginTop: 20 }}>
            <label className="search">
              <Icon name="search" />
              <span className="sr-only">Buscar clientes</span>
              <input placeholder="Buscar por nombre, teléfono, correo o dirección" value={q} onChange={e => setQ(e.target.value)} />
            </label>
            <button className="chip" aria-pressed={soloDeuda} onClick={() => setSoloDeuda(v => !v)}>Con saldo pendiente</button>
          </div>

          {lista.length ? (
            <div className="panel">
              {lista.map(c => (
                <div className="row cli-row" key={c.id}>
                  <div className="row-main">
                    <p className="row-title"><button type="button" className="cli-name" onClick={() => abrir(c.id)}>{c.nombre}</button></p>
                    <p className="row-sub">{[c.telefono, c.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
                  </div>
                  <div className="cli-num"><b>{c.vehiculos}</b><span>Vehículos</span></div>
                  <div className="cli-num"><b>{formatearMonto(c.totalPendiente)}</b><span>Por cobrar</span></div>
                  <div className="row-tools">
                    <button className="btn btn-ghost btn-sm" onClick={() => abrir(c.id)}>Ver ficha</button>
                    <button className="icon-btn" aria-label={`Editar ${c.nombre}`} onClick={() => setModal({ editar: c })}><Icon name="edit" size={18} /></button>
                    <button className="icon-btn" aria-label={`Eliminar ${c.nombre}`} onClick={() => setBorrando(c)}><Icon name="trash" size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : cargado ? (
            <div className="empty">
              <Icon name="user" size={32} />
              <p>{clientes.length ? 'Ningún cliente coincide con los filtros.' : 'Todavía no hay clientes registrados.'}</p>
              {!clientes.length && <button className="btn" onClick={() => setModal({})}>Agregar el primero</button>}
            </div>
          ) : null}
        </>
      )}

      <Modal abierto={!!modal} titulo={modal?.editar ? 'Editar cliente' : 'Agregar cliente'} onCerrar={() => setModal(null)}>
        {modal && (
          <ClienteForm
            inicial={modal.editar}
            onGuardar={async d => {
              try {
                if (modal.editar) await adminApi.actualizar(token, modal.editar.id, d); else await adminApi.crear(token, d);
              } catch (err) {
                if (err instanceof ApiError && err.status === 401) salir();
                throw err;
              }
              setModal(null);
              setError('');
              cargar();
              if (detalle) abrir(detalle.cliente.id);
            }}
          />
        )}
      </Modal>

      <Confirmar
        abierto={!!borrando}
        titulo="Eliminar cliente"
        mensaje={`¿Eliminar a "${borrando?.nombre ?? ''}"? Solo se puede eliminar un cliente sin vehículos. Esta acción no se puede deshacer.`}
        onCerrar={() => setBorrando(null)}
        onConfirmar={async () => {
          if (!borrando) return;
          const id = borrando.id;
          setBorrando(null);
          setError('');
          try {
            await adminApi.eliminar(token, id);
            setDetalle(null);
            cargar();
          } catch (err) {
            fallo(err);
          }
        }}
      />
    </>
  );
}
