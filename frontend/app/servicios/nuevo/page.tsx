'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import Icon from '@/components/Icons';
import ServicioForm from '@/components/ServicioForm';

function Contenido() {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <ServicioForm
      vehiculoIdInicial={params.get('vehiculoId') ?? ''}
      etiqueta="Guardar orden"
      onCancelar={() => router.back()}
      onGuardar={async d => { await api.crearServicio(d); router.push('/servicios'); }}
    />
  );
}

export default function CrearServicio() {
  return (
    <div className="form-wrap wide">
      <Link href="/servicios" className="back"><Icon name="back" size={18} /> Servicios</Link>
      <header className="page-head"><h1 className="h1">Nueva orden</h1></header>
      <Suspense fallback={null}><Contenido /></Suspense>
    </div>
  );
}
