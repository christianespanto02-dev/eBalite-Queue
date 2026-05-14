-- ============================================================
-- BARANGAY BALITE QUEUE MANAGEMENT SYSTEM
-- Complete Supabase SQL Schema
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.queue_category AS ENUM ('regular', 'senior', 'pwd');
CREATE TYPE public.queue_status AS ENUM ('waiting', 'serving', 'completed', 'skipped');

-- ============================================================
-- 2. USER ROLES TABLE
-- ============================================================

CREATE TABLE public.user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       app_role    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function: check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. QUEUE TICKETS TABLE
-- ============================================================

CREATE TABLE public.queue_tickets (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT           NOT NULL,
  category      queue_category NOT NULL,
  status        queue_status   NOT NULL DEFAULT 'waiting',
  sequence_no   INTEGER        NOT NULL,
  priority      INTEGER        NOT NULL DEFAULT 0, -- higher = more priority (senior/pwd = 1, regular = 0)
  called_at     TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  date_issued   DATE           NOT NULL DEFAULT CURRENT_DATE  -- for daily grouping
);

CREATE INDEX idx_queue_status      ON public.queue_tickets(status);
CREATE INDEX idx_queue_created     ON public.queue_tickets(created_at DESC);
CREATE INDEX idx_queue_date        ON public.queue_tickets(date_issued);
CREATE INDEX idx_queue_priority    ON public.queue_tickets(priority DESC, sequence_no ASC);

ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for queue_tickets
CREATE POLICY "Public can view queue"
  ON public.queue_tickets FOR SELECT
  USING (true);

CREATE POLICY "Staff and admins insert tickets"
  ON public.queue_tickets FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Staff and admins update tickets"
  ON public.queue_tickets FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins delete tickets"
  ON public.queue_tickets FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. AUTO SEQUENCE NUMBER FUNCTION
--    Generates next sequence number per category per day
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_next_sequence(
  _category queue_category,
  _date     DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE SQL VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    MAX(sequence_no), 0
  ) + 1
  FROM public.queue_tickets
  WHERE category = _category
    AND date_issued = _date
$$;

-- ============================================================
-- 5. TICKET NUMBER GENERATOR
--    Format: R-001, S-001, P-001 (Regular, Senior, PWD)
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_ticket_number(
  _category queue_category,
  _sequence INTEGER
)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT
    CASE _category
      WHEN 'regular' THEN 'R'
      WHEN 'senior'  THEN 'S'
      WHEN 'pwd'     THEN 'P'
    END
    || '-' || LPAD(_sequence::TEXT, 3, '0')
$$;

-- ============================================================
-- 6. NEXT QUEUE LOGIC (Priority: Senior/PWD first)
--    Returns the next ticket to be called
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_next_ticket()
RETURNS public.queue_tickets
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT *
  FROM public.queue_tickets
  WHERE status = 'waiting'
    AND date_issued = CURRENT_DATE
  ORDER BY
    priority DESC,       -- senior/pwd (priority=1) before regular (priority=0)
    sequence_no ASC,     -- earlier number first within same priority
    created_at ASC
  LIMIT 1
$$;

-- ============================================================
-- 7. DAILY RESET LOG TABLE
-- ============================================================

CREATE TABLE public.daily_resets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  reset_by     UUID        REFERENCES auth.users(id),
  tickets_count INTEGER    NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage daily resets"
  ON public.daily_resets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff view daily resets"
  ON public.daily_resets FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

-- ============================================================
-- 8. ANALYTICS VIEW
--    Used for the admin dashboard statistics
-- ============================================================

CREATE OR REPLACE VIEW public.queue_analytics AS
SELECT
  date_issued,
  COUNT(*)                                                        AS total_tickets,
  COUNT(*) FILTER (WHERE status = 'completed')                   AS completed,
  COUNT(*) FILTER (WHERE status = 'waiting')                     AS waiting,
  COUNT(*) FILTER (WHERE status = 'serving')                     AS serving,
  COUNT(*) FILTER (WHERE status = 'skipped')                     AS skipped,
  COUNT(*) FILTER (WHERE category = 'regular')                   AS regular_count,
  COUNT(*) FILTER (WHERE category = 'senior')                    AS senior_count,
  COUNT(*) FILTER (WHERE category = 'pwd')                       AS pwd_count,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (completed_at - created_at)) / 60.0
    ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL),
    2
  )                                                               AS avg_wait_minutes
FROM public.queue_tickets
GROUP BY date_issued
ORDER BY date_issued DESC;

-- ============================================================
-- 9. TODAY'S QUEUE SUMMARY VIEW
--    Lightweight view for the public display screen
-- ============================================================

CREATE OR REPLACE VIEW public.today_queue_summary AS
SELECT
  COUNT(*) FILTER (WHERE status = 'waiting')   AS waiting_count,
  COUNT(*) FILTER (WHERE status = 'serving')   AS serving_count,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'skipped')   AS skipped_count,
  COUNT(*)                                     AS total_issued
FROM public.queue_tickets
WHERE date_issued = CURRENT_DATE;

-- ============================================================
-- 10. REALTIME - Enable for live updates
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
ALTER TABLE public.queue_tickets REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_resets;
ALTER TABLE public.daily_resets REPLICA IDENTITY FULL;

-- ============================================================
-- 11. SEED: Create first admin user role
--    Run this AFTER creating your admin user in Auth > Users
--    Replace the UUID below with your actual admin user ID
-- ============================================================

-- STEP: Go to Authentication > Users, copy the UUID of your admin
-- Then run:
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR-ADMIN-USER-UUID-HERE', 'admin');
--
-- Example:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin');

-- ============================================================
-- END OF SCHEMA
-- ============================================================