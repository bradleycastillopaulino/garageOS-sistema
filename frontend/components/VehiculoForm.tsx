'use client';

import { useRef, useState } from 'react';
import type { Vehiculo } from '@/lib/api';
import Icon from './Icons';
import { Afijo, BarraAcciones, Campo, Seccion } from './Campo';

type Datos = Omit<Vehiculo, 'id'>;

const MARCAS = ['Toyota', 'Honda', 'Hyundai', 'Kia', 'Nissan', 'Mitsubishi', 'Suzuki', 'Mazda', 'Ford', 'Chevrolet', 'Jeep', 'Volkswagen', 'BMW', 'Mercedes-Benz'];
const COLORES = ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde', 'Beige', 'Dorado'];

/** Reduce la foto a máx. 1024px y la devuelve como data URL JPEG. */
function leerFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.onload = () => {
        const escala = Math.min(1, 1024 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type Clave = 'marca' | 'modelo' | 'anio' | 'matricula' | 'color' | 'propietario';

export default function VehiculoForm({
  inicial,
  etiqueta,
  onGuardar,
  onCancelar,
}: {
  inicial?: Vehiculo;
  etiqueta: string;
  onGuardar: (d: Datos) => Promise<void>;
  onCancelar?: () => void;
}) {
  const inputFoto = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Record<Clave, string>>({
    marca: inicial?.marca ?? '',
    modelo: inicial?.modelo ?? '',
    anio: inicial ? String(inicial.anio) : '',
    matricula: inicial?.matricula ?? '',
    color: inicial?.color ?? '',
    propietario: inicial?.propietario ?? '',
  });
  const [foto, setFoto] = useState<string | null>(inicial?.foto ?? null);
  const [tocados, setTocados] = useState<Partial<Record<Clave, boolean>>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const anioMax = new Date().getFullYear() + 1;
  const errorDe = (k: Clave): string => {
    if (!tocados[k]) return '';
    if (!f[k].trim()) return 'Este campo es obligatorio';
    if (k === 'anio' && (Number(f.anio) < 1950 || Number(f.anio) > anioMax)) return `Ingresa un año entre 1950 y ${anioMax}`;
    return '';
  };
  const set = (k: Clave) => (e: React.ChangeEvent<HTMLInputElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const blur = (k: Clave) => () => setTocados(p => ({ ...p, [k]: true }));
  const claves = Object.keys(f) as Clave[];
  const faltan = claves.filter(k => !f[k].trim()).length;
  const invalido = claves.some(k => !f[k].trim()) || Number(f.anio) < 1950 || Number(f.anio) > anioMax;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (invalido) {
      setTocados(Object.fromEntries(claves.map(k => [k, true])));
      (e.currentTarget.querySelector('.campo-error input, [aria-invalid="true"]') as HTMLElement | null)?.focus();
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await onGuardar({ ...f, matricula: f.matricula.trim().toUpperCase(), anio: Number(f.anio), foto });
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  const nombre = `${f.marca} ${f.modelo}`.trim();

  return (
    <form className="form-layout" onSubmit={enviar} noValidate>
      <div className="form-main">
        <Seccion n={1} titulo="Fotografía" descripcion="Opcional. Ayuda a identificar el auto rápidamente.">
          <button type="button" className={`dropzone ${foto ? 'has-photo' : ''}`} onClick={() => inputFoto.current?.click()} aria-label="Elegir o tomar fotografía">
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" />
            )}
            <span className="dropzone-cta"><Icon name="camera" size={22} />{foto ? 'Cambiar fotografía' : 'Subir o tomar fotografía'}<small>JPG o PNG · se optimiza automáticamente</small></span>
          </button>
          {foto && (
            <button type="button" className="icon-btn dropzone-clear" aria-label="Quitar fotografía" onClick={() => setFoto(null)} style={{ position: 'absolute' }}>
              <Icon name="x" size={18} />
            </button>
          )}
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={async e => {
              const file = e.target.files?.[0];
              if (file) setFoto(await leerFoto(file));
            }}
          />
        </Seccion>

        <Seccion n={2} titulo="Datos del vehículo">
          <div className="form-row">
            <Campo label="Marca" requerido error={errorDe('marca')}>
              <input list="marcas" placeholder="Toyota" value={f.marca} onChange={set('marca')} onBlur={blur('marca')} autoComplete="off" aria-invalid={!!errorDe('marca')} />
            </Campo>
            <Campo label="Modelo" requerido error={errorDe('modelo')}>
              <input placeholder="Corolla" value={f.modelo} onChange={set('modelo')} onBlur={blur('modelo')} autoComplete="off" aria-invalid={!!errorDe('modelo')} />
            </Campo>
          </div>
          <div className="form-row">
            <Campo label="Año" requerido error={errorDe('anio')}>
              <input type="number" inputMode="numeric" placeholder="2018" min={1950} max={anioMax} value={f.anio} onChange={set('anio')} onBlur={blur('anio')} aria-invalid={!!errorDe('anio')} />
            </Campo>
            <Campo label="Color" requerido error={errorDe('color')}>
              <input list="colores" placeholder="Gris" value={f.color} onChange={set('color')} onBlur={blur('color')} autoComplete="off" aria-invalid={!!errorDe('color')} />
            </Campo>
          </div>
          <Campo label="Matrícula (placa)" requerido error={errorDe('matricula')} ayuda="Se guarda en mayúsculas.">
            <input className="mono" placeholder="A123456" value={f.matricula} onChange={set('matricula')} onBlur={blur('matricula')} autoComplete="off" maxLength={12} aria-invalid={!!errorDe('matricula')} />
          </Campo>
          <datalist id="marcas">{MARCAS.map(m => <option key={m} value={m} />)}</datalist>
          <datalist id="colores">{COLORES.map(c => <option key={c} value={c} />)}</datalist>
        </Seccion>

        <Seccion n={3} titulo="Propietario">
          <Campo label="Nombre del propietario" requerido error={errorDe('propietario')}>
            <Afijo icon="user">
              <input placeholder="Nombre y apellido" value={f.propietario} onChange={set('propietario')} onBlur={blur('propietario')} autoComplete="name" aria-invalid={!!errorDe('propietario')} />
            </Afijo>
          </Campo>
        </Seccion>

        {error && <p className="error" role="alert">{error}</p>}
        <BarraAcciones etiqueta={etiqueta} guardando={guardando} faltan={faltan} onCancelar={onCancelar} />
      </div>

      <aside className="form-aside" aria-label="Vista previa">
        <p className="aside-label">Vista previa</p>
        <div className="preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto || '/img/auto-default.svg'} alt="" />
          <div className="preview-body">
            <p className={`preview-name ${nombre ? '' : 'vacio'}`}>{nombre || 'Marca y modelo'}</p>
            <div className="preview-line">
              <span className={f.anio || f.color ? '' : 'ghost'}>{[f.anio, f.color].filter(Boolean).join(' · ') || 'Año · Color'}</span>
              <span className="plate">{f.matricula.toUpperCase() || 'PLACA'}</span>
            </div>
            <div className={`preview-line ${f.propietario ? '' : 'ghost'}`}><span><Icon name="user" size={14} /> {f.propietario || 'Propietario'}</span></div>
          </div>
        </div>
      </aside>
    </form>
  );
}
