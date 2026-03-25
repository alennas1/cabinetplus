-- Optional link from expenses to fournisseurs
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS fournisseur_id bigint;

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_fournisseur_id FOREIGN KEY (fournisseur_id) REFERENCES public.fournisseurs(id);

-- Optional custom label for OTHER category
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS other_category_label text;

