import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GarageDataService } from '../../services/garage-data.service';
import { Vehiculo } from '../../models/vehiculo.model';
import { EstadoServicio } from '../../models/servicio.model';

@Component({
  selector: 'app-crear-servicio',
  templateUrl: './crear-servicio.page.html',
  styleUrls: ['./crear-servicio.page.scss'],
  standalone: false,
})
export class CrearServicioPage {
  vehiculos: Vehiculo[] = [];
  estados: EstadoServicio[] = ['Pendiente', 'En proceso', 'Completado'];

  vehiculoId = '';
  problema = '';
  fecha = new Date().toISOString().slice(0, 10);
  costo: number | null = null;
  estado: EstadoServicio = 'Pendiente';
  notas = '';
  piezas = '';

  constructor(
    private garageData: GarageDataService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  async ionViewWillEnter() {
    this.vehiculos = await this.garageData.getVehiculos();

    const idPreseleccionado = this.route.snapshot.queryParamMap.get('vehiculoId');
    if (idPreseleccionado) {
      this.vehiculoId = idPreseleccionado;
    }
  }

  formularioValido(): boolean {
    return !!(this.vehiculoId && this.problema && this.fecha && this.costo !== null && this.estado);
  }

  async guardarServicio() {
    if (!this.formularioValido()) {
      return;
    }

    await this.garageData.agregarServicio({
      vehiculoId: this.vehiculoId,
      problema: this.problema,
      fecha: this.fecha,
      costo: this.costo as number,
      estado: this.estado,
      notas: this.notas,
      piezas: this.piezas,
    });

    this.router.navigateByUrl('/tabs/dashboard');
  }
}
