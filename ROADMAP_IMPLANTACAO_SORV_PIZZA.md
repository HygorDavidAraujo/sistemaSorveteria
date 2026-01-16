# Roadmap de Implantação (Sorveteria + Pizzaria)

Foco: operação de balcão/mesas, vendas por peso (kg), integração com balança, delivery e fidelização.

## Objetivos do roadmap
- Acelerar atendimento no PDV com venda por kg e múltiplos canais.
- Garantir controle de estoque, custos e produção (sorvetes e pizzas).
- Escalar delivery e fidelidade sem perder margem.
- Criar base para fiscal/integrações de pagamentos.

---

## Fase 0 — Preparação (1–2 semanas)
**Meta:** deixar a operação pronta para go-live com dados e processos mínimos.

**Cadastros essenciais**
- Produtos por categoria: sorvetes, adicionais, massas, bordas, bebidas.
- Tamanhos e unidades (kg, g, unidades, fatias).
- Tabelas de preço por canal (balcão/mesa/delivery).
- Clientes básicos e regras de fidelidade.

**Equipamentos e operação**
- Balança integrada (protocolo e driver) — validação de leitura em tempo real.
- Impressoras térmicas (cozinha/produção/cliente) e layout de cupom.
- Teste de rede e estabilidade do ponto de venda.

**Processos mínimos**
- Abertura/fechamento de caixa diário.
- Conferência de estoque inicial.

---

## Fase 1 — PDV e Balança (2–4 semanas)
**Meta:** venda por kg fluida e confiável; redução de erros no caixa.

**Funcionalidades críticas**
- Venda por peso (kg) com captura direta da balança.
- Tolerância de variação de peso e travas contra divergência.
- Impressão de etiqueta/recibo com peso, preço/kg, total.
- Atalhos de PDV para itens mais vendidos.

**Melhorias operacionais**
- Múltiplas formas de pagamento e split.
- Modo rápido de balcão (fluxo de 2–3 cliques).
- Registro de operador e auditoria básica.

---

## Fase 2 — Comandas + Pizzaria (3–5 semanas)
**Meta:** operação eficiente de salão e produção.

**Sorveteria**
- Comandas por mesa/cliente.
- Pré-conta e divisão de pagamento.

**Pizzaria**
- Meio a meio com regra de precificação.
- Controle de sabores, bordas, adicionais e observações.
- Impressão direta para cozinha com tempo/ordem.

---

## Fase 3 — Estoque e Produção (4–6 semanas)
**Meta:** reduzir perdas e garantir CMV real.

**Estoque avançado**
- Entrada por lote/validade (laticínios, carnes, insumos).
- Ajustes com motivo e auditoria.
- Giro e alertas de ruptura.

**Ficha técnica / receita**
- Receita de sorvetes e pizzas com rendimento e perdas.
- Cálculo de custo unitário (CMV).
- Consumo automático de insumos na venda.

---

## Fase 4 — Delivery e Integrações (4–6 semanas)
**Meta:** ampliar canais com controle de margem.

- Cadastro de regiões e taxas de entrega.
- SLA de produção e despacho.
- Integrações com plataformas (iFood/Rappi/Uber) ou importação de pedidos.
- Conciliação de pagamento e repasse de taxas.

---

## Fase 5 — Fidelidade e CRM (3–5 semanas)
**Meta:** aumentar recorrência e ticket médio.

- Campanhas por aniversário (cupom automático).
- Segmentação por frequência/valor.
- Cashback e pontos com regras por canal.

---

## Fase 6 — Fiscal e Conformidade (tempo variável)
**Meta:** emissão fiscal e segurança jurídica.

- NFC-e/NF-e/SAT/CF-e conforme estado.
- Cadastro fiscal de produtos (NCM/CEST/CFOP/CSOSN).
- Rotinas de fechamento e exportação contábil.

---

## Indicadores recomendados
- Ticket médio por canal (PDV/comanda/delivery).
- % vendas por kg vs unitário.
- Margem por categoria (sorvete/pizza/bebidas).
- Perdas por validade e ajustes.
- SLA médio de entrega/produção.

---

## Critérios de sucesso
- Redução de divergência de peso e erros de caixa.
- Aumento de vendas por canal com margem estável.
- Estoque com precisão mínima de 95%.
- Relatórios diários automáticos para gestão.

---

## Observações de implantação
- Priorizar balança e PDV antes de automações avançadas.
- Validar o fluxo “pedido → produção → entrega → pagamento”.
- Treinar operadores com simulações reais.
