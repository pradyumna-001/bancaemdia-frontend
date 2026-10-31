# Assinatura — #51 / ADR019

## Contrato e integração

Árvore única integrada backend `b916f54331f14cf47a3800324bd61d8638043c06`, OpenAPI SHA-256 `0714381b9e0e4797000932636ffb770b794dc7b6731c1bfcea3d46881bfbe11a`. Tipos/políticas herdados da #52, sem promover candidato #184. Backend #89–93 integrado por #177/#178/#181. O adaptador Stripe desta versão aceita somente chaves/objetos de teste. Publicação comercial exige os gates do [runbook backend imutável](https://github.com/pradyumna-001/bancaemdia-api/blob/b916f54331f14cf47a3800324bd61d8638043c06/docs/runbooks/billing-stripe.md): preço/provider/retorno/portal e requisitos de produção. CI de sandbox não libera cobrança live ou provisionamento.

PR independente contra main frontend b5fb27d197b4129c98c896232517e841bf8abca9. Dependências abertas: #52/PR #76, incorporada em commits separados, e formatadores #16/PR #69. Reconciliar sobreposições após merges/correções administrativas. Página/jornada são o escopo próprio; aviso/controller/identidade e geração extensa dos tipos são herdados.

## Página e ações

`/assinatura` permanece dentro do Shell protegido e usa a consulta do ProvedorAcesso, com cache e limpeza por usuário/época. AWAITING_CARD/TRIALING/ACTIVE/PAST_DUE/CANCELED/EXPIRED, access, datas e cancel_at_period_end vêm do servidor. Status/cadastro/retorno não concedem FULL_WRITE ou trial. Não calcular prazo restante. Consulta falha/atualização fecha ações comerciais e conserva contexto; leitura/exportação continuam.

Preços vêm de prices e a escolha é explícita. O formatador único `precoAssinatura` exibe amount_minor/currency/frequency sem desconto ou tier inventado. Preço atual usa somente price_id; fora do catálogo atual aparece Não informado. Oferta vazia/checkout_available=false mostra saída para Apostas/consulta manual.

Subscribe envia currency/frequency contratados e Idempotency-Key por intenção explícita. Corpo/chave ficam em memória, com termos presos ao pedido. Recusa definitiva permite revisar termos/iniciar outra intenção; resultado desconhecido/409 preserva preço/pedido e pausa aquela operação. Nenhuma mutation ganha retry de sessão, retorno ou rede. Outra operação independente, como abrir portal para conferir Checkout, continua sujeita ao servidor.

Portal/cancel são oferecidos por can_manage e estado, inclusive em READ_ONLY; orientação de botões não substitui autorização backend. Cancelar exige confirmação/desistência sem POST. ACK cancellation_scheduled comprova recebimento; agendamento/data dependem da nova consulta. ACK inválido/reconciliação não afirmam cancelamento concluído e não oferecem reenviar.

URLs hospedadas aceitam apenas HTTPS e host exato checkout.stripe.com ou billing.stripe.com, conforme o endpoint, sem credenciais/porta alternativa/fragmento/barra invertida. Nunca gravar URL Stripe, identificador externo, payload ou prova em storage/log/erro/artifact. Navegação tardia é descartada no logout/troca. Cartão e pagamentos pertencem exclusivamente à página hospedada.

## Retorno e contexto

BILLING_RETURN_URL é fixa no servidor. Opcionalmente preservar somente destino interno /assinatura, filtros conhecidos e fragmento não secreto em sessionStorage, por 30 minutos e consumido uma vez; destino passa pelo guard de protocolo existente. Não persistir pessoa, sessão, CSRF, chave idempotente ou URL Stripe. Storage indisponível não impede uso. Remover parâmetros de protocolo de billing antes de renderizar/persistir.

Retorno executa até três consultas GET adicionais em 1/2/4 segundos, além dos retries GET limitados permanentes. Primeiro erro/prazo encerra observação, sem antecipar Retry-After. Nova navegação interna não reativa o sinal consumido. Parâmetro success não concede acesso; nenhum POST é repetido. Oferecer conferência manual, sem prometer confirmação imediata de pagamento/webhook.

## Evidências e limites

Unitários cobrem estados/nulos, preços/moedas, corpo/chave, confirmação/desistência, recusa definitiva/incerta, destinos/persistência, logout e retorno limitado. E2E público cobre três navegadores/dois viewports, temas, axe/teclado/reflow320, checkout/retorno/portal/cancelamento e ausência de bypass. Stripe/respostas de pagamento são interceptados exclusivamente nos testes; não são prova de cobrança real. A prova OIDC/PostgreSQL herdada também visita a página pública, verifica catálogo real indisponível, READ_ONLY e recuperação ACTIVE pelo servidor, mobile/desktop, sem skips. Nenhuma cobrança live é necessária ao aceite da implementação.

Prévia com sessão/preços simulados existe somente em tests/fixtures/assinatura, build dist-assinatura-fixture, sem navegar a pagamento real. Publicar apenas dist/CSP do mesmo SHA aprovado.
