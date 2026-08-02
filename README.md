# RELMO Business Hub

Business management hub for Relmo Tech BV — manage projects, finances, invoices, and tasks across 4 business activities.

## Setup

### 1. Supabase

Create a Supabase project and run this SQL in the SQL Editor:

```sql
create table activities (
  id uuid primary key default gen_random_uuid(),
  name text not null, color text, icon text
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null, activity_id uuid references activities(id),
  status text default 'actief', client text, deadline date,
  notes text, created_at timestamptz default now()
);

create table todos (
  id uuid primary key default gen_random_uuid(),
  title text not null, done boolean default false,
  project_id uuid references projects(id),
  activity_id uuid references activities(id),
  due_date date, priority text default 'normaal',
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null, description text, amount numeric not null,
  category text, activity_id uuid references activities(id),
  supplier text, raw_csv_row text, created_at timestamptz default now()
);

create table supplier_categories (
  id uuid primary key default gen_random_uuid(),
  supplier_key text unique not null, category text not null,
  activity_id uuid references activities(id),
  updated_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, type text default 'expense',
  color text, icon text
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null, client_name text not null,
  client_email text, client_address text,
  activity_id uuid references activities(id),
  issue_date date default current_date, due_date date,
  status text default 'concept', lines jsonb, notes text,
  created_at timestamptz default now()
);

-- Seed
insert into activities (name, color, icon) values
  ('E-commerce', '#3B82F6', 'shopping-cart'),
  ('App Building', '#8B5CF6', 'code'),
  ('Website Building', '#10B981', 'globe'),
  ('Robot Verhuur', '#F59E0B', 'bot');

insert into categories (name, type, color) values
  ('Loon / Inkomsten', 'income', '#10B981'),
  ('Huur / Hypotheek', 'expense', '#3B82F6'),
  ('Boodschappen', 'expense', '#F59E0B'),
  ('Restaurant / Eten', 'expense', '#EF4444'),
  ('Transport', 'expense', '#8B5CF6'),
  ('Telefoon / Internet', 'expense', '#06B6D4'),
  ('Energie', 'expense', '#84CC16'),
  ('Verzekeringen', 'expense', '#6B7280'),
  ('Gezondheid', 'expense', '#EC4899'),
  ('Abonnementen / Software', 'expense', '#7C3AED'),
  ('Marketing / Reclame', 'expense', '#F97316'),
  ('Robot Events', 'income', '#F59E0B'),
  ('Facturatie ontvangen', 'income', '#10B981'),
  ('Bankkosten', 'expense', '#9CA3AF'),
  ('Belastingen', 'expense', '#6B7280'),
  ('Sparen', 'transfer', '#60A5FA'),
  ('Overige', 'expense', '#D1D5DB');
```

### 2. Environment

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Run

```bash
npm install
npm run dev
```

### 4. Deploy

Push to GitHub → connect to Netlify. `netlify.toml` is pre-configured.

## Features

- **Dashboard** — summary cards, charts, recent activity
- **Financiën** — transaction overview, ING CSV import with auto-categorization
- **Projecten** — kanban board with drag & drop
- **Taken** — grouped todo list (today/this week/later)
- **Facturatie** — invoice creation with VAT, printable preview
- **Instellingen** — category management, supplier rules
