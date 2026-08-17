import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GarageDataService } from '../../services/garage-data.service';
import { Vehiculo } from '../../models/vehiculo.model';
import { Servicio } from '../../models/servicio.model';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-detalle-auto',
  templateUrl: './detalle-auto.page.html',
  styleUrls: ['./detalle-auto.page.scss'],
  standalone: false,
})
export class DetalleAutoPage {
  vehiculo: Vehiculo | undefined;
  servicios: Servicio[] = [];
  imagenPredeterminada = 'assets/img/auto-default.svg';

  cantidadServicios = 0;
  cantidadPendientes = 0;
  totalGastado = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private garageData: GarageDataService,
  ) {}

  async ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id') as string;
    this.vehiculo = await this.garageData.getVehiculo(id);

    const servicios = await this.garageData.getServiciosPorVehiculo(id);
    this.servicios = servicios.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

    this.cantidadServicios = this.servicios.length;
    this.cantidadPendientes = this.servicios.filter(
      s => s.estado === 'Pendiente' || s.estado === 'En proceso',
    ).length;
    this.totalGastado = this.servicios.reduce((total, s) => total + s.costo, 0);
  }

  irCrearServicio() {
    this.router.navigate(['/crear-servicio'], { queryParams: { vehiculoId: this.vehiculo?.id } });
  }

  formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split('-');
    return `${parseInt(dia, 10)} ${MESES[parseInt(mes, 10) - 1]} ${anio}`;
  }

  formatearMonto(valor: number): string {
    return 'RD$ ' + Math.round(valor).toLocaleString('es-DO');
  }
}
