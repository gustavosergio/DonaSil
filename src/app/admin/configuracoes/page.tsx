// ============================================================
// DONA SIL — PAINEL — CONFIGURAÇÕES
// ============================================================
// Mostra as informações reais da loja (vêm do código, arquivo
// src/lib/site.ts) como campos desabilitados, e explica as
// sinalizações da etapa atual (modo demonstração, compras).
// Nenhum valor é alterado — a edição chega com a integração.
// ============================================================

import { Aviso } from "@/components/admin/Aviso";
import { CampoTexto } from "@/components/admin/Campo";
import { RotuloStatus } from "@/components/admin/RotuloStatus";
import { TituloSecao } from "@/components/admin/TituloSecao";
import { MODO_DEMO, site } from "@/lib/site";

/** Formata o número do WhatsApp (5581999770114 → (81) 99977-0114). */
function formatarWhatsApp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  if (digitos.length < 12) return numero;
  const ddd = digitos.slice(2, 4);
  const restante = digitos.slice(4);
  const telefone =
    restante.length === 9
      ? `${restante.slice(0, 5)}-${restante.slice(5)}`
      : `${restante.slice(0, 4)}-${restante.slice(4)}`;
  return `(${ddd}) ${telefone}`;
}

export default function PaginaConfiguracoes() {
  return (
    <>
      <TituloSecao
        titulo="Configurações"
        descricao="As informações oficiais da loja, como estão hoje. A edição destes valores chega com a integração do painel."
      />

      <Aviso titulo="Somente leitura nesta etapa">
        Estes valores vêm do código do site (arquivo <code>src/lib/site.ts</code>)
        e do banco de dados. Nada é alterado por esta página — ela mostra o
        estado atual e prepara a edição futura.
      </Aviso>

      {/* Informações da loja */}
      <section
        aria-labelledby="info-loja"
        className="mt-8 rounded-2xl border border-sand bg-ivory p-6"
      >
        <h2 id="info-loja" className="font-display text-xl font-semibold text-ink">
          Informações da loja
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <CampoTexto
            id="config-nome"
            rotulo="Nome da loja"
            value={site.nome}
            disabled
          />
          <CampoTexto
            id="config-whatsapp"
            rotulo="WhatsApp de atendimento"
            value={formatarWhatsApp(site.whatsapp)}
            disabled
          />
          <CampoTexto
            id="config-instagram"
            rotulo="Instagram"
            value={site.instagram}
            disabled
          />
        </div>
      </section>

      {/* Sinalizações da etapa atual */}
      <section
        aria-labelledby="sinalizacoes-loja"
        className="mt-8 rounded-2xl border border-sand bg-ivory p-6"
      >
        <h2 id="sinalizacoes-loja" className="font-display text-xl font-semibold text-ink">
          Sinalizações da loja
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          O catálogo real está separado da demonstração. As vendas são
          confirmadas pelo atendimento, com controle de estoque no painel.
        </p>

        <dl className="mt-5 space-y-4">
          <div className="flex flex-col gap-1.5 rounded-xl border border-sand px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <dt className="text-sm font-semibold text-ink">Modo demonstração</dt>
              <dd className="text-xs leading-5 text-ink-soft">
                Quando desligado, o catálogo exibe somente os produtos reais.
              </dd>
            </div>
            <RotuloStatus tonalidade={MODO_DEMO ? "pendente" : "ativo"}>
              {MODO_DEMO ? "Ativo" : "Desligado"}
            </RotuloStatus>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-sand px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <dt className="text-sm font-semibold text-ink">Finalização das vendas</dt>
              <dd className="text-xs leading-5 text-ink-soft">
                O site confere os valores e prepara a mensagem. O atendimento
                confirma estoque, pagamento e entrega pelo WhatsApp. A baixa de
                estoque deve ser feita em Produtos; não ocorre automaticamente.
              </dd>
            </div>
            <RotuloStatus tonalidade="ativo">WhatsApp</RotuloStatus>
          </div>
        </dl>
      </section>
    </>
  );
}
