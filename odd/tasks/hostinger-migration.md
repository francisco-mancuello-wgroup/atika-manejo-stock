# Feature: hostinger-migration

## Objective

Run everything on the Hostinger VPS: ERP, public catalog and the PostgreSQL database (today ERP + catalog on Vercel, DB on Supabase).

## Problem / why

User request 2026-10-23: "quiero tener todo en hostinger y mis datos de BD también". Option A chosen (SSH on the existing AlmaLinux VPS, no reinstall, no Docker Manager: the AlmaLinux 10 template does not support it).

## Scope

- VPS 2090169 `srv2090169.hstgr.cloud`, 200.141.25.190, KVM 2 (2 vCPU, 8 GB, 100 GB), AlmaLinux 10.2. SSH alias `atika-vps` (root, key `~/.ssh/atika_hostinger`), authorized by the user 2026-10-23.
- Base: system update, firewalld (ssh, http, https), Node 22, pnpm, git, Caddy, unprivileged user `atika`.
- PostgreSQL on the VPS, listening on localhost only; copy data from Supabase.
- Apps built from the repo, run as systemd services, Caddy reverse proxy with HTTPS.
- Cut-over: DNS to the VPS, then retire Vercel/Supabase (user and Francisco decide).

## Constraints

- No secrets in the repo or in chat; env files on the server only (`/etc/atika/*.env`, root:atika 640).
- Every destructive or outward-facing step (DB copy cut-over, DNS change, Vercel/Supabase retirement) needs explicit user OK.
- Photos: Vercel Blob today; decide later whether to move them to the VPS disk.

## Tasks

- [x] T1 — Base server: update, firewall, Node 22, pnpm, git, Caddy, user `atika`.
- [x] T2 — PostgreSQL on the VPS (localhost), DB + role for the apps.
- [x] T3 — Copy data from Supabase to the VPS DB and verify row counts. (First copy; repeat right before cut-over, T6.)
- [x] T4a — Media on VPS disk: uploads go to `MEDIA_DIR` (branch `feat/vps-media-storage`).
- [ ] T4 — Deploy ERP + catalog (build, systemd services, env files).
- [ ] T5 — Domain + Caddy HTTPS (needs a domain from the user).
- [ ] T6 — Cut-over and retire Vercel/Supabase (user decision).

## Progress / evidence

- T1 (2026-10-23): `dnf upgrade` ok; firewalld active with ssh, http, https, dhcpv6-client (cockpit removed); nodejs 22.23.2 (appstream), npm 10.9.8, pnpm 11.22.0 (global); git; Caddy 2.11.7 from COPR @caddy/caddy, installed but disabled until T5; user `atika` uid 1000; rebooted into kernel 6.12.0-211.67.1, services back.
- Supabase source: PostgreSQL 17.11, 13 MB, extensions pg_stat_statements, pgcrypto, plpgsql, supabase_vault, uuid-ossp. VPS appstream offers postgresql18-server 18.6 (same major as local docker `postgres:18`). Plan: dump only the `public` schema with pg_dump 18.

- T2 (2026-10-23): postgresql18-server 18.6, cluster `/var/lib/pgsql/data`, listens only on 127.0.0.1/::1, pg_hba host lines scram-sha-256 (local peer); role + DB `atika`; generated password only in `/etc/atika/db.env` (root:atika 640, dir 750).
- T3 (2026-10-23): `pg_dump` 18 of Supabase `public` (session pooler :5432, URL passed over SSH stdin, not stored) `--no-owner --no-privileges -Fc` → `/root/supabase-public.dump` (72 KB, root 600); restored as `atika` skipping the `SCHEMA public` entry. Per-table row counts identical on 24 tables (products 124, product_variants 192, product_images 137, sales 20, group_allocations 36, users 3, _prisma_migrations 15, ...).

- Photos (2026-10-23, user: "movelas también a Hostinger"): VPS DB had 109 seed photos (`/media/products/...` from `data/`) and 28 Vercel Blob uploads; bank logos only seed (`/media/banks/seed/...`) or null. Created `/var/lib/atika/media` (atika:atika); downloaded the 28 Blob files to `/var/lib/atika/media/products/uploads/<id>/<file>` (all WebP, 2.2 MB, 0 failures); rewrote those 28 `product_images.url` in the VPS DB to `/media/products/uploads/...`; 0 files missing on disk. Supabase and Blob untouched. Repeat at cut-over (T6) after the final data copy.
- T4a (2026-10-23): `MEDIA_DIR` is the folder behind the `/media` URL prefix (`/media/x/y` -> `${MEDIA_DIR}/x/y`). Precedence for photos and logos: MEDIA_DIR > Blob token > dev `public/` dirs. Blob URLs left in the DB are a no-op on delete under MEDIA_DIR. With MEDIA_DIR at build time both apps set `images.unoptimized`; the prebuild `copy-media.mjs` also copies seed media into `$MEDIA_DIR/products` and `$MEDIA_DIR/banks/seed` and never removes uploads. RED: 10 failed / 10 passed in 4 new/changed test files; GREEN: 20 passed. Prebuild simulated on a temp dir: 178 product files + bank logos arrived, `keep.txt` files survived. `.env.example` entry could not be written by the agent (permission denied): add `# MEDIA_DIR=/var/lib/atika/media` manually.

## Next step

T4 deploy apps (build on the VPS, systemd, env files). Before T4: decide photo storage (keep Vercel Blob token vs VPS disk).
