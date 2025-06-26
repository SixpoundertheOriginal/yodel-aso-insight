-- Add client column to aso_metrics table
ALTER TABLE public.aso_metrics
ADD COLUMN client varchar;
