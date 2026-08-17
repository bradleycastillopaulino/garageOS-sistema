import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { GarageDataService } from '../../services/garage-data.service';

@Component({
  selector: 'app-agregar-auto',
  templateUrl: './agregar-auto.page.html',
  styleUrls: ['./agregar-auto.page.scss'],
  standalone: false,
})
export class AgregarAutoPage {
  marca = '';
  modelo = '';
  anio: number | null = null;
  matricula = '';
  color = '';
  propietario = '';
  foto: string | null = null;

  constructor(private garageData: GarageDataService, private router: Router) {}

  async tomarFoto() {
    try {
      const resultado = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        quality: 70,
      });
      this.foto = `data:image/jpeg;base64,${resultado.base64String}`;
    } catch {
      return;
    }
  }

  formularioValido(): boolean {
    return !!(this.marca && this.modelo && this.anio && this.matricula && this.color && this.propietario);
  }

  async guardarVehiculo() {
    if (!this.formularioValido()) {
      return;
    }

    await this.garageData.agregarVehiculo({
      marca: this.marca,
      modelo: this.modelo,
      anio: this.anio as number,
      matricula: this.matricula,
      color: this.color,
      propietario: this.propietario,
      foto: this.foto,
    });

    this.router.navigateByUrl('/tabs/dashboard');
  }
}
