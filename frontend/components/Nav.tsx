'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icons';

const LINKS: { href: string; texto: string; icon: IconName }[] = [
  { href: '/', texto: 'Panel', icon: 'gauge' },
  { href: '/autos', texto: 'Autos', icon: 'car' },
  { href: '/servicios', texto: 'Servicios', icon: 'wrench' },
  { href: '/inventario', texto: 'Inventario', icon: 'box' },
  { href: '/citas', texto: 'Citas', icon: 'calendar' },
];

export default function Nav() {
  const pathname = usePathname();
  const activo = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Icon name="wrench" size={20} /></span>
          <span className="brand-name">Garage<span>OS</span></span>
        </div>
        <nav className="nav" aria-label="Principal">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} aria-current={activo(l.href) ? 'page' : undefined}>
              <Icon name={l.icon} />
              {l.texto}
            </Link>
          ))}
        </nav>
        <p className="sidebar-foot">Gestión de taller</p>
      </aside>

      <nav className="tabbar" aria-label="Principal móvil">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} aria-current={activo(l.href) ? 'page' : undefined}>
            <Icon name={l.icon} size={22} />
            {l.texto}
          </Link>
        ))}
      </nav>
    </>
  );
}
