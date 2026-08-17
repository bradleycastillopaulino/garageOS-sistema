import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full',
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
  },
  {
    path: 'agregar-auto',
    loadChildren: () => import('./autos/agregar-auto/agregar-auto.module').then(m => m.AgregarAutoPageModule),
  },
  {
    path: 'crear-servicio',
    loadChildren: () => import('./servicios/crear-servicio/crear-servicio.module').then(m => m.CrearServicioPageModule),
  },
  {
    path: 'detalle-auto/:id',
    loadChildren: () => import('./autos/detalle-auto/detalle-auto.module').then(m => m.DetalleAutoPageModule),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
