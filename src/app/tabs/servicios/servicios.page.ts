import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GarageDataService } from '../../services/garage-data.service';
import { Servicio } from '../../models/servicio.model';
import { Vehiculo } from '../../models/vehiculo.model';

interface ServicioResumen extends Servicio {
  vehiculo: Vehiculo | undefined;
}

@Component({
  selector: 'app-servicios',
  templateUrl: './servicios.page.html',
  styleUrls: ['./servicios.page.scss'],
  standalone: false,
})
export class ServiciosPage {
  servicios: ServicioResumen[] = [];

  constructor(private garageData: GarageDataService, private router: Router) {}

  async ionViewWillEnter() {
    const servicios = await this.garageData.getServicios();
    const conVehiculo = await Promise.all(
      servicios.map(async servicio => ({
        ...servicio,
        vehiculo: await this.garageData.getVehiculo(servicio.vehiculoId),
      })),
    );
    this.servicios = conVehiculo.sort((a, b) => b.id.localeCompare(a.id));
  }

  irCrearServicio() {
    this.router.navigateByUrl('/crear-servicio');
  }
}
