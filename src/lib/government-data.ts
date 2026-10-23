/**
 * government-data.ts — Curated dataset: form of government + heads of state/government.
 *
 * ---------------------------------------------------------------------
 * Source & freshness
 * ---------------------------------------------------------------------
 * Compiled from Wikipedia's "List of current heads of state and government"
 * (verified October 2026). This is a STATIC curated dataset — political
 * structures change slowly (a few times per year worldwide), so a snapshot
 * here is far more reliable and cheaper than a live API (none exists for
 * free). When a country changes government, update its entry below.
 *
 * Covered: all 193 UN members + observers + Kosovo/Taiwan/W. Sahara (~198).
 * Not covered: dependent territories (Greenland, Puerto Rico, Hong Kong...)
 * — the UI simply hides the government chips for them.
 *
 * Density of population is NOT stored here: it is computed from the
 * Country row (population / area) which already exists in the DB.
 */

export type GovTitleKey =
  | 'president'
  | 'prime-minister'
  | 'chancellor'
  | 'taoiseach'
  | 'minister-of-state'
  | 'king'
  | 'queen'
  | 'emperor'
  | 'emir'
  | 'sultan'
  | 'grand-duke'
  | 'prince'
  | 'co-prince'
  | 'pope'
  | 'supreme-leader'
  | 'chairman'
  | 'captain-regent'
  | 'head-of-state';

export type GovTypeKey =
  | 'presidential-republic'
  | 'semi-presidential-republic'
  | 'parliamentary-republic'
  | 'federal-parliamentary-republic'
  | 'federal-presidential-republic'
  | 'constitutional-monarchy'
  | 'absolute-monarchy'
  | 'elective-monarchy'
  | 'one-party-state'
  | 'theocratic-republic'
  | 'islamic-emirate'
  | 'directorial-republic'
  | 'elective-theocracy'
  | 'co-principality'
  | 'transitional-government';

/** One political office (head of state OR head of government). */
export type GovOffice = {
  /** Office holder name, e.g. "Sergio Mattarella" (no title — the title is translated). */
  name: string;
  /** Title key, resolved through the i18n dictionary (`title.*` keys). */
  title: GovTitleKey;
  /** True when the office is held ad interim (acting / interim / transitional). */
  acting?: boolean;
};

/** Government info for one country (keyed by ISO 3166-1 alpha-2). */
export type GovernmentInfo = {
  /** Form of government, resolved through the i18n dictionary (`gov.*` keys). */
  type: GovTypeKey;
  /** Head of state (president, monarch, supreme leader...). */
  headOfState?: GovOffice;
  /** Head of government (PM, chancellor...) — only shown when it differs from the head of state. */
  headOfGovernment?: GovOffice;
};

/** Snapshot date of this dataset (used in UI tooltips). */
export const GOV_DATA_AS_OF = 'October 2026';

export const GOVERNMENT_DATA: Record<string, GovernmentInfo> = {
  /** AD */
  AD: { type: 'co-principality', headOfState: { name: "Josep-Lluís Serrano Pentinat and Emmanuel Macron", title: 'co-prince' }, headOfGovernment: { name: "Xavier Espot Zamora", title: 'prime-minister' } },
  /** AE */
  AE: { type: 'elective-monarchy', headOfState: { name: "Mohamed bin Zayed Al Nahyan", title: 'president' } },
  /** AF */
  AF: { type: 'islamic-emirate', headOfState: { name: "Hibatullah Akhundzada", title: 'supreme-leader' }, headOfGovernment: { name: "Hasan Akhund", title: 'prime-minister' } },
  /** AG */
  AG: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Gaston Browne", title: 'prime-minister' } },
  /** AL */
  AL: { type: 'parliamentary-republic', headOfState: { name: "Bajram Begaj", title: 'president' }, headOfGovernment: { name: "Edi Rama", title: 'prime-minister' } },
  /** AM */
  AM: { type: 'parliamentary-republic', headOfState: { name: "Vahagn Khachaturyan", title: 'president' }, headOfGovernment: { name: "Nikol Pashinyan", title: 'prime-minister' } },
  /** AO */
  AO: { type: 'presidential-republic', headOfState: { name: "João Lourenço", title: 'president' } },
  /** AR */
  AR: { type: 'federal-presidential-republic', headOfState: { name: "Javier Milei", title: 'president' } },
  /** AT */
  AT: { type: 'parliamentary-republic', headOfState: { name: "Alexander Van der Bellen", title: 'president' }, headOfGovernment: { name: "Christian Stocker", title: 'chancellor' } },
  /** AU */
  AU: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Anthony Albanese", title: 'prime-minister' } },
  /** AZ */
  AZ: { type: 'presidential-republic', headOfState: { name: "Ilham Aliyev", title: 'president' }, headOfGovernment: { name: "Ali Asadov", title: 'prime-minister' } },
  /** BA */
  BA: { type: 'parliamentary-republic', headOfState: { name: "Denis Bećirović", title: 'chairman' }, headOfGovernment: { name: "Borjana Krišto", title: 'prime-minister' } },
  /** BB */
  BB: { type: 'parliamentary-republic', headOfState: { name: "Jeffrey Bostic", title: 'president' }, headOfGovernment: { name: "Mia Mottley", title: 'prime-minister' } },
  /** BD */
  BD: { type: 'parliamentary-republic', headOfState: { name: "Mirza Fakhrul Islam Alamgir", title: 'president' }, headOfGovernment: { name: "Tarique Rahman", title: 'prime-minister' } },
  /** BE */
  BE: { type: 'constitutional-monarchy', headOfState: { name: "Philippe", title: 'king' }, headOfGovernment: { name: "Bart De Wever", title: 'prime-minister' } },
  /** BF */
  BF: { type: 'transitional-government', headOfState: { name: "Ibrahim Traoré", title: 'president', acting: true }, headOfGovernment: { name: "Jean Emmanuel Ouédraogo", title: 'prime-minister', acting: true } },
  /** BG */
  BG: { type: 'parliamentary-republic', headOfState: { name: "Iliana Iotova", title: 'president' }, headOfGovernment: { name: "Rumen Radev", title: 'prime-minister' } },
  /** BH */
  BH: { type: 'constitutional-monarchy', headOfState: { name: "Hamad bin Isa Al Khalifa", title: 'king' } },
  /** BI */
  BI: { type: 'presidential-republic', headOfState: { name: "Évariste Ndayishimiye", title: 'president' }, headOfGovernment: { name: "Nestor Ntahontuye", title: 'prime-minister' } },
  /** BJ */
  BJ: { type: 'presidential-republic', headOfState: { name: "Romuald Wadagni", title: 'president' } },
  /** BN */
  BN: { type: 'absolute-monarchy', headOfState: { name: "Hassanal Bolkiah", title: 'sultan' } },
  /** BO */
  BO: { type: 'presidential-republic', headOfState: { name: "Rodrigo Paz", title: 'president' } },
  /** BR */
  BR: { type: 'federal-presidential-republic', headOfState: { name: "Luiz Inácio Lula da Silva", title: 'president' } },
  /** BS */
  BS: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Philip Davis", title: 'prime-minister' } },
  /** BT */
  BT: { type: 'constitutional-monarchy', headOfState: { name: "Jigme Khesar Namgyel Wangchuck", title: 'king' }, headOfGovernment: { name: "Tshering Tobgay", title: 'prime-minister' } },
  /** BW */
  BW: { type: 'parliamentary-republic', headOfState: { name: "Duma Boko", title: 'president' } },
  /** BY */
  BY: { type: 'presidential-republic', headOfState: { name: "Alexander Lukashenko", title: 'president' }, headOfGovernment: { name: "Alexander Turchin", title: 'prime-minister' } },
  /** BZ */
  BZ: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Johnny Briceño", title: 'prime-minister' } },
  /** CA */
  CA: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Mark Carney", title: 'prime-minister' } },
  /** CD */
  CD: { type: 'presidential-republic', headOfState: { name: "Félix Tshisekedi", title: 'president' }, headOfGovernment: { name: "Judith Suminwa", title: 'prime-minister' } },
  /** CF */
  CF: { type: 'presidential-republic', headOfState: { name: "Faustin-Archange Touadéra", title: 'president' }, headOfGovernment: { name: "Félix Moloua", title: 'prime-minister' } },
  /** CG */
  CG: { type: 'presidential-republic', headOfState: { name: "Denis Sassou Nguesso", title: 'president' }, headOfGovernment: { name: "Anatole Collinet Makosso", title: 'prime-minister' } },
  /** CH */
  CH: { type: 'directorial-republic', headOfState: { name: "Guy Parmelin", title: 'president' } },
  /** CI */
  CI: { type: 'presidential-republic', headOfState: { name: "Alassane Ouattara", title: 'president' }, headOfGovernment: { name: "Robert Beugré Mambé", title: 'prime-minister' } },
  /** CL */
  CL: { type: 'presidential-republic', headOfState: { name: "José Antonio Kast", title: 'president' } },
  /** CM */
  CM: { type: 'presidential-republic', headOfState: { name: "Paul Biya", title: 'president' }, headOfGovernment: { name: "Joseph Ngute", title: 'prime-minister' } },
  /** CN */
  CN: { type: 'one-party-state', headOfState: { name: "Xi Jinping", title: 'president' } },
  /** CO */
  CO: { type: 'presidential-republic', headOfState: { name: "Abelardo de la Espriella", title: 'president' } },
  /** CR */
  CR: { type: 'presidential-republic', headOfState: { name: "Laura Fernández", title: 'president' } },
  /** CU */
  CU: { type: 'one-party-state', headOfState: { name: "Miguel Díaz-Canel", title: 'president' } },
  /** CV */
  CV: { type: 'semi-presidential-republic', headOfState: { name: "José Maria Neves", title: 'president' }, headOfGovernment: { name: "Francisco Carvalho", title: 'prime-minister' } },
  /** CY */
  CY: { type: 'presidential-republic', headOfState: { name: "Nikos Christodoulides", title: 'president' } },
  /** CZ */
  CZ: { type: 'presidential-republic', headOfState: { name: "Petr Pavel", title: 'president' }, headOfGovernment: { name: "Andrej Babiš", title: 'prime-minister' } },
  /** DE */
  DE: { type: 'federal-parliamentary-republic', headOfState: { name: "Frank-Walter Steinmeier", title: 'president' }, headOfGovernment: { name: "Friedrich Merz", title: 'chancellor' } },
  /** DJ */
  DJ: { type: 'presidential-republic', headOfState: { name: "Ismaïl Omar Guelleh", title: 'president' } },
  /** DK */
  DK: { type: 'constitutional-monarchy', headOfState: { name: "Frederik X", title: 'king' }, headOfGovernment: { name: "Mette Frederiksen", title: 'prime-minister' } },
  /** DM */
  DM: { type: 'constitutional-monarchy', headOfState: { name: "Sylvanie Burton", title: 'president' }, headOfGovernment: { name: "Roosevelt Skerrit", title: 'prime-minister' } },
  /** DO */
  DO: { type: 'presidential-republic', headOfState: { name: "Luis Abinader", title: 'president' } },
  /** DZ */
  DZ: { type: 'presidential-republic', headOfState: { name: "Abdelmadjid Tebboune", title: 'president' }, headOfGovernment: { name: "Sifi Ghrieb", title: 'prime-minister' } },
  /** EC */
  EC: { type: 'presidential-republic', headOfState: { name: "Daniel Noboa", title: 'president' } },
  /** EE */
  EE: { type: 'parliamentary-republic', headOfState: { name: "Ülle Madise", title: 'president' }, headOfGovernment: { name: "Kristen Michal", title: 'prime-minister' } },
  /** EG */
  EG: { type: 'presidential-republic', headOfState: { name: "Abdel Fattah el-Sisi", title: 'president' }, headOfGovernment: { name: "Mostafa Madbouly", title: 'prime-minister' } },
  /** EH */
  EH: { type: 'presidential-republic', headOfState: { name: "Brahim Ghali", title: 'president' }, headOfGovernment: { name: "Bouchraya Hammoudi Bayoun", title: 'prime-minister' } },
  /** ER */
  ER: { type: 'one-party-state', headOfState: { name: "Isaias Afwerki", title: 'president' } },
  /** ES */
  ES: { type: 'constitutional-monarchy', headOfState: { name: "Felipe VI", title: 'king' }, headOfGovernment: { name: "Pedro Sánchez", title: 'prime-minister' } },
  /** ET */
  ET: { type: 'federal-parliamentary-republic', headOfState: { name: "Taye Atske Selassie", title: 'president' }, headOfGovernment: { name: "Abiy Ahmed", title: 'prime-minister' } },
  /** FI */
  FI: { type: 'presidential-republic', headOfState: { name: "Alexander Stubb", title: 'president' }, headOfGovernment: { name: "Petteri Orpo", title: 'prime-minister' } },
  /** FJ */
  FJ: { type: 'parliamentary-republic', headOfState: { name: "Naiqama Lalabalavu", title: 'president' }, headOfGovernment: { name: "Sitiveni Rabuka", title: 'prime-minister' } },
  /** FM */
  FM: { type: 'presidential-republic', headOfState: { name: "Wesley Simina", title: 'president' } },
  /** FR */
  FR: { type: 'semi-presidential-republic', headOfState: { name: "Emmanuel Macron", title: 'president' }, headOfGovernment: { name: "Sébastien Lecornu", title: 'prime-minister' } },
  /** GA */
  GA: { type: 'presidential-republic', headOfState: { name: "Brice Oligui Nguema", title: 'president' } },
  /** GB */
  GB: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Andy Burnham", title: 'prime-minister' } },
  /** GD */
  GD: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Dickon Mitchell", title: 'prime-minister' } },
  /** GE */
  GE: { type: 'parliamentary-republic', headOfState: { name: "Mikheil Kavelashvili", title: 'president' }, headOfGovernment: { name: "Irakli Kobakhidze", title: 'prime-minister' } },
  /** GH */
  GH: { type: 'presidential-republic', headOfState: { name: "John Mahama", title: 'president' } },
  /** GM */
  GM: { type: 'presidential-republic', headOfState: { name: "Adama Barrow", title: 'president' } },
  /** GN */
  GN: { type: 'transitional-government', headOfState: { name: "Mamady Doumbouya", title: 'president' }, headOfGovernment: { name: "Bah Oury", title: 'prime-minister' } },
  /** GQ */
  GQ: { type: 'presidential-republic', headOfState: { name: "Teodoro Obiang Nguema Mbasogo", title: 'president' }, headOfGovernment: { name: "Manuel Osa Nsue Nsua", title: 'prime-minister' } },
  /** GR */
  GR: { type: 'parliamentary-republic', headOfState: { name: "Konstantinos Tasoulas", title: 'president' }, headOfGovernment: { name: "Kyriakos Mitsotakis", title: 'prime-minister' } },
  /** GT */
  GT: { type: 'presidential-republic', headOfState: { name: "Bernardo Arévalo", title: 'president' } },
  /** GW */
  GW: { type: 'transitional-government', headOfState: { name: "Horta Inta-A Na Man", title: 'president', acting: true }, headOfGovernment: { name: "Ilídio Vieira Té", title: 'prime-minister' } },
  /** GY */
  GY: { type: 'presidential-republic', headOfState: { name: "Irfaan Ali", title: 'president' } },
  /** HN */
  HN: { type: 'presidential-republic', headOfState: { name: "Nasry Asfura", title: 'president' } },
  /** HR */
  HR: { type: 'parliamentary-republic', headOfState: { name: "Zoran Milanović", title: 'president' }, headOfGovernment: { name: "Andrej Plenković", title: 'prime-minister' } },
  /** HT */
  HT: { type: 'transitional-government', headOfGovernment: { name: "Alix Didier Fils-Aimé", title: 'prime-minister', acting: true } },
  /** HU */
  HU: { type: 'parliamentary-republic', headOfState: { name: "András Baka", title: 'president' }, headOfGovernment: { name: "Péter Magyar", title: 'prime-minister' } },
  /** ID */
  ID: { type: 'presidential-republic', headOfState: { name: "Prabowo Subianto", title: 'president' } },
  /** IE */
  IE: { type: 'parliamentary-republic', headOfState: { name: "Catherine Connolly", title: 'president' }, headOfGovernment: { name: "Micheál Martin", title: 'taoiseach' } },
  /** IL */
  IL: { type: 'parliamentary-republic', headOfState: { name: "Isaac Herzog", title: 'president' }, headOfGovernment: { name: "Benjamin Netanyahu", title: 'prime-minister' } },
  /** IN */
  IN: { type: 'federal-parliamentary-republic', headOfState: { name: "Droupadi Murmu", title: 'president' }, headOfGovernment: { name: "Narendra Modi", title: 'prime-minister' } },
  /** IQ */
  IQ: { type: 'federal-parliamentary-republic', headOfState: { name: "Nizar Amidi", title: 'president' }, headOfGovernment: { name: "Ali al-Zaidi", title: 'prime-minister' } },
  /** IR */
  IR: { type: 'theocratic-republic', headOfState: { name: "Ali Khamenei", title: 'supreme-leader' }, headOfGovernment: { name: "Masoud Pezeshkian", title: 'president' } },
  /** IS */
  IS: { type: 'parliamentary-republic', headOfState: { name: "Halla Tómasdóttir", title: 'president' }, headOfGovernment: { name: "Kristrún Frostadóttir", title: 'prime-minister' } },
  /** IT */
  IT: { type: 'parliamentary-republic', headOfState: { name: "Sergio Mattarella", title: 'president' }, headOfGovernment: { name: "Giorgia Meloni", title: 'prime-minister' } },
  /** JM */
  JM: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Andrew Holness", title: 'prime-minister' } },
  /** JO */
  JO: { type: 'constitutional-monarchy', headOfState: { name: "Abdullah II", title: 'king' } },
  /** JP */
  JP: { type: 'constitutional-monarchy', headOfState: { name: "Naruhito", title: 'emperor' }, headOfGovernment: { name: "Sanae Takaichi", title: 'prime-minister' } },
  /** KE */
  KE: { type: 'presidential-republic', headOfState: { name: "William Ruto", title: 'president' } },
  /** KG */
  KG: { type: 'presidential-republic', headOfState: { name: "Sadyr Japarov", title: 'president' } },
  /** KH */
  KH: { type: 'constitutional-monarchy', headOfState: { name: "Norodom Sihamoni", title: 'king' }, headOfGovernment: { name: "Hun Manet", title: 'prime-minister' } },
  /** KI */
  KI: { type: 'presidential-republic', headOfState: { name: "Taneti Maamau", title: 'president' } },
  /** KM */
  KM: { type: 'presidential-republic', headOfState: { name: "Azali Assoumani", title: 'president' } },
  /** KN */
  KN: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Terrance Drew", title: 'prime-minister' } },
  /** KP */
  KP: { type: 'one-party-state', headOfState: { name: "Kim Jong Un", title: 'supreme-leader' } },
  /** KR */
  KR: { type: 'presidential-republic', headOfState: { name: "Lee Jae Myung", title: 'president' } },
  /** KW */
  KW: { type: 'constitutional-monarchy', headOfState: { name: "Mishal Al-Ahmad Al-Jaber Al-Sabah", title: 'emir' } },
  /** KZ */
  KZ: { type: 'presidential-republic', headOfState: { name: "Kassym-Jomart Tokayev", title: 'president' }, headOfGovernment: { name: "Oljas Bektenov", title: 'prime-minister' } },
  /** LA */
  LA: { type: 'one-party-state', headOfState: { name: "Thongloun Sisoulith", title: 'president' } },
  /** LB */
  LB: { type: 'parliamentary-republic', headOfState: { name: "Joseph Aoun", title: 'president' }, headOfGovernment: { name: "Nawaf Salam", title: 'prime-minister' } },
  /** LC */
  LC: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Philip J. Pierre", title: 'prime-minister' } },
  /** LI */
  LI: { type: 'constitutional-monarchy', headOfState: { name: "Hans-Adam II", title: 'prince' }, headOfGovernment: { name: "Brigitte Haas", title: 'prime-minister' } },
  /** LK */
  LK: { type: 'semi-presidential-republic', headOfState: { name: "Anura Kumara Dissanayake", title: 'president' } },
  /** LR */
  LR: { type: 'presidential-republic', headOfState: { name: "Joseph Boakai", title: 'president' } },
  /** LS */
  LS: { type: 'constitutional-monarchy', headOfState: { name: "Letsie III", title: 'king' }, headOfGovernment: { name: "Sam Matekane", title: 'prime-minister' } },
  /** LT */
  LT: { type: 'semi-presidential-republic', headOfState: { name: "Gitanas Nausėda", title: 'president' }, headOfGovernment: { name: "Mindaugas Sinkevičius", title: 'prime-minister' } },
  /** LU */
  LU: { type: 'constitutional-monarchy', headOfState: { name: "Guillaume V", title: 'grand-duke' }, headOfGovernment: { name: "Luc Frieden", title: 'prime-minister' } },
  /** LV */
  LV: { type: 'parliamentary-republic', headOfState: { name: "Edgars Rinkēvičs", title: 'president' }, headOfGovernment: { name: "Andris Kulbergs", title: 'prime-minister' } },
  /** LY */
  LY: { type: 'transitional-government', headOfState: { name: "Mohamed al-Menfi", title: 'chairman', acting: true }, headOfGovernment: { name: "Abdul Hamid Dbeibeh", title: 'prime-minister' } },
  /** MA */
  MA: { type: 'constitutional-monarchy', headOfState: { name: "Mohammed VI", title: 'king' } },
  /** MC */
  MC: { type: 'constitutional-monarchy', headOfState: { name: "Albert II", title: 'prince' }, headOfGovernment: { name: "Christophe Mirmand", title: 'minister-of-state' } },
  /** MD */
  MD: { type: 'parliamentary-republic', headOfState: { name: "Maia Sandu", title: 'president' }, headOfGovernment: { name: "Vasile Tofan", title: 'prime-minister' } },
  /** ME */
  ME: { type: 'parliamentary-republic', headOfState: { name: "Jakov Milatović", title: 'president' }, headOfGovernment: { name: "Milojko Spajić", title: 'prime-minister' } },
  /** MG */
  MG: { type: 'transitional-government', headOfState: { name: "Michael Randrianirina", title: 'president' }, headOfGovernment: { name: "Mamitiana Rajaonarison", title: 'prime-minister' } },
  /** MH */
  MH: { type: 'presidential-republic', headOfState: { name: "Hilda Heine", title: 'president' } },
  /** MK */
  MK: { type: 'parliamentary-republic', headOfState: { name: "Gordana Siljanovska-Davkova", title: 'president' }, headOfGovernment: { name: "Hristijan Mickoski", title: 'prime-minister' } },
  /** ML */
  ML: { type: 'transitional-government', headOfState: { name: "Assimi Goïta", title: 'president' } },
  /** MM */
  MM: { type: 'transitional-government', headOfState: { name: "Min Aung Hlaing", title: 'president' } },
  /** MN */
  MN: { type: 'semi-presidential-republic', headOfState: { name: "Ukhnaagiin Khürelsükh", title: 'president' }, headOfGovernment: { name: "Nyam-Osoryn Uchral", title: 'prime-minister' } },
  /** MR */
  MR: { type: 'presidential-republic', headOfState: { name: "Mohamed Ould Ghazouani", title: 'president' }, headOfGovernment: { name: "Mokhtar Ould Djay", title: 'prime-minister' } },
  /** MT */
  MT: { type: 'parliamentary-republic', headOfState: { name: "Myriam Spiteri Debono", title: 'president' }, headOfGovernment: { name: "Robert Abela", title: 'prime-minister' } },
  /** MU */
  MU: { type: 'parliamentary-republic', headOfState: { name: "Dharam Gokhool", title: 'president' }, headOfGovernment: { name: "Navin Ramgoolam", title: 'prime-minister' } },
  /** MV */
  MV: { type: 'presidential-republic', headOfState: { name: "Mohamed Muizzu", title: 'president' } },
  /** MW */
  MW: { type: 'presidential-republic', headOfState: { name: "Peter Mutharika", title: 'president' } },
  /** MX */
  MX: { type: 'federal-presidential-republic', headOfState: { name: "Claudia Sheinbaum", title: 'president' } },
  /** MY */
  MY: { type: 'elective-monarchy', headOfState: { name: "Ibrahim Iskandar", title: 'king' }, headOfGovernment: { name: "Anwar Ibrahim", title: 'prime-minister' } },
  /** MZ */
  MZ: { type: 'presidential-republic', headOfState: { name: "Daniel Chapo", title: 'president' } },
  /** NA */
  NA: { type: 'presidential-republic', headOfState: { name: "Netumbo Nandi-Ndaitwah", title: 'president' } },
  /** NE */
  NE: { type: 'transitional-government', headOfState: { name: "Abdourahamane Tiani", title: 'chairman', acting: true }, headOfGovernment: { name: "Ali Lamine Zeine", title: 'prime-minister' } },
  /** NG */
  NG: { type: 'federal-presidential-republic', headOfState: { name: "Bola Tinubu", title: 'president' } },
  /** NI */
  NI: { type: 'presidential-republic', headOfState: { name: "Daniel Ortega and Rosario Murillo", title: 'president' } },
  /** NL */
  NL: { type: 'constitutional-monarchy', headOfState: { name: "Willem-Alexander", title: 'king' }, headOfGovernment: { name: "Rob Jetten", title: 'prime-minister' } },
  /** NO */
  NO: { type: 'constitutional-monarchy', headOfState: { name: "Haakon VIII", title: 'king' }, headOfGovernment: { name: "Jonas Gahr Støre", title: 'prime-minister' } },
  /** NP */
  NP: { type: 'federal-parliamentary-republic', headOfState: { name: "Ram Chandra Paudel", title: 'president' }, headOfGovernment: { name: "Balen Shah", title: 'prime-minister' } },
  /** NR */
  NR: { type: 'presidential-republic', headOfState: { name: "David Adeang", title: 'president' } },
  /** NZ */
  NZ: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Christopher Luxon", title: 'prime-minister' } },
  /** OM */
  OM: { type: 'absolute-monarchy', headOfState: { name: "Haitham bin Tariq", title: 'sultan' } },
  /** PA */
  PA: { type: 'presidential-republic', headOfState: { name: "José Raúl Mulino", title: 'president' } },
  /** PE */
  PE: { type: 'presidential-republic', headOfState: { name: "Keiko Fujimori", title: 'president' } },
  /** PG */
  PG: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "James Marape", title: 'prime-minister' } },
  /** PH */
  PH: { type: 'presidential-republic', headOfState: { name: "Bongbong Marcos", title: 'president' } },
  /** PK */
  PK: { type: 'federal-parliamentary-republic', headOfState: { name: "Asif Ali Zardari", title: 'president' }, headOfGovernment: { name: "Shehbaz Sharif", title: 'prime-minister' } },
  /** PL */
  PL: { type: 'parliamentary-republic', headOfState: { name: "Karol Nawrocki", title: 'president' }, headOfGovernment: { name: "Donald Tusk", title: 'prime-minister' } },
  /** PS */
  PS: { type: 'semi-presidential-republic', headOfState: { name: "Mahmoud Abbas", title: 'president' }, headOfGovernment: { name: "Mohammad Mustafa", title: 'prime-minister' } },
  /** PT */
  PT: { type: 'semi-presidential-republic', headOfState: { name: "António José Seguro", title: 'president' }, headOfGovernment: { name: "Luís Montenegro", title: 'prime-minister' } },
  /** PW */
  PW: { type: 'presidential-republic', headOfState: { name: "Surangel Whipps Jr", title: 'president' } },
  /** PY */
  PY: { type: 'presidential-republic', headOfState: { name: "Santiago Peña", title: 'president' } },
  /** QA */
  QA: { type: 'absolute-monarchy', headOfState: { name: "Tamim bin Hamad Al Thani", title: 'emir' } },
  /** RO */
  RO: { type: 'semi-presidential-republic', headOfState: { name: "Nicușor Dan", title: 'president' }, headOfGovernment: { name: "Luca Niculescu", title: 'prime-minister' } },
  /** RS */
  RS: { type: 'parliamentary-republic', headOfState: { name: "Ana Brnabić", title: 'president', acting: true }, headOfGovernment: { name: "Đuro Macut", title: 'prime-minister' } },
  /** RU */
  RU: { type: 'semi-presidential-republic', headOfState: { name: "Vladimir Putin", title: 'president' }, headOfGovernment: { name: "Mikhail Mishustin", title: 'prime-minister' } },
  /** RW */
  RW: { type: 'presidential-republic', headOfState: { name: "Paul Kagame", title: 'president' }, headOfGovernment: { name: "Justin Nsengiyumva", title: 'prime-minister' } },
  /** SA */
  SA: { type: 'absolute-monarchy', headOfState: { name: "Salman", title: 'king' } },
  /** SB */
  SB: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Matthew Wale", title: 'prime-minister' } },
  /** SC */
  SC: { type: 'presidential-republic', headOfState: { name: "Patrick Herminie", title: 'president' } },
  /** SD */
  SD: { type: 'transitional-government', headOfState: { name: "Abdel Fattah al-Burhan", title: 'president', acting: true }, headOfGovernment: { name: "Kamil Idris", title: 'prime-minister' } },
  /** SE */
  SE: { type: 'constitutional-monarchy', headOfState: { name: "Carl XVI Gustaf", title: 'king' }, headOfGovernment: { name: "Ulf Kristersson", title: 'prime-minister', acting: true } },
  /** SG */
  SG: { type: 'parliamentary-republic', headOfState: { name: "Tharman Shanmugaratnam", title: 'president' }, headOfGovernment: { name: "Lawrence Wong", title: 'prime-minister' } },
  /** SI */
  SI: { type: 'parliamentary-republic', headOfState: { name: "Nataša Pirc Musar", title: 'president' }, headOfGovernment: { name: "Janez Janša", title: 'prime-minister' } },
  /** SK */
  SK: { type: 'parliamentary-republic', headOfState: { name: "Peter Pellegrini", title: 'president' }, headOfGovernment: { name: "Robert Fico", title: 'prime-minister' } },
  /** SL */
  SL: { type: 'presidential-republic', headOfState: { name: "Julius Maada Bio", title: 'president' } },
  /** SM */
  SM: { type: 'parliamentary-republic', headOfState: { name: "Gerardo Giovagnoli and William Casali", title: 'captain-regent' } },
  /** SN */
  SN: { type: 'presidential-republic', headOfState: { name: "Bassirou Diomaye Faye", title: 'president' }, headOfGovernment: { name: "Ahmadou Al Aminou Lo", title: 'prime-minister' } },
  /** SO */
  SO: { type: 'federal-parliamentary-republic', headOfState: { name: "Hassan Sheikh Mohamud", title: 'president' }, headOfGovernment: { name: "Hamza Abdi Barre", title: 'prime-minister' } },
  /** SR */
  SR: { type: 'presidential-republic', headOfState: { name: "Jennifer Geerlings-Simons", title: 'president' } },
  /** SS */
  SS: { type: 'presidential-republic', headOfState: { name: "Salva Kiir", title: 'president' } },
  /** ST */
  ST: { type: 'semi-presidential-republic', headOfState: { name: "Carlos Vila Nova", title: 'president' }, headOfGovernment: { name: "Américo Ramos", title: 'prime-minister' } },
  /** SV */
  SV: { type: 'presidential-republic', headOfState: { name: "Nayib Bukele", title: 'president' } },
  /** SY */
  SY: { type: 'transitional-government', headOfState: { name: "Ahmed al-Sharaa", title: 'president' } },
  /** SZ */
  SZ: { type: 'absolute-monarchy', headOfState: { name: "Mswati III", title: 'king' } },
  /** TD */
  TD: { type: 'presidential-republic', headOfState: { name: "Mahamat Déby", title: 'president' }, headOfGovernment: { name: "Allamaye Halina", title: 'prime-minister' } },
  /** TG */
  TG: { type: 'presidential-republic', headOfState: { name: "Jean-Lucien Savi de Tové", title: 'president' }, headOfGovernment: { name: "Faure Gnassingbé", title: 'prime-minister' } },
  /** TH */
  TH: { type: 'constitutional-monarchy', headOfState: { name: "Vajiralongkorn", title: 'king' }, headOfGovernment: { name: "Anutin Charnvirakul", title: 'prime-minister' } },
  /** TJ */
  TJ: { type: 'presidential-republic', headOfState: { name: "Emomali Rahmon", title: 'president' }, headOfGovernment: { name: "Qohir Rasulzoda", title: 'prime-minister' } },
  /** TL */
  TL: { type: 'semi-presidential-republic', headOfState: { name: "José Ramos-Horta", title: 'president' }, headOfGovernment: { name: "Xanana Gusmão", title: 'prime-minister' } },
  /** TM */
  TM: { type: 'presidential-republic', headOfState: { name: "Serdar Berdimuhamedow", title: 'president' } },
  /** TN */
  TN: { type: 'presidential-republic', headOfState: { name: "Kais Saied", title: 'president' }, headOfGovernment: { name: "Sara Zaafarani", title: 'prime-minister' } },
  /** TO */
  TO: { type: 'constitutional-monarchy', headOfState: { name: "Tupou VI", title: 'king' }, headOfGovernment: { name: "Fatafehi Fakafānua", title: 'prime-minister' } },
  /** TR */
  TR: { type: 'presidential-republic', headOfState: { name: "Recep Tayyip Erdoğan", title: 'president' } },
  /** TT */
  TT: { type: 'parliamentary-republic', headOfState: { name: "Christine Kangaloo", title: 'president' }, headOfGovernment: { name: "Kamla Persad-Bissessar", title: 'prime-minister' } },
  /** TV */
  TV: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Feleti Teo", title: 'prime-minister' } },
  /** TW */
  TW: { type: 'semi-presidential-republic', headOfState: { name: "Lai Ching-te", title: 'president' }, headOfGovernment: { name: "Cho Jung-tai", title: 'prime-minister' } },
  /** TZ */
  TZ: { type: 'presidential-republic', headOfState: { name: "Samia Suluhu Hassan", title: 'president' } },
  /** UA */
  UA: { type: 'semi-presidential-republic', headOfState: { name: "Volodymyr Zelenskyy", title: 'president' }, headOfGovernment: { name: "Serhii Koretskyi", title: 'prime-minister' } },
  /** UG */
  UG: { type: 'presidential-republic', headOfState: { name: "Yoweri Museveni", title: 'president' } },
  /** US */
  US: { type: 'federal-presidential-republic', headOfState: { name: "Donald Trump", title: 'president' } },
  /** UY */
  UY: { type: 'presidential-republic', headOfState: { name: "Yamandú Orsi", title: 'president' } },
  /** UZ */
  UZ: { type: 'presidential-republic', headOfState: { name: "Shavkat Mirziyoyev", title: 'president' }, headOfGovernment: { name: "Abdulla Aripov", title: 'prime-minister' } },
  /** VA */
  VA: { type: 'elective-theocracy', headOfState: { name: "Leo XIV", title: 'pope' } },
  /** VC */
  VC: { type: 'constitutional-monarchy', headOfState: { name: "Charles III", title: 'king' }, headOfGovernment: { name: "Godwin Friday", title: 'prime-minister' } },
  /** VE */
  VE: { type: 'federal-presidential-republic', headOfState: { name: "Nicolás Maduro", title: 'president' } },
  /** VN */
  VN: { type: 'one-party-state', headOfState: { name: "Tô Lâm", title: 'president' } },
  /** VU */
  VU: { type: 'parliamentary-republic', headOfState: { name: "Nikenike Vurobaravu", title: 'president' }, headOfGovernment: { name: "Jotham Napat", title: 'prime-minister' } },
  /** WS */
  WS: { type: 'parliamentary-republic', headOfState: { name: "Tuimalealiʻifano Vaʻaletoʻa Sualauvi II", title: 'head-of-state' }, headOfGovernment: { name: "Laʻauli Leuatea Schmidt", title: 'prime-minister' } },
  /** XK */
  XK: { type: 'parliamentary-republic', headOfState: { name: "Justina Shiroka Pula", title: 'president' }, headOfGovernment: { name: "Albin Kurti", title: 'prime-minister' } },
  /** YE */
  YE: { type: 'transitional-government', headOfState: { name: "Rashad al-Alimi", title: 'chairman', acting: true }, headOfGovernment: { name: "Shaya al-Zindani", title: 'prime-minister' } },
  /** ZA */
  ZA: { type: 'parliamentary-republic', headOfState: { name: "Cyril Ramaphosa", title: 'president' } },
  /** ZM */
  ZM: { type: 'presidential-republic', headOfState: { name: "Hakainde Hichilema", title: 'president' } },
  /** ZW */
  ZW: { type: 'presidential-republic', headOfState: { name: "Emmerson Mnangagwa", title: 'president' } },
};

/**
 * Look up government info for an ISO 3166-1 alpha-2 code.
 * Returns undefined for territories / codes not in the dataset.
 */
export function lookupGovernment(code: string): GovernmentInfo | undefined {
  return GOVERNMENT_DATA[code?.toUpperCase()];
}
