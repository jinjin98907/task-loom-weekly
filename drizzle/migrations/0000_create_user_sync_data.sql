CREATE TABLE public.user_data (
  user_id uuid PRIMARY KEY,
  dashboard jsonb NOT NULL DEFAULT '{}'::jsonb,
  dashboard_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  yearly jsonb NOT NULL DEFAULT '{}'::jsonb,
  yearly_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  my_class smallint NOT NULL DEFAULT 0,
  my_class_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own sync data" ON public.user_data FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own sync data" ON public.user_data FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own sync data" ON public.user_data FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own sync data" ON public.user_data FOR DELETE TO authenticated USING (user_id = auth.uid());