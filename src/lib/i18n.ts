/**
 * i18n.ts — Lightweight internationalization dictionaries.
 *
 * ---------------------------------------------------------------------
 * Why a custom solution (not next-intl routing)?
 * ---------------------------------------------------------------------
 * The project constraint is "user can only see the / route". next-intl's
 * standard setup uses a `[locale]` URL segment (/en, /it, …) which would
 * create multiple routes. Instead we use a Context-based locale (no URL
 * change) + a `?lang=` query param sent to the API so the server knows
 * which language to generate LLM content in.
 *
 * 4 locales: English (default), Spanish, Italian, French.
 * Add a language: add a key to `LOCALES` + a dictionary to `MESSAGES`.
 */

export type Locale = 'en' | 'es' | 'it' | 'fr';

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export const DEFAULT_LOCALE: Locale = 'en';

/** Native name of each locale — used by the LLM prompt ("Write in Italian"). */
export const LOCALE_NATIVE: Record<Locale, string> = {
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
  fr: 'French',
};

type Dict = typeof MESSAGES.en;

const MESSAGES = {
  en: {
    // Header / chrome
    'app.title': 'Global Travel Dashboard',
    'app.subtitle': '189 countries · live weather, FX & advisories',
    'app.aiCurated': 'AI-curated',
    // Selector
    'selector.loading': 'Loading countries…',
    'selector.placeholder': 'Pick a country…',
    'selector.search': 'Search 189 countries…',
    'selector.empty': 'No country found.',
    'selector.region.other': 'Other',
    // Empty state
    'empty.badge': '189 countries · one dashboard',
    'empty.title1': 'Pick a country,',
    'empty.title2': 'see everything.',
    'empty.body': 'Live weather, ECB exchange rates, travel advisories, AI-curated culture, food, must-see places and price estimates — aggregated for any of the 189 countries.',
    'empty.hint': 'Or search the dropdown above. First visit to each country generates its travel brief.',
    // Dashboard
    'dash.justCurated.title': 'Just curated for you',
    'dash.justCurated.body': "This country's travel brief was generated on-the-fly and cached. Future visits will be instant.",
    'dash.errorTitle': "Couldn't load this country",
    'dash.unknownError': 'Unknown error',
    'dash.retry': 'Retry',
    'dash.refresh': 'Refresh',
    'dash.refreshing': 'Refreshing…',
    'dash.generated': 'Generated',
    'dash.cacheHits': 'hits',
    'dash.cacheMisses': 'misses',
    'dash.cacheKeys': 'keys',
    // Hero metadata labels
    'hero.region': 'Region',
    'hero.capital': 'Capital',
    'hero.population': 'Population',
    'hero.area': 'Area',
    'hero.languages': 'Languages',
    'hero.currency': 'Currency',
    'hero.callingCode': 'Calling code',
    'hero.timezone': 'Timezone',
    'hero.bestTime': 'Best time to visit: {value}',
    // Card titles
    'card.weather': 'Current Weather',
    'card.exchange': 'Exchange Rate',
    'card.advisory': 'Travel Advisory',
    'card.overview': 'Overview',
    'card.culture': 'Culture',
    'card.unwrittenRules': 'Unwritten Rules',
    'card.food': 'Typical Food',
    'card.poi': 'Must-See Places',
    'card.price': 'Price Estimates',
    // Weather card
    'weather.feelsLike': 'Feels like',
    'weather.wind': 'Wind',
    'weather.next24h': 'Next 24h',
    'weather.forecast7': '7-day outlook',
    'weather.unavailable': 'Weather unavailable',
    // Exchange card
    'exchange.notOnList': '{currency} not on ECB list',
    'exchange.unavailable': 'FX unavailable',
    'exchange.ecbRate': 'ECB reference rate · {date}',
    // Advisory card
    'advisory.level': 'Level {n}',
    'advisory.lvl1': 'Exercise normal precautions',
    'advisory.lvl2': 'Exercise increased caution',
    'advisory.lvl3': 'Reconsider travel',
    'advisory.lvl4': 'Do not travel',
    'advisory.aiBrief': 'AI Safety Brief',
    'advisory.aiFallback': 'Live advisory API unavailable — showing curated AI brief.',
    'advisory.updated': 'Updated {date}',
    'advisory.noData': 'No advisory data',
    // Food card
    'food.noData': 'No dishes recorded.',
    'food.cat.main': 'main',
    'food.cat.dessert': 'dessert',
    'food.cat.street': 'street',
    'food.cat.drink': 'drink',
    // POI card
    'poi.noData': 'No points of interest recorded.',
    // Price card
    'price.hotelsPerNight': 'Hotels (per night)',
    'price.flights': 'Flights',
    'price.meals': 'Meals',
    'price.budget': 'Budget',
    'price.midRange': 'Mid-range',
    'price.luxury': 'Luxury',
    'price.roundTripEu': 'Round-trip from EU',
    'price.streetBudget': 'Street / budget',
    'price.midRestaurant': 'Mid restaurant',
    'price.disclaimer': 'Ranges are regional estimates (LLM-generated), not live booking data.',
    // Source badges
    'source.open-meteo': 'open-meteo',
    'source.frankfurter': 'frankfurter · ECB',
    'source.us-state-dept': 'us-state-dept',
    'source.aiCurated': 'ai · curated',
    'source.llmEstimate': 'llm · estimate',
    'source.curated': 'curated',
    'source.unavailable': 'unavailable',
    // Footer
    'footer.sources': 'Data sources:',
    'footer.disclaimer': 'Hotel & flight ranges are LLM-generated estimates · not live booking data.',
  },
  es: {
    'app.title': 'Panel de Viajes Global',
    'app.subtitle': '189 países · clima, divisas y avisos en vivo',
    'app.aiCurated': 'Curado con IA',
    'selector.loading': 'Cargando países…',
    'selector.placeholder': 'Elige un país…',
    'selector.search': 'Buscar 189 países…',
    'selector.empty': 'Ningún país encontrado.',
    'selector.region.other': 'Otro',
    'empty.badge': '189 países · un panel',
    'empty.title1': 'Elige un país,',
    'empty.title2': 'verás todo.',
    'empty.body': 'Clima en vivo, tipos de cambio del BCE, avisos de viaje, cultura curada con IA, comida, lugares imprescindibles y estimaciones de precios — para cualquiera de los 189 países.',
    'empty.hint': 'O busca en el desplegable de arriba. La primera visita a cada país genera su guía de viaje.',
    'dash.justCurated.title': 'Recién curado para ti',
    'dash.justCurated.body': 'La guía de viaje de este país se generó al momento y se guardó en caché. Las próximas visitas serán instantáneas.',
    'dash.errorTitle': 'No se pudo cargar este país',
    'dash.unknownError': 'Error desconocido',
    'dash.retry': 'Reintentar',
    'dash.refresh': 'Actualizar',
    'dash.refreshing': 'Actualizando…',
    'dash.generated': 'Generado',
    'dash.cacheHits': 'aciertos',
    'dash.cacheMisses': 'fallos',
    'dash.cacheKeys': 'claves',
    'hero.region': 'Región',
    'hero.capital': 'Capital',
    'hero.population': 'Población',
    'hero.area': 'Área',
    'hero.languages': 'Idiomas',
    'hero.currency': 'Moneda',
    'hero.callingCode': 'Prefijo',
    'hero.timezone': 'Zona horaria',
    'hero.bestTime': 'Mejor época: {value}',
    'card.weather': 'Clima actual',
    'card.exchange': 'Tipo de cambio',
    'card.advisory': 'Aviso de viaje',
    'card.overview': 'Resumen',
    'card.culture': 'Cultura',
    'card.unwrittenRules': 'Reglas no escritas',
    'card.food': 'Comida típica',
    'card.poi': 'Lugares imperdibles',
    'card.price': 'Estimaciones de precio',
    'weather.feelsLike': 'Sensación',
    'weather.wind': 'Viento',
    'weather.next24h': 'Próximas 24h',
    'weather.forecast7': 'Pronóstico 7 días',
    'weather.unavailable': 'Clima no disponible',
    'exchange.notOnList': '{currency} no en la lista del BCE',
    'exchange.unavailable': 'Cambio no disponible',
    'exchange.ecbRate': 'Tasa de referencia BCE · {date}',
    'advisory.level': 'Nivel {n}',
    'advisory.lvl1': 'Precauciones normales',
    'advisory.lvl2': 'Mayor precaución',
    'advisory.lvl3': 'Reconsiderar el viaje',
    'advisory.lvl4': 'No viajar',
    'advisory.aiBrief': 'Resumen de seguridad IA',
    'advisory.aiFallback': 'API de avisos no disponible — mostrando resumen IA.',
    'advisory.updated': 'Actualizado {date}',
    'advisory.noData': 'Sin datos de aviso',
    'food.noData': 'Sin platos registrados.',
    'food.cat.main': 'principal',
    'food.cat.dessert': 'postre',
    'food.cat.street': 'calle',
    'food.cat.drink': 'bebida',
    'poi.noData': 'Sin lugares registrados.',
    'price.hotelsPerNight': 'Hoteles (por noche)',
    'price.flights': 'Vuelos',
    'price.meals': 'Comidas',
    'price.budget': 'Económico',
    'price.midRange': 'Medio',
    'price.luxury': 'Lujo',
    'price.roundTripEu': 'Ida y vuelta desde UE',
    'price.streetBudget': 'Calle / económico',
    'price.midRestaurant': 'Restaurante medio',
    'price.disclaimer': 'Los rangos son estimaciones regionales (IA), no datos de reserva en vivo.',
    'source.open-meteo': 'open-meteo',
    'source.frankfurter': 'frankfurter · BCE',
    'source.us-state-dept': 'us-state-dept',
    'source.aiCurated': 'ia · curado',
    'source.llmEstimate': 'ia · estimación',
    'source.curated': 'curado',
    'source.unavailable': 'no disponible',
    'footer.sources': 'Fuentes de datos:',
    'footer.disclaimer': 'Los rangos de hoteles y vuelos son estimaciones de IA · no datos de reserva en vivo.',
  },
  it: {
    'app.title': 'Dashboard Viaggi Globale',
    'app.subtitle': '189 paesi · meteo, cambi e avvisi in tempo reale',
    'app.aiCurated': 'Curato con IA',
    'selector.loading': 'Caricamento paesi…',
    'selector.placeholder': 'Scegli un paese…',
    'selector.search': 'Cerca tra 189 paesi…',
    'selector.empty': 'Nessun paese trovato.',
    'selector.region.other': 'Altro',
    'empty.badge': '189 paesi · un’unica dashboard',
    'empty.title1': 'Scegli un paese,',
    'empty.title2': 'vedi tutto.',
    'empty.body': 'Meteo live, cambi BCE, avvisi di viaggio, cultura curata con IA, cibo, luoghi imperdibili e stime di prezzo — aggregati per ciascuno dei 189 paesi.',
    'empty.hint': 'Oppure cerca nel menu a tendina sopra. La prima visita a ogni paese genera la sua guida di viaggio.',
    'dash.justCurated.title': 'Appena curato per te',
    'dash.justCurated.body': 'La guida di viaggio di questo paese è stata generata al volo e salvata in cache. Le visite future saranno istantanee.',
    'dash.errorTitle': 'Impossibile caricare questo paese',
    'dash.unknownError': 'Errore sconosciuto',
    'dash.retry': 'Riprova',
    'dash.refresh': 'Aggiorna',
    'dash.refreshing': 'Aggiornamento…',
    'dash.generated': 'Generato',
    'dash.cacheHits': 'hit',
    'dash.cacheMisses': 'miss',
    'dash.cacheKeys': 'chiavi',
    'hero.region': 'Regione',
    'hero.capital': 'Capitale',
    'hero.population': 'Popolazione',
    'hero.area': 'Superficie',
    'hero.languages': 'Lingue',
    'hero.currency': 'Valuta',
    'hero.callingCode': 'Prefisso',
    'hero.timezone': 'Fuso orario',
    'hero.bestTime': 'Periodo migliore: {value}',
    'card.weather': 'Meteo attuale',
    'card.exchange': 'Cambio valuta',
    'card.advisory': 'Avviso di viaggio',
    'card.overview': 'Panoramica',
    'card.culture': 'Cultura',
    'card.unwrittenRules': 'Regole non scritte',
    'card.food': 'Cucina tipica',
    'card.poi': 'Luoghi da visitare',
    'card.price': 'Stime di prezzo',
    'weather.feelsLike': 'Percepita',
    'weather.wind': 'Vento',
    'weather.next24h': 'Prossime 24h',
    'weather.forecast7': 'Previsione 7 giorni',
    'weather.unavailable': 'Meteo non disponibile',
    'exchange.notOnList': '{currency} non nella lista BCE',
    'exchange.unavailable': 'Cambio non disponibile',
    'exchange.ecbRate': 'Tasso di riferimento BCE · {date}',
    'advisory.level': 'Livello {n}',
    'advisory.lvl1': 'Precauzioni normali',
    'advisory.lvl2': 'Maggiore cautela',
    'advisory.lvl3': 'Ripensare al viaggio',
    'advisory.lvl4': 'Non viaggiare',
    'advisory.aiBrief': 'Riepilogo sicurezza IA',
    'advisory.aiFallback': 'API avvisi non disponibile — mostro riepilogo IA.',
    'advisory.updated': 'Aggiornato {date}',
    'advisory.noData': 'Nessun dato avviso',
    'food.noData': 'Nessun piatto registrato.',
    'food.cat.main': 'primo',
    'food.cat.dessert': 'dolce',
    'food.cat.street': 'strada',
    'food.cat.drink': 'bevanda',
    'poi.noData': 'Nessun luogo registrato.',
    'price.hotelsPerNight': 'Hotel (a notte)',
    'price.flights': 'Voli',
    'price.meals': 'Pasti',
    'price.budget': 'Economico',
    'price.midRange': 'Medio',
    'price.luxury': 'Lusso',
    'price.roundTripEu': 'A/R dall’Europa',
    'price.streetBudget': 'Strada / economico',
    'price.midRestaurant': 'Ristorante medio',
    'price.disclaimer': 'I range sono stime regionali (IA), non dati di prenotazione live.',
    'source.open-meteo': 'open-meteo',
    'source.frankfurter': 'frankfurter · BCE',
    'source.us-state-dept': 'us-state-dept',
    'source.aiCurated': 'ia · curato',
    'source.llmEstimate': 'ia · stima',
    'source.curated': 'curato',
    'source.unavailable': 'non disponibile',
    'footer.sources': 'Fonti dati:',
    'footer.disclaimer': 'I range di hotel e voli sono stime IA · non dati di prenotazione live.',
  },
  fr: {
    'app.title': 'Tableau de Bord Voyages Global',
    'app.subtitle': '189 pays · météo, devises et avis en direct',
    'app.aiCurated': 'Curaté par IA',
    'selector.loading': 'Chargement des pays…',
    'selector.placeholder': 'Choisissez un pays…',
    'selector.search': 'Rechercher 189 pays…',
    'selector.empty': 'Aucun pays trouvé.',
    'selector.region.other': 'Autre',
    'empty.badge': '189 pays · un tableau de bord',
    'empty.title1': 'Choisissez un pays,',
    'empty.title2': 'voyez tout.',
    'empty.body': 'Météo en direct, taux de change BCE, avis de voyage, culture curatée par IA, cuisine, lieux incontournables et estimations de prix — agrégés pour chacun des 189 pays.',
    'empty.hint': 'Ou recherchez dans le menu déroulant ci-dessus. La première visite de chaque pays génère son guide de voyage.',
    'dash.justCurated.title': 'Vient d’être curaté pour vous',
    'dash.justCurated.body': 'Le guide de voyage de ce pays a été généré à la volée et mis en cache. Les visites suivantes seront instantanées.',
    'dash.errorTitle': 'Impossible de charger ce pays',
    'dash.unknownError': 'Erreur inconnue',
    'dash.retry': 'Réessayer',
    'dash.refresh': 'Actualiser',
    'dash.refreshing': 'Actualisation…',
    'dash.generated': 'Généré',
    'dash.cacheHits': 'succès',
    'dash.cacheMisses': 'échecs',
    'dash.cacheKeys': 'clés',
    'hero.region': 'Région',
    'hero.capital': 'Capitale',
    'hero.population': 'Population',
    'hero.area': 'Superficie',
    'hero.languages': 'Langues',
    'hero.currency': 'Monnaie',
    'hero.callingCode': 'Indicatif',
    'hero.timezone': 'Fuseau horaire',
    'hero.bestTime': 'Meilleure période : {value}',
    'card.weather': 'Météo actuelle',
    'card.exchange': 'Taux de change',
    'card.advisory': 'Avis de voyage',
    'card.overview': 'Aperçu',
    'card.culture': 'Culture',
    'card.unwrittenRules': 'Règles non écrites',
    'card.food': 'Cuisine typique',
    'card.poi': 'Lieux incontournables',
    'card.price': 'Estimations de prix',
    'weather.feelsLike': 'Ressenti',
    'weather.wind': 'Vent',
    'weather.next24h': 'Prochaines 24h',
    'weather.forecast7': 'Prévisions 7 jours',
    'weather.unavailable': 'Météo indisponible',
    'exchange.notOnList': '{currency} pas dans la liste BCE',
    'exchange.unavailable': 'Change indisponible',
    'exchange.ecbRate': 'Taux de référence BCE · {date}',
    'advisory.level': 'Niveau {n}',
    'advisory.lvl1': 'Précautions normales',
    'advisory.lvl2': 'Prudence accrue',
    'advisory.lvl3': 'Ré envisager le voyage',
    'advisory.lvl4': 'Ne pas voyager',
    'advisory.aiBrief': 'Résumé de sécurité IA',
    'advisory.aiFallback': 'API d’avis indisponible — affichage du résumé IA.',
    'advisory.updated': 'Mis à jour {date}',
    'advisory.noData': 'Aucune donnée d’avis',
    'food.noData': 'Aucun plat enregistré.',
    'food.cat.main': 'plat',
    'food.cat.dessert': 'dessert',
    'food.cat.street': 'rue',
    'food.cat.drink': 'boisson',
    'poi.noData': 'Aucun lieu enregistré.',
    'price.hotelsPerNight': 'Hôtels (par nuit)',
    'price.flights': 'Vols',
    'price.meals': 'Repas',
    'price.budget': 'Économique',
    'price.midRange': 'Moyen',
    'price.luxury': 'Luxe',
    'price.roundTripEu': 'A/R depuis l’Europe',
    'price.streetBudget': 'Rue / économique',
    'price.midRestaurant': 'Restaurant moyen',
    'price.disclaimer': 'Les fourchettes sont des estimations régionales (IA), pas des données de réservation en direct.',
    'source.open-meteo': 'open-meteo',
    'source.frankfurter': 'frankfurter · BCE',
    'source.us-state-dept': 'us-state-dept',
    'source.aiCurated': 'ia · curaté',
    'source.llmEstimate': 'ia · estimation',
    'source.curated': 'curaté',
    'source.unavailable': 'indisponible',
    'footer.sources': 'Sources de données :',
    'footer.disclaimer': 'Les fourchettes d’hôtels et de vols sont des estimations IA · pas des données de réservation en direct.',
  },
} satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof Dict;

/** Region name translation (closed set: ~6 region values from the dataset). */
const REGION_TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: { Africa: 'Africa', Americas: 'Americas', Asia: 'Asia', Europe: 'Europe', Oceania: 'Oceania', Antarctic: 'Antarctic' },
  es: { Africa: 'África', Americas: 'Américas', Asia: 'Asia', Europe: 'Europa', Oceania: 'Oceanía', Antarctic: 'Antártida' },
  it: { Africa: 'Africa', Americas: 'Americhe', Asia: 'Asia', Europe: 'Europa', Oceania: 'Oceania', Antarctic: 'Antartide' },
  fr: { Africa: 'Afrique', Americas: 'Amériques', Asia: 'Asie', Europe: 'Europe', Oceania: 'Océanie', Antarctic: 'Antarctique' },
};

/** Translate a region name. Falls back to the original if unknown. */
export function translateRegion(region: string, locale: Locale): string {
  return REGION_TRANSLATIONS[locale]?.[region] ?? region;
}

/** Format a weekday+day date in the given locale. */
export function formatDate(weekdayDay: string, locale: Locale): string {
  try {
    return new Date(weekdayDay).toLocaleDateString(locale === 'en' ? 'en-US' : locale, {
      weekday: 'short',
      day: 'numeric',
    });
  } catch {
    return weekdayDay;
  }
}

/** Format a full date (e.g. advisory "updated" date) in the given locale. */
export function formatDateLong(dateStr: string, locale: Locale): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'en' ? 'en-US' : locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format a time using the locale's convention. */
export function formatTime(timeStr: string, locale: Locale): string {
  try {
    return new Date(timeStr).toLocaleTimeString(locale === 'en' ? 'en-US' : locale);
  } catch {
    return timeStr;
  }
}

/**
 * Resolve a translation key with optional {placeholder} interpolation.
 * Falls back to English, then to the key itself (so missing strings are
 * visible during dev rather than silently empty).
 */
export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  let str = MESSAGES[locale]?.[key] ?? MESSAGES.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
