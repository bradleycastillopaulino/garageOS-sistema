export type EstadoServicio = 'Pendiente' | 'En proceso' | 'Completado';

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
