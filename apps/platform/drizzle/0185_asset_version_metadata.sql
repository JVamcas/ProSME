ALTER TABLE app_form_versions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';
ALTER TABLE app_eligibility_rule_set_versions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
-- Capture the available legacy names once. Earlier names cannot be reconstructed
-- where the old shared definition already overwrote them.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT tgrelid::regclass AS table_name, tgname FROM pg_trigger
    WHERE tgrelid IN ('app_form_versions'::regclass, 'app_eligibility_rule_set_versions'::regclass)
      AND tgname IN ('app_form_versions_lifecycle', 'app_eligibility_rule_set_versions_lifecycle')
  LOOP EXECUTE format('ALTER TABLE %s DISABLE TRIGGER %I', item.table_name, item.tgname); END LOOP;
END $$;
UPDATE app_form_versions version SET metadata = jsonb_build_object(
  'code', definition.code, 'name', definition.name, 'description', definition.description)
FROM app_form_definitions definition
WHERE definition.id = version.form_definition_id AND version.metadata = '{}';
UPDATE app_eligibility_rule_set_versions version SET metadata = jsonb_build_object(
  'code', definition.code, 'name', definition.name, 'description', definition.description)
FROM app_eligibility_rule_sets definition
WHERE definition.id = version.rule_set_id AND version.metadata = '{}';
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT tgrelid::regclass AS table_name, tgname FROM pg_trigger
    WHERE tgrelid IN ('app_form_versions'::regclass, 'app_eligibility_rule_set_versions'::regclass)
      AND tgname IN ('app_form_versions_lifecycle', 'app_eligibility_rule_set_versions_lifecycle')
  LOOP EXECUTE format('ALTER TABLE %s ENABLE TRIGGER %I', item.table_name, item.tgname); END LOOP;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_asset_version_metadata() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.metadata = '{}' THEN
      IF TG_TABLE_NAME = 'app_form_versions' THEN
        SELECT jsonb_build_object('code', code, 'name', name, 'description', description)
          INTO NEW.metadata FROM app_form_definitions WHERE id = NEW.form_definition_id;
      ELSE
        SELECT jsonb_build_object('code', code, 'name', name, 'description', description)
          INTO NEW.metadata FROM app_eligibility_rule_sets WHERE id = NEW.rule_set_id;
      END IF;
    END IF;
  ELSIF OLD.status <> 'DRAFT' AND NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    RAISE EXCEPTION 'Published and retired asset metadata is immutable';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS app_form_version_metadata_guard ON app_form_versions;
CREATE TRIGGER app_form_version_metadata_guard BEFORE INSERT OR UPDATE ON app_form_versions
  FOR EACH ROW EXECUTE FUNCTION protect_asset_version_metadata();
DROP TRIGGER IF EXISTS app_eligibility_version_metadata_guard ON app_eligibility_rule_set_versions;
CREATE TRIGGER app_eligibility_version_metadata_guard BEFORE INSERT OR UPDATE ON app_eligibility_rule_set_versions
  FOR EACH ROW EXECUTE FUNCTION protect_asset_version_metadata();
