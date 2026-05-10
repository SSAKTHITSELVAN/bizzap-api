-- Migration: Make budget_max nullable in requirements table
-- Run on server: psql -U bisdom -d bisdom_db -f migrations/002_budget_max_nullable.sql

ALTER TABLE requirements ALTER COLUMN budget_max DROP NOT NULL;
