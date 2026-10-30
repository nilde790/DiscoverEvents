import { Cpu, Drama, Music, Palette, Trophy, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { EventCategory } from '@discoverevent/shared/types';
import { categoryClass } from '@/lib/constants';

/** Icona di ogni categoria: copertine e riquadri del Catalogo usano le stesse. */
export const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  Musica: Music,
  Sport: Trophy,
  Arte: Palette,
  Cibo: UtensilsCrossed,
  Teatro: Drama,
  Tech: Cpu,
};

interface Props {
  category: EventCategory;
  /** card: Catalogo e "I miei eventi"; panel: dettaglio nella Mappa; hero: in testa alla scheda evento. */
  size?: 'card' | 'panel' | 'hero';
}

/**
 * Copertina generata dalla categoria: tinta tenue del suo colore e una grande icona tagliata dal bordo.
 * Fa da immagine finché gli eventi non ne avranno una propria.
 */
export function EventCover({ category, size = 'card' }: Props) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <div className={`cover cover-${size} ${categoryClass(category)}`}>
      <span className="cover-label">{category}</span>
      <Icon className="cover-icon" strokeWidth={1.25} aria-hidden="true" />
    </div>
  );
}
