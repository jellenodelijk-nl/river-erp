// ============================================================
// River ERP — Shared TypeScript Types
// ============================================================

// --- Enums ---

export type BedrijfTag = 'river_digital' | 'river_software'

export type CampagneFase =
  | 'te_valideren'
  | 'gevalideerd'
  | 'eerste_mail'
  | 'follow_up'
  | 'follow_up_2'
  | 'geen_interesse'

export type SalesFase =
  | 'te_benaderen'
  | 'kennismaking'
  | 'voorstel_meeting'
  | 'voorstel_verstuurd'
  | 'akkoord'
  | 'loss'

export type FacturatieMoment = 'tweede_dinsdag' | 'achteraf'

export type OpdrachtType = 'eenmalig' | 'upsell'
export type OpdrachtStatus = 'actief' | 'afgerond' | 'geannuleerd'

export type ContactType = 'campagne_lead' | 'sales_lead' | 'klant'
export type ContactMethode = 'bellen' | 'email' | 'meeting' | 'linkedin' | 'overig'

export type TaakGerelateerd = 'campagne_lead' | 'sales_lead' | 'klant' | 'project' | 'ops_item' | 'geen'

export type ProjectStatus = 'gepland' | 'actief' | 'on_hold' | 'afgerond' | 'geannuleerd'
export type OpsStatus = 'open' | 'in_progress' | 'wacht_op_klant' | 'afgerond'
export type OpsPrioriteit = 'laag' | 'normaal' | 'hoog' | 'urgent'
export type TaakStatus = 'open' | 'in_progress' | 'afgerond'
export type TaakPrioriteit = 'laag' | 'normaal' | 'hoog'

export type UserRole = 'admin' | 'user'

// --- Database Row Types ---

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  totp_secret: string | null
  totp_enabled: boolean
  created_at: string
}

export interface CampagneLead {
  id: string
  naam: string
  bedrijf: string
  url: string | null
  email: string | null
  telefoonnummer: string | null
  bron: string | null
  campagne: string | null
  eigenaar_id: string | null
  fase: CampagneFase
  omschrijving: string | null
  straat: string | null
  huisnummer: string | null
  postcode: string | null
  plaats: string | null
  provincie: string | null
  sbi: string | null
  omschrijving_activiteiten: string | null
  aantal_medewerkers: string | null
  omzet: string | null
  rechtsvorm: string | null
  bedrijf_tag: BedrijfTag
  fase_gewijzigd_op: string
  created_at: string
  updated_at: string
  // Joined
  eigenaar?: User
}

export interface SalesLead {
  id: string
  naam: string
  bedrijf: string
  url: string | null
  email: string | null
  telefoonnummer: string | null
  bron: string | null
  campagne: string | null
  eigenaar_id: string | null
  fase: SalesFase
  omschrijving: string | null
  straat: string | null
  huisnummer: string | null
  postcode: string | null
  plaats: string | null
  provincie: string | null
  sbi: string | null
  omschrijving_activiteiten: string | null
  aantal_medewerkers: string | null
  omzet: string | null
  rechtsvorm: string | null
  bedrijf_tag: BedrijfTag
  eenmalig_bedrag: number | null
  maandelijks_bedrag: number | null
  fase_gewijzigd_op: string
  created_at: string
  updated_at: string
  geconverteerd: boolean
  eigenaar?: User
}

export interface Klant {
  id: string
  sales_lead_id: string | null
  klantnummer: string
  moneybird_id: string | null
  facturatie_moment: FacturatieMoment
  naam: string
  bedrijf: string
  url: string | null
  email: string | null
  telefoonnummer: string | null
  straat: string | null
  huisnummer: string | null
  postcode: string | null
  plaats: string | null
  provincie: string | null
  sbi: string | null
  omschrijving_activiteiten: string | null
  aantal_medewerkers: string | null
  omzet: string | null
  rechtsvorm: string | null
  bedrijf_tag: BedrijfTag
  created_at: string
  updated_at: string
}

export interface Opdracht {
  id: string
  klant_id: string
  titel: string
  omschrijving: string | null
  type: OpdrachtType
  bedrag: number | null
  status: OpdrachtStatus
  created_at: string
}

export interface Contactmoment {
  id: string
  type: ContactType
  referentie_id: string
  gebruiker_id: string
  datum: string
  type_contact: ContactMethode
  notities: string | null
  created_at: string
  gebruiker?: User
}

export interface Taak {
  id: string
  titel: string
  omschrijving: string | null
  toegewezen_aan: string | null
  gerelateerd_type: TaakGerelateerd
  gerelateerd_id: string | null
  deadline: string | null
  status: TaakStatus
  prioriteit: TaakPrioriteit
  created_at: string
  updated_at: string
  toegewezen_gebruiker?: User
  gerelateerd_naam?: string
}

// --- Moneybird ---

export interface MoneybirdFactuur {
  id: string
  invoice_id: string
  factuurnummer: string
  datum: string
  bedrag: number
  btw: number
  totaal: number
  vervaldatum: string
  status: string
  moneybird_status?: string
  betaald_op: string | null
  contact_id?: string
  contact_naam?: string | null
}

export interface Project {
  id: string
  klant_id: string | null
  titel: string
  omschrijving: string | null
  status: ProjectStatus
  eigenaar_id: string | null
  start_datum: string | null
  eind_datum: string | null
  budget: number | null
  bedrijf_tag: BedrijfTag
  created_at: string
  updated_at: string
  klant?: Klant
  eigenaar?: User
}

export interface OpsItem {
  id: string
  klant_id: string | null
  project_id: string | null
  titel: string
  omschrijving: string | null
  status: OpsStatus
  prioriteit: OpsPrioriteit
  eigenaar_id: string | null
  deadline: string | null
  bedrijf_tag: BedrijfTag
  created_at: string
  updated_at: string
  klant?: Klant
  project?: Project
  eigenaar?: User
}

// --- UI helpers ---

export const PROJECT_STATUSSEN: { value: ProjectStatus; label: string }[] = [
  { value: 'gepland', label: 'Gepland' },
  { value: 'actief', label: 'Actief' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'afgerond', label: 'Afgerond' },
  { value: 'geannuleerd', label: 'Geannuleerd' },
]

export const OPS_STATUSSEN: { value: OpsStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'wacht_op_klant', label: 'Wacht op klant' },
  { value: 'afgerond', label: 'Afgerond' },
]

export const OPS_PRIORITEITEN: { value: OpsPrioriteit; label: string }[] = [
  { value: 'laag', label: 'Laag' },
  { value: 'normaal', label: 'Normaal' },
  { value: 'hoog', label: 'Hoog' },
  { value: 'urgent', label: 'Urgent' },
]

export const CAMPAGNE_FASES: { value: CampagneFase; label: string }[] = [
  { value: 'te_valideren', label: 'Te valideren' },
  { value: 'gevalideerd', label: 'Gevalideerd' },
  { value: 'eerste_mail', label: 'Eerste mail' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'follow_up_2', label: 'Follow-up 2' },
  { value: 'geen_interesse', label: 'Geen interesse' },
]

export const SALES_FASES: { value: SalesFase; label: string }[] = [
  { value: 'te_benaderen', label: 'Te benaderen' },
  { value: 'kennismaking', label: 'Kennismaking' },
  { value: 'voorstel_meeting', label: 'Voorstel meeting' },
  { value: 'voorstel_verstuurd', label: 'Voorstel verstuurd' },
  { value: 'akkoord', label: 'Akkoord' },
  { value: 'loss', label: 'Loss' },
]

export const PRIORITEITEN: { value: TaakPrioriteit; label: string }[] = [
  { value: 'laag', label: 'Laag' },
  { value: 'normaal', label: 'Normaal' },
  { value: 'hoog', label: 'Hoog' },
]

export const TAAK_STATUSSEN: { value: TaakStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'afgerond', label: 'Afgerond' },
]

export const CONTACT_METHODES: { value: ContactMethode; label: string }[] = [
  { value: 'bellen', label: 'Bellen' },
  { value: 'email', label: 'E-mail' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'overig', label: 'Overig' },
]
