import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GarageDataService } from '../../services/garage-data.service';
import { Vehiculo } from '../../models/vehiculo.model';

@Component({
  selector: 'app-autos',
  templateUrl: './autos.page.html',
  styleUrls: ['./autos.page.scss'],
  standalone: false,
})
export class AutosPage {
  vehiculos: Vehiculo[] = [];
  imagenPredeterminada = 'assets/img/auto-default.jpg';

  constructor(private garageData: GarageDataService, private router: Router) {}

  async ionViewWillEnter() {
    this.vehiculos = await this.garageData.getVehiculos();
  }

  irAgregarAuto() {
    this.router.navigateByUrl('/agregar-auto');
  }

  verDetalle(vehiculo: Vehiculo) {
    this.router.navigate(['/detalle-auto', vehiculo.id]);
  }
}
