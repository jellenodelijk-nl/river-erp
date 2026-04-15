-- Projecten
CREATE TYPE project_status AS ENUM ('gepland', 'actief', 'on_hold', 'afgerond', 'geannuleerd');

CREATE TABLE projecten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  titel TEXT NOT NULL,
  omschrijving TEXT,
  status project_status NOT NULL DEFAULT 'gepland',
  eigenaar_id UUID REFERENCES users(id) ON DELETE SET NULL,
  start_datum DATE,
  eind_datum DATE,
  budget NUMERIC(12,2),
  bedrijf_tag bedrijf_tag NOT NULL DEFAULT 'river_digital',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ops items
CREATE TYPE ops_status AS ENUM ('open', 'in_progress', 'wacht_op_klant', 'afgerond');
CREATE TYPE ops_prioriteit AS ENUM ('laag', 'normaal', 'hoog', 'urgent');

CREATE TABLE ops_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id UUID REFERENCES klanten(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projecten(id) ON DELETE SET NULL,
  titel TEXT NOT NULL,
  omschrijving TEXT,
  status ops_status NOT NULL DEFAULT 'open',
  prioriteit ops_prioriteit NOT NULL DEFAULT 'normaal',
  eigenaar_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deadline DATE,
  bedrijf_tag bedrijf_tag NOT NULL DEFAULT 'river_digital',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projecten_klant ON projecten(klant_id);
CREATE INDEX idx_projecten_status ON projecten(status);
CREATE INDEX idx_projecten_eigenaar ON projecten(eigenaar_id);
CREATE INDEX idx_ops_items_klant ON ops_items(klant_id);
CREATE INDEX idx_ops_items_project ON ops_items(project_id);
CREATE INDEX idx_ops_items_status ON ops_items(status);
CREATE INDEX idx_ops_items_eigenaar ON ops_items(eigenaar_id);

-- Triggers
CREATE TRIGGER tr_projecten_updated BEFORE UPDATE ON projecten FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_ops_items_updated BEFORE UPDATE ON ops_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE projecten ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY projecten_select ON projecten FOR SELECT USING (true);
CREATE POLICY projecten_insert ON projecten FOR INSERT WITH CHECK (true);
CREATE POLICY projecten_update ON projecten FOR UPDATE USING (true);
CREATE POLICY projecten_delete ON projecten FOR DELETE USING (is_admin());

CREATE POLICY ops_items_select ON ops_items FOR SELECT USING (true);
CREATE POLICY ops_items_insert ON ops_items FOR INSERT WITH CHECK (true);
CREATE POLICY ops_items_update ON ops_items FOR UPDATE USING (true);
CREATE POLICY ops_items_delete ON ops_items FOR DELETE USING (is_admin());

-- Extend taken gerelateerd_type enum
ALTER TYPE taak_gerelateerd ADD VALUE IF NOT EXISTS 'project';
ALTER TYPE taak_gerelateerd ADD VALUE IF NOT EXISTS 'ops_item';
