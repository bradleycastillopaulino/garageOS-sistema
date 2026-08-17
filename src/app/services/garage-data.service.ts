import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Vehiculo } from '../models/vehiculo.model';
import { Servicio } from '../models/servicio.model';

const NOMBRE_BD = 'garageos';

@Injectable({
  providedIn: 'root',
})
export class GarageDataService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private esWeb = Capacitor.getPlatform() === 'web';
  private listo: Promise<void>;

  constructor() {
    this.listo = this.inicializar();
  }

  private async inicializar(): Promise<void> {
    if (this.esWeb) {
      await customElements.whenDefined('jeep-sqlite');
      await this.sqlite.initWebStore();
    }

    this.db = await this.sqlite.createConnection(NOMBRE_BD, false, 'no-encryption', 1, false);
    await this.db.open();

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS vehiculos (
        id TEXT PRIMARY KEY,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        anio INTEGER NOT NULL,
        matricula TEXT NOT NULL,
        color TEXT NOT NULL,
        propietario TEXT NOT NULL,
        foto TEXT
      );
      CREATE TABLE IF NOT EXISTS servicios (
        id TEXT PRIMARY KEY,
        vehiculoId TEXT NOT NULL,
        problema TEXT NOT NULL,
        fecha TEXT NOT NULL,
        costo REAL NOT NULL,
        estado TEXT NOT NULL,
        notas TEXT,
        piezas TEXT,
        FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id)
      );
    `);

    await this.guardarEnDisco();
  }

  private async guardarEnDisco(): Promise<void> {
    if (this.esWeb) {
      await this.sqlite.saveToStore(NOMBRE_BD);
    }
  }

  private generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async getVehiculos(): Promise<Vehiculo[]> {
    await this.listo;
    const resultado = await this.db.query('SELECT * FROM vehiculos');
    return (resultado.values ?? []) as Vehiculo[];
  }

  async getVehiculo(id: string): Promise<Vehiculo | undefined> {
    await this.listo;
    const resultado = await this.db.query('SELECT * FROM vehiculos WHERE id = ?', [id]);
    return (resultado.values ?? [])[0] as Vehiculo | undefined;
  }

  async agregarVehiculo(datos: Omit<Vehiculo, 'id'>): Promise<Vehiculo> {
    await this.listo;
    const nuevo: Vehiculo = { ...datos, id: this.generarId() };

    await this.db.run(
      `INSERT INTO vehiculos (id, marca, modelo, anio, matricula, color, propietario, foto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nuevo.id, nuevo.marca, nuevo.modelo, nuevo.anio, nuevo.matricula, nuevo.color, nuevo.propietario, nuevo.foto],
    );

    await this.guardarEnDisco();
    return nuevo;
  }

  async getServicios(): Promise<Servicio[]> {
    await this.listo;
    const resultado = await this.db.query('SELECT * FROM servicios');
    return (resultado.values ?? []) as Servicio[];
  }

  async getServiciosPorVehiculo(vehiculoId: string): Promise<Servicio[]> {
    await this.listo;
    const resultado = await this.db.query('SELECT * FROM servicios WHERE vehiculoId = ?', [vehiculoId]);
    return (resultado.values ?? []) as Servicio[];
  }

  async agregarServicio(datos: Omit<Servicio, 'id'>): Promise<Servicio> {
    await this.listo;
    const nuevo: Servicio = { ...datos, id: this.generarId() };

    await this.db.run(
      `INSERT INTO servicios (id, vehiculoId, problema, fecha, costo, estado, notas, piezas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nuevo.id, nuevo.vehiculoId, nuevo.problema, nuevo.fecha, nuevo.costo, nuevo.estado, nuevo.notas, nuevo.piezas],
    );

    await this.guardarEnDisco();
    return nuevo;
  }

  async getUltimosServicios(cantidad: number): Promise<Servicio[]> {
    await this.listo;
    const resultado = await this.db.query('SELECT * FROM servicios ORDER BY id DESC LIMIT ?', [cantidad]);
    return (resultado.values ?? []) as Servicio[];
  }

  async getResumen() {
    await this.listo;
    const vehiculos = await this.db.query('SELECT COUNT(*) as total FROM vehiculos');
    const servicios = await this.db.query('SELECT estado FROM servicios');
    const listaServicios = (servicios.values ?? []) as { estado: string }[];

    return {
      totalAutos: (vehiculos.values ?? [])[0]?.total ?? 0,
      pendientes: listaServicios.filter(s => s.estado === 'Pendiente' || s.estado === 'En proceso').length,
      completados: listaServicios.filter(s => s.estado === 'Completado').length,
    };
  }
}
