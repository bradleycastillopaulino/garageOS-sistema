import { Component } from '@angular/core';
import { GarageDataService } from '../../services/garage-data.service';
import { Servicio } from '../../models/servicio.model';
import { Vehiculo } from '../../models/vehiculo.model';

interface ServicioResumen extends Servicio {
  vehiculo: Vehiculo | undefined;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage {
  totalAutos = 0;
  pendientes = 0;
  completados = 0;
  ultimosServicios: ServicioResumen[] = [];

  constructor(private garageData: GarageDataService) {}

  ionViewWillEnter() {
    this.cargarDatos();
  }

  private async cargarDatos() {
    const resumen = await this.garageData.getResumen();
    this.totalAutos = resumen.totalAutos;
    this.pendientes = resumen.pendientes;
    this.completados = resumen.completados;

    const ultimos = await this.garageData.getUltimosServicios(5);
    this.ultimosServicios = await Promise.all(
      ultimos.map(async servicio => ({
        ...servicio,
        vehiculo: await this.garageData.getVehiculo(servicio.vehiculoId),
      })),
    );
  }
}
