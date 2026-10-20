-- Flag per creare il progetto di esempio una sola volta per utente
alter table public.profiles add column if not exists sample_created boolean not null default false;
