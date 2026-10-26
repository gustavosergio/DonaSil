-- Categoria usada pela seção /desapego. Não modifica o esquema ou permissões.
-- Já cadastrada no projeto de produção em 26/10/2026.
insert into public.categorias (nome, slug, ordem)
values ('Desapego', 'desapego', 9)
on conflict (slug) do nothing;
