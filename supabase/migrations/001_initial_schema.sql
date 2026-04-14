-- ============================================================
-- River ERP — Initial Database Schema
-- ============================================================

-- Enums
CREATE TYPE bedrijf_tag AS ENUM ('river_digital', 'river_software');
CREATE TYPE campagne_fase AS ENUM ('te_valideren', 'gevalideerd', 'eerste_mail', 'follow_up', 'follow_up_2', 'geen_interesse');
CREATE TYPE sales_fase AS ENUM ('te_benaderen', 'kennismaking', 'voorstel_meeting', 'voorstel_verstuurd', 'akkoord', 'loss');
CREATE TYPE facturatie_moment AS ENUM ('tweede_dinsdag', 'achteraf');
CREATE TYPE opdracht_type AS ENUM ('eenmalig', 'upsell');
CREATE TYPE opdracht_status AS ENUM ('actief', 'afgerond', 'geannuleerd');
CREATE TYPE contact_type AS ENUM ('campagne_lead', 'sales_lead', 'klant');
CREATE TYPE contact_methode AS ENUM ('bellen', 'email', 'meeting', 'linkedin', 'overig');
CREATE TYPE taak_gerelateerd AS ENUM ('campagne_lead', 'sales_lead', 'klant', 'geen');
CREATE TYPE taak_status AS ENUM ('open', 'in_progress', 'afgerond');
CREATE TYPE taak_prioriteit AS ENUM ('laag', 'normaal', 'hoog');
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  totp_secret TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campagne Leads
CREATE TABLE campagne_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  bedrijf TEXT NOT NULL DEFAULT '',
  url TEXT,
  email TEXT,
  telefoonnummer TEXT,
  bron TEXT,
  campagne TEXT,
  eigenaar_id UUID REFERENCES users(id) ON DELETE SET NULL,
  fase campagne_fase NOT NULL DEFAULT 'te_valideren',
  omschrijving TEXT,
  straat TEXT,
  huisnummer TEXT,
  postcode TEXT,
  plaats TEXT,
  provincie TEXT,
  sbi TEXT,
  omschrijving_activiteiten TEXT,
  aantal_medewerkers TEXT,
  omzet TEXT,
  rechtsvorm TEXT,
  bedrijf_tag bedrijf_tag NOT NULL DEFAULT 'river_digital',
  fase_gewijzigd_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales Leads
CREATE TABLE sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  bedrijf TEXT NOT NULL DEFAULT '',
  url TEXT,
  email TEXT,
  telefoonnummer TEXT,
  bron TEXT,
  campagne TEXT,
  eigenaar_id UUID REFERENCES users(id) ON DELETE SET NULL,
  fase sales_fase NOT NULL DEFAULT 'te_benaderen',
  omschrijving TEXT,
  straat TEXT,
  huisnummer TEXT,
  postcode TEXT,
  plaats TEXT,
  provincie TEXT,
  sbi TEXT,
  omschrijving_activiteiten TEXT,
  aantal_medewerkers TEXT,
  omzet TEXT,
  rechtsvorm TEXT,
  bedrijf_tag bedrijf_tag NOT NULL DEFAULT 'river_digital',
  eenmalig_bedrag NUMERIC(12,2),
  maandelijks_bedrag NUMERIC(12,2),
  geconverteerd BOOLEAN NOT NULL DEFAULT false,
  fase_gewijzigd_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Klanten
CREATE TABLE klanten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_lead_id UUID REFERENCES sales_leads(id) ON DELETE SET NULL,
  klantnummer TEXT UNIQUE NOT NULL,
  moneybird_id TEXT,
  facturatie_moment facturatie_moment NOT NULL DEFAULT 'achteraf',
  naam TEXT NOT NULL,
  bedrijf TEXT NOT NULL DEFAULT '',
  url TEXT,
  email TEXT,
  telefoonnummer TEXT,
  straat TEXT,
  huisnummer TEXT,
  postcode TEXT,
  plaats TEXT,
  provincie TEXT,
  sbi TEXT,
  omschrijving_activiteiten TEXT,
  aantal_medewerkers TEXT,
  omzet TEXT,
  rechtsvorm TEXT,
  bedrijf_tag bedrijf_tag NOT NULL DEFAULT 'river_digital',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Opdrachten
CREATE TABLE opdrachten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id UUID NOT NULL REFERENCES klanten(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  omschrijving TEXT,
  type opdracht_type NOT NULL DEFAULT 'eenmalig',
  bedrag NUMERIC(12,2),
  status opdracht_status NOT NULL DEFAULT 'actief',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contactmomenten
CREATE TABLE contactmomenten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type contact_type NOT NULL,
  referentie_id UUID NOT NULL,
  gebruiker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  datum TIMESTAMPTZ NOT NULL DEFAULT now(),
  type_contact contact_methode NOT NULL DEFAULT 'overig',
  notities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Taken
CREATE TABLE taken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  omschrijving TEXT,
  toegewezen_aan UUID REFERENCES users(id) ON DELETE SET NULL,
  gerelateerd_type taak_gerelateerd NOT NULL DEFAULT 'geen',
  gerelateerd_id UUID,
  deadline DATE,
  status taak_status NOT NULL DEFAULT 'open',
  prioriteit taak_prioriteit NOT NULL DEFAULT 'normaal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campagne_leads_eigenaar ON campagne_leads(eigenaar_id);
CREATE INDEX idx_campagne_leads_fase ON campagne_leads(fase);
CREATE INDEX idx_campagne_leads_bedrijf_tag ON campagne_leads(bedrijf_tag);
CREATE INDEX idx_sales_leads_eigenaar ON sales_leads(eigenaar_id);
CREATE INDEX idx_sales_leads_fase ON sales_leads(fase);
CREATE INDEX idx_sales_leads_bedrijf_tag ON sales_leads(bedrijf_tag);
CREATE INDEX idx_klanten_bedrijf_tag ON klanten(bedrijf_tag);
CREATE INDEX idx_opdrachten_klant ON opdrachten(klant_id);
CREATE INDEX idx_contactmomenten_ref ON contactmomenten(type, referentie_id);
CREATE INDEX idx_taken_toegewezen ON taken(toegewezen_aan);
CREATE INDEX idx_taken_deadline ON taken(deadline);
CREATE INDEX idx_taken_status ON taken(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_campagne_leads_updated BEFORE UPDATE ON campagne_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_sales_leads_updated BEFORE UPDATE ON sales_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_klanten_updated BEFORE UPDATE ON klanten FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_taken_updated BEFORE UPDATE ON taken FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update fase_gewijzigd_op when fase changes
CREATE OR REPLACE FUNCTION update_fase_gewijzigd()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.fase IS DISTINCT FROM NEW.fase THEN
    NEW.fase_gewijzigd_op = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_campagne_leads_fase BEFORE UPDATE ON campagne_leads FOR EACH ROW EXECUTE FUNCTION update_fase_gewijzigd();
CREATE TRIGGER tr_sales_leads_fase BEFORE UPDATE ON sales_leads FOR EACH ROW EXECUTE FUNCTION update_fase_gewijzigd();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagne_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE opdrachten ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactmomenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE taken ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Users: everyone can read, only self can update own profile, admin can update all
CREATE POLICY users_select ON users FOR SELECT USING (true);
CREATE POLICY users_update_self ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY users_update_admin ON users FOR UPDATE USING (is_admin());
CREATE POLICY users_insert_admin ON users FOR INSERT WITH CHECK (is_admin());

-- Campagne leads: admins see all, users see own
CREATE POLICY campagne_leads_select ON campagne_leads FOR SELECT USING (
  is_admin() OR eigenaar_id = auth.uid()
);
CREATE POLICY campagne_leads_insert ON campagne_leads FOR INSERT WITH CHECK (true);
CREATE POLICY campagne_leads_update ON campagne_leads FOR UPDATE USING (
  is_admin() OR eigenaar_id = auth.uid()
);
CREATE POLICY campagne_leads_delete ON campagne_leads FOR DELETE USING (is_admin());

-- Sales leads: same pattern
CREATE POLICY sales_leads_select ON sales_leads FOR SELECT USING (
  is_admin() OR eigenaar_id = auth.uid()
);
CREATE POLICY sales_leads_insert ON sales_leads FOR INSERT WITH CHECK (true);
CREATE POLICY sales_leads_update ON sales_leads FOR UPDATE USING (
  is_admin() OR eigenaar_id = auth.uid()
);
CREATE POLICY sales_leads_delete ON sales_leads FOR DELETE USING (is_admin());

-- Klanten: all authenticated users can read, admin can modify
CREATE POLICY klanten_select ON klanten FOR SELECT USING (true);
CREATE POLICY klanten_insert ON klanten FOR INSERT WITH CHECK (true);
CREATE POLICY klanten_update ON klanten FOR UPDATE USING (is_admin());
CREATE POLICY klanten_delete ON klanten FOR DELETE USING (is_admin());

-- Opdrachten: inherit from klanten access
CREATE POLICY opdrachten_select ON opdrachten FOR SELECT USING (true);
CREATE POLICY opdrachten_insert ON opdrachten FOR INSERT WITH CHECK (true);
CREATE POLICY opdrachten_update ON opdrachten FOR UPDATE USING (true);
CREATE POLICY opdrachten_delete ON opdrachten FOR DELETE USING (is_admin());

-- Contactmomenten: all can read/write
CREATE POLICY contactmomenten_select ON contactmomenten FOR SELECT USING (true);
CREATE POLICY contactmomenten_insert ON contactmomenten FOR INSERT WITH CHECK (true);

-- Taken: admins see all, users see assigned to self
CREATE POLICY taken_select ON taken FOR SELECT USING (
  is_admin() OR toegewezen_aan = auth.uid()
);
CREATE POLICY taken_insert ON taken FOR INSERT WITH CHECK (true);
CREATE POLICY taken_update ON taken FOR UPDATE USING (
  is_admin() OR toegewezen_aan = auth.uid()
);
CREATE POLICY taken_delete ON taken FOR DELETE USING (is_admin());
