'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, formatearMonto, type Repuesto } from '@/lib/api';
import Icon from '@/components/Icons';
import Modal, { Confirmar } from '@/components/Modal';

type Datos = Omit<Repuesto, 'id'>;
const CATEGORIAS = ['Aceites y fluidos', 'Filtros', 'Frenos', 'Motor', 'Suspensión', 'Eléctrico', 'Neumáticos', 'General'];

function RepuestoForm({ inicial, onGuardar }: { inicial?: Repuesto; onGuardar: (d: Datos) => Promise<void> }) {
  const [f, setF] = useState({
    nombre: inicial?.nombre ?? '',
    sku: inicial?.sku ?? '',
    categoria: inicial?.categoria ?? 'General',
    stock: String(inicial?.stock ?? 0),
    minimo: String(inicial?.minimo ?? 2),
    costo: String(inicial?.costo ?? ''),
    precio: String(inicial?.precio ?? ''),
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));
  const valido = f.nombre.trim() !== '' && f.stock !== '' && f.minimo !== '';

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    setError('');
    try {
      await onGuardar({
        nombre: f.nombre.trim(), sku: f.sku.trim(), categoria: f.categoria,
        stock: Number(f.stock), minimo: Number(f.minimo), costo: Number(f.costo || 0), precio: Number(f.precio || 0),
      });
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form className="form" onSubmit={enviar}>
      <label className="field"><span>Nombre del repuesto</span><input placeholder="Filtro de aceite" value={f.nombre} onChange={set('nombre')} autoComplete="off" /></label>
      <div className="form-row">
        <label className="field"><span>Código / SKU</span><input placeholder="FO-1234" value={f.sku} onChange={set('sku')} autoComplete="off" /></label>
        <label className="field"><span>Categoría</span>
          <select value={f.categoria} onChange={set('categoria')}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select>
        </label>
      </div>
      <div className="form-row">
        <label className="field"><span>Stock actual</span><input type="number" min="0" inputMode="numeric" value={f.stock} onChange={set('stock')} /></label>
        <label className="field"><span>Stock mínimo (alerta)</span><input type="number" min="0" inputMode="numeric" value={f.minimo} onChange={set('minimo')} /></label>
      </div>
      <div className="form-row">
        <label className="field"><span>Costo (RD$)</span><input type="number" min="0" inputMode="decimal" placeholder="0" value={f.costo} onChange={set('costo')} /></label>
        <label className="field"><span>Precio de venta (RD$)</span><input type="number" min="0" inputMode="decimal" placeholder="0" value={f.precio} onChange={set('precio')} /></label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-block" disabled={!valido || guardando}>{guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Agregar repuesto'}</button>
    </form>
  );
}

export default function Inventario() {
  const [items, setItems] = useState<Repuesto[]>([]);
  const [cargado, setCargado] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [soloBajo, setSoloBajo] = useState(false);
  const [modal, setModal] = useState<{ editar?: Repuesto } | null>(null);
  const [borrando, setBorrando] = useState<Repuesto | null>(null);

  const cargar = useCallback(() => {
    api.repuestos().then(setItems).catch(() => {}).finally(() => setCargado(true));
  }, []);
  useEffect(cargar, [cargar]);

  const categorias = useMemo(() => [...new Set(items.map(i => i.categoria))].sort(), [items]);
  const bajo = (r: Repuesto) => r.stock <= r.minimo;
  const filtro = q.trim().toLowerCase();
  const lista = items
    .filter(r => !filtro || `${r.nombre} ${r.sku} ${r.categoria}`.toLowerCase().includes(filtro))
    .filter(r => !cat || r.categoria === cat)
    .filter(r => !soloBajo || bajo(r));

  const valor = items.reduce((t, r) => t + r.stock * r.costo, 0);
  const nBajo = items.filter(bajo).length;

  async function ajustar(r: Repuesto, delta: number) {
    const nuevo = await api.ajustarStock(r.id, delta);
    setItems(prev => prev.map(x => (x.id === r.id ? nuevo : x)));
  }

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Repuestos y materiales</p>
          <h1 className="h1">Inventario</h1>
        </div>
        <button className="btn" onClick={() => setModal({})}><Icon name="plus" /> Agregar repuesto</button>
      </header>

      <section className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat"><span className="stat-icon"><Icon name="box" /></span><span className="stat-num">{items.length}</span><span className="stat-label">Artículos</span></div>
        <div className={`stat ${nBajo ? 'stat-alert' : ''}`}><span className="stat-icon"><Icon name="alert" /></span><span className="stat-num">{nBajo}</span><span className="stat-label">Stock bajo o agotado</span></div>
        <div className="stat"><span className="stat-icon"><Icon name="cash" /></span><span className="stat-num sm">{formatearMonto(valor)}</span><span className="stat-label">Valor del inventario (costo)</span></div>
      </section>

      <div className="toolbar" style={{ marginTop: 20 }}>
        <label className="search">
          <Icon name="search" />
          <span className="sr-only">Buscar repuestos</span>
          <input placeholder="Buscar por nombre, código o categoría" value={q} onChange={e => setQ(e.target.value)} />
        </label>
        <button className="chip" aria-pressed={soloBajo} onClick={() => setSoloBajo(v => !v)}>Stock bajo</button>
      </div>
      {categorias.length > 1 && (
        <div className="chips" style={{ marginBottom: 16 }}>
          <button className="chip" aria-pressed={cat === ''} onClick={() => setCat('')}>Todas</button>
          {categorias.map(c => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}

      {lista.length ? (
        <div className="panel">
          {lista.map(r => {
            const pct = Math.min(100, (r.stock / Math.max(r.minimo * 3, 1)) * 100);
            const estado = r.stock === 0 ? 'out' : bajo(r) ? 'low' : 'ok';
            return (
              <div className="row inv-row" key={r.id}>
                <div className="row-main">
                  <p className="row-title">{r.nombre}</p>
                  <p className="row-sub">{r.categoria}{r.sku ? ` · ${r.sku}` : ''} · Venta {formatearMonto(r.precio)}</p>
                  <div className="stockbar" aria-hidden="true"><span className={estado} style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="stepper" role="group" aria-label={`Stock de ${r.nombre}`}>
                  <button className="icon-btn" onClick={() => ajustar(r, -1)} disabled={r.stock === 0} aria-label="Restar una unidad"><Icon name="minus" size={18} /></button>
                  <span className={`stock-num ${estado}`} aria-live="polite">{r.stock}</span>
                  <button className="icon-btn" onClick={() => ajustar(r, 1)} aria-label="Sumar una unidad"><Icon name="plus" size={18} /></button>
                </div>
                <span className={`stock-pill ${estado}`}>{estado === 'out' ? 'Agotado' : estado === 'low' ? 'Bajo' : 'OK'}</span>
                <div className="row-tools">
                  <button className="icon-btn" aria-label={`Editar ${r.nombre}`} onClick={() => setModal({ editar: r })}><Icon name="edit" size={18} /></button>
                  <button className="icon-btn" aria-label={`Eliminar ${r.nombre}`} onClick={() => setBorrando(r)}><Icon name="trash" size={18} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : cargado ? (
        <div className="empty">
          <Icon name="box" size={32} />
          <p>{items.length ? 'Ningún repuesto coincide con los filtros.' : 'Todavía no hay repuestos en el inventario.'}</p>
          {!items.length && <button className="btn" onClick={() => setModal({})}>Agregar el primero</button>}
        </div>
      ) : null}

      <Modal abierto={!!modal} titulo={modal?.editar ? 'Editar repuesto' : 'Agregar repuesto'} onCerrar={() => setModal(null)}>
        {modal && (
          <RepuestoForm
            inicial={modal.editar}
            onGuardar={async d => {
              if (modal.editar) await api.actualizarRepuesto(modal.editar.id, d); else await api.crearRepuesto(d);
              setModal(null);
              cargar();
            }}
          />
        )}
      </Modal>

      <Confirmar
        abierto={!!borrando}
        titulo="Eliminar repuesto"
        mensaje={`¿Eliminar "${borrando?.nombre ?? ''}" del inventario? Esta acción no se puede deshacer.`}
        onCerrar={() => setBorrando(null)}
        onConfirmar={async () => { if (borrando) { await api.eliminarRepuesto(borrando.id); setBorrando(null); cargar(); } }}
      />
    </>
  );
}
