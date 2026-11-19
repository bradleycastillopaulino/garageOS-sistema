'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Icon from '@/components/Icons';
import VehiculoForm from '@/components/VehiculoForm';

export default function AgregarAuto() {
  const router = useRouter();
  return (
    <div className="form-wrap wide">
      <Link href="/autos" className="back"><Icon name="back" size={18} /> Autos</Link>
      <header className="page-head"><h1 className="h1">Agregar auto</h1></header>
      <VehiculoForm
        etiqueta="Guardar vehículo"
        onCancelar={() => router.push('/autos')}
        onGuardar={async d => {
          const v = await api.crearVehiculo(d);
          router.push(`/autos/${v.id}`);
        }}
      />
    </div>
  );
}
