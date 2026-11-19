export type EstadoServicio = 'Pendiente' | 'En proceso' | 'Completado';
export type EstadoCita = 'Programada' | 'Atendida' | 'Cancelada';

export interface Vehiculo {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  matricula: string;
  color: string;
  propietario: string;
  foto: string | null;
}

export interface Servicio {
  id: string;
  vehiculoId: string;
  problema: string;
  fecha: string;
  costo: number;
  estado: EstadoServicio;
  notas: string;
  piezas: string;
}

export interface Repuesto {
  id: string;
  nombre: string;
  sku: string;
  categoria: string;
  stock: number;
  minimo: number;
  costo: number;
  precio: number;
}

export interface Cita {
  id: string;
  vehiculoId: string;
  fecha: string;
  hora: string;
  motivo: string;
  estado: EstadoCita;
  notas: string;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detalle = '';
    try { detalle = (await res.json()).detail; } catch { /* sin cuerpo */ }
    throw new Error(typeof detalle === 'string' && detalle ? detalle : `Error ${res.status} en ${path}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const body = (d: unknown) => JSON.stringify(d);

export const api = {
  // Vehículos
  vehiculos: () => http<Vehiculo[]>('/vehiculos'),
  vehiculo: (id: string) => http<Vehiculo>(`/vehiculos/${id}`),
  crearVehiculo: (d: Omit<Vehiculo, 'id'>) => http<Vehiculo>('/vehiculos', { method: 'POST', body: body(d) }),
  actualizarVehiculo: (id: string, d: Omit<Vehiculo, 'id'>) => http<Vehiculo>(`/vehiculos/${id}`, { method: 'PUT', body: body(d) }),
  eliminarVehiculo: (id: string) => http<void>(`/vehiculos/${id}`, { method: 'DELETE' }),
  serviciosDeVehiculo: (id: string) => http<Servicio[]>(`/vehiculos/${id}/servicios`),
  // Servicios
  servicios: (limit?: number) => http<Servicio[]>(`/servicios${limit ? `?limit=${limit}` : ''}`),
  crearServicio: (d: Omit<Servicio, 'id'>) => http<Servicio>('/servicios', { method: 'POST', body: body(d) }),
  actualizarServicio: (id: string, d: Omit<Servicio, 'id'>) => http<Servicio>(`/servicios/${id}`, { method: 'PUT', body: body(d) }),
  estadoServicio: (id: string, estado: EstadoServicio) => http<Servicio>(`/servicios/${id}/estado`, { method: 'PATCH', body: body({ estado }) }),
  eliminarServicio: (id: string) => http<void>(`/servicios/${id}`, { method: 'DELETE' }),
  // Inventario
  repuestos: () => http<Repuesto[]>('/repuestos'),
  crearRepuesto: (d: Omit<Repuesto, 'id'>) => http<Repuesto>('/repuestos', { method: 'POST', body: body(d) }),
  actualizarRepuesto: (id: string, d: Omit<Repuesto, 'id'>) => http<Repuesto>(`/repuestos/${id}`, { method: 'PUT', body: body(d) }),
  ajustarStock: (id: string, delta: number) => http<Repuesto>(`/repuestos/${id}/ajuste`, { method: 'POST', body: body({ delta }) }),
  eliminarRepuesto: (id: string) => http<void>(`/repuestos/${id}`, { method: 'DELETE' }),
  // Citas
  citas: () => http<Cita[]>('/citas'),
  crearCita: (d: Omit<Cita, 'id'>) => http<Cita>('/citas', { method: 'POST', body: body(d) }),
  actualizarCita: (id: string, d: Omit<Cita, 'id'>) => http<Cita>(`/citas/${id}`, { method: 'PUT', body: body(d) }),
  estadoCita: (id: string, estado: EstadoCita) => http<Cita>(`/citas/${id}/estado`, { method: 'PATCH', body: body({ estado }) }),
  convertirCita: (id: string) => http<Servicio>(`/citas/${id}/convertir`, { method: 'POST' }),
  eliminarCita: (id: string) => http<void>(`/citas/${id}`, { method: 'DELETE' }),
};

// ---------- Utilidades ----------
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function formatearFecha(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-');
  return `${parseInt(dia, 10)} ${MESES[parseInt(mes, 10) - 1]} ${anio}`;
}

export function formatearMonto(valor: number): string {
  return 'RD$ ' + Math.round(valor).toLocaleString('es-DO');
}

export function nombreAuto(v?: Vehiculo): string {
  return v ? `${v.marca} ${v.modelo} ${v.anio}` : 'Vehículo no encontrado';
}

/** Fecha local de hoy (+ días) como YYYY-MM-DD, sin desfases de zona horaria. */
export function isoLocal(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function etiquetaDia(fechaIso: string): string {
  if (fechaIso === isoLocal(0)) return 'Hoy';
  if (fechaIso === isoLocal(1)) return 'Mañana';
  if (fechaIso === isoLocal(-1)) return 'Ayer';
  const [a, m, d] = fechaIso.split('-').map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d} ${MESES[m - 1]}`;
}

export function hora12(hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Últimos n meses (más antiguo primero) con su clave YYYY-MM y etiqueta corta. */
export function ultimosMeses(n: number): { clave: string; etiqueta: string }[] {
  const out: { clave: string; etiqueta: string }[] = [];
  const hoy = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    out.push({ clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, etiqueta: MESES[d.getMonth()] });
  }
  return out;
}
