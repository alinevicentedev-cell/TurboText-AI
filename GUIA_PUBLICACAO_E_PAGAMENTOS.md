# TurboText AI: guia de publicacao e pagamentos

Este pacote contem um site estatico pronto para demonstracao. Ele mostra upload, primeiro audio gratuito, tabela de precos e fluxo de checkout. Para transcricao e pagamento reais, conecte um backend antes de vender para clientes.

Atualizacao: esta versao ja inclui um backend Netlify em `netlify/functions/transcribe.mjs` para transcricao real com OpenAI. Para funcionar publicado, voce precisa configurar a variavel `OPENAI_API_KEY` no Netlify.

## Preco recomendado

O preco sugerido no site e:

- Primeiro audio gratuito.
- Creditos avulsos: R$ 0,79 por minuto, compra minima de R$ 14,90.
- Pro: R$ 79,90/mes com 420 minutos, saldo acumulavel por 60 dias e extra de R$ 0,39/min.
- Estudio: R$ 249,90/mes com 1.800 minutos, saldo acumulavel por 60 dias e extra de R$ 0,29/min.

Por que esse valor: em 28/06/2026, referencias internacionais mostram planos com poucos minutos no gratuito, cobranca por hora/minuto e limites por assinatura. A proposta do TurboText AI fica mais agressiva para o Brasil: mais minutos inclusos, menor preco avulso, extras mais baratos e saldo que acumula por 60 dias. Antes de vender em escala, revise sua margem considerando API, hospedagem, armazenamento e taxas de pagamento.

Fontes consultadas:

- Sonix Pricing: https://sonix.ai/pricing
- HappyScribe Pricing: https://www.happyscribe.com/pricing
- Otter Pricing: https://otter.ai/pricing
- Rev Pricing: https://www.rev.com/pricing

## Como publicar o site

Opcao mais simples para ver a pagina: Netlify Drop.

1. Entre em https://app.netlify.com/drop.
2. Arraste a pasta `turbotext-ai-site` inteira para a pagina.
3. Aguarde o link publicado.
4. Em `Domain management`, conecte um dominio como `turbotext.ai` ou `turbotextai.com.br`.
5. Teste a pagina no celular e no desktop.

Nome correto do projeto: `TurboText AI`. No Netlify, o dominio aparece sem espacos e geralmente em letras minusculas, por exemplo `turbotextai.com.br`, porque dominios nao aceitam espacos. Isso nao muda a marca: o nome publico exibido no site e nos metadados deve ser sempre `TurboText AI`.

Para a transcricao real, prefira publicar por GitHub conectado ao Netlify ou pela Netlify CLI. A documentacao do Netlify recomenda Git provider, CLI ou API para deploys com Functions, porque o build system detecta e publica as funcoes.

## Como ativar a transcricao real

1. Crie sua chave em https://platform.openai.com/api-keys.
2. No Netlify, abra o projeto publicado.
3. Va em `Site configuration`.
4. Entre em `Environment variables`.
5. Adicione a variavel:

```text
OPENAI_API_KEY=sua_chave_da_openai
```

6. Opcionalmente adicione:

```text
OPENAI_SUMMARY_MODEL=gpt-5.5
```

7. Clique em `Deploys`.
8. Faca um novo deploy do site.
9. Abra o site publicado pelo link `https://...netlify.app`, nao pelo arquivo local.
10. Envie um audio de ate 25 MB e clique em `Transcrever agora`.

Importante: abrir `index.html` diretamente no computador mostra o visual, mas nao roda a funcao de servidor. Para transcrever de verdade, use o site publicado no Netlify ou rode localmente com `netlify dev`.

Opcao mais profissional: GitHub + Netlify ou Vercel.

1. Crie um repositorio no GitHub.
2. Envie os arquivos `index.html`, `styles.css`, `app.js` e a pasta `assets`.
3. No Netlify ou Vercel, clique em importar projeto.
4. Como este site e estatico, nao precisa configurar comando de build.
5. Publique e conecte o dominio.

Referencia util: a documentacao do Netlify explica deploy por Git, CLI e arrastar pasta: https://docs.netlify.com/deploy/create-deploys/

## Como ligar pagamentos

Para vender no Brasil, recomendo Mercado Pago Checkout Pro porque aceita Pix, cartao, boleto e redireciona o cliente para um ambiente seguro.

Esta versao ja inclui a funcao `netlify/functions/create-payment.mjs`. Ela cria uma preferencia de pagamento no Mercado Pago e redireciona o cliente para o checkout seguro.

### Variaveis para colocar no Netlify

No Netlify, va em `Project configuration` > `Environment variables` > `Add a variable` e crie:

```text
MERCADO_PAGO_ACCESS_TOKEN=cole_aqui_o_access_token_de_producao_do_mercado_pago
SITE_URL=https://turbotextai.netlify.app
```

Se o dominio oficial ja estiver funcionando, troque o `SITE_URL` por:

```text
SITE_URL=https://turbotextai.com.br
```

Depois clique em `Deploys` > `Trigger deploy` > `Deploy site` para o Netlify publicar usando as novas variaveis.

### Onde pegar a chave do Mercado Pago

1. Entre em https://www.mercadopago.com.br/developers/panel/app.
2. Crie uma aplicacao para `TurboText AI`.
3. Abra a aplicacao.
4. Va em `Credenciais de producao`.
5. Copie o `Access Token` de producao.
6. Cole no Netlify como `MERCADO_PAGO_ACCESS_TOKEN`.

Importante: nao coloque o Access Token dentro do `app.js`, `index.html` ou GitHub publico. Ele precisa ficar somente no Netlify, em variavel de ambiente.

### Como testar

1. Publique o site no Netlify.
2. Abra `https://turbotextai.netlify.app`.
3. Clique em `Precos`.
4. Clique em `Comprar creditos`, `Assinar Pro` ou `Assinar Estudio`.
5. O site deve abrir o checkout do Mercado Pago.
6. No checkout, o cliente escolhe Pix, cartao ou boleto quando esses meios estiverem habilitados na sua conta Mercado Pago.

### Webhook para confirmar pagamentos

A funcao de webhook tambem ja foi criada em:

```text
https://turbotextai.netlify.app/.netlify/functions/mercado-pago-webhook
```

No painel do Mercado Pago, configure essa URL em `Webhooks` e selecione o evento `Pagamentos`.

Quando o dominio oficial estiver ativo, use:

```text
https://turbotextai.com.br/.netlify/functions/mercado-pago-webhook
```

Nesta fase, o webhook registra a confirmacao do pagamento nos logs do Netlify. Para liberar minutos automaticamente por cliente, o proximo passo e criar login e banco de dados para salvar usuario, plano, creditos e historico de pagamento.

Passo a passo tecnico:

1. Crie uma conta de vendedor no Mercado Pago.
2. Acesse Mercado Pago Developers e crie uma aplicacao.
3. Pegue as credenciais de producao e guarde somente no backend.
4. No backend, crie uma preferencia de pagamento com nome do plano, quantidade, moeda BRL e valor. Neste projeto, isso esta em `netlify/functions/create-payment.mjs`.
5. Receba o `preference_id` e envie para o front-end.
6. No `app.js`, os botoes ja chamam `/.netlify/functions/create-payment`.
7. Configure URLs de retorno para sucesso, falha e pendente.
8. Configure notificacoes/webhooks para liberar creditos somente quando o pagamento estiver aprovado.
9. Teste com contas/cartoes de teste.
10. Suba para producao.

Referencias oficiais:

- Mercado Pago Checkout Pro: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview
- Criar preferencia de pagamento: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/create-payment-preference
- Webhooks Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

Para clientes fora do Brasil, use Stripe Checkout como opcao adicional. A documentacao oficial descreve Checkout Sessions para pagamentos unicos e assinaturas: https://docs.stripe.com/payments/checkout

## Como a transcricao real funciona

Esta versao usa:

- Front-end: `app.js`.
- Backend seguro: `netlify/functions/transcribe.mjs`.
- Variavel secreta: `OPENAI_API_KEY`.
- Endpoint oficial: OpenAI Audio Transcriptions.
- Modelo padrao: `gpt-4o-transcribe`.
- Separacao de falantes: `gpt-4o-transcribe-diarize`.
- Marcadores de tempo sem falantes: `whisper-1` com `verbose_json`.

Limite atual: o envio direto para a API de transcricao aceita ate 25 MB por arquivo. Para audios maiores, a arquitetura profissional recomendada e:

1. Usuario cria conta ou entra por e-mail.
2. O backend verifica se ele ainda tem o primeiro audio gratis ou creditos pagos.
3. O upload vai para armazenamento privado, como S3, Cloudflare R2 ou Supabase Storage.
4. Uma fila processa o audio em partes para suportar arquivos longos.
5. A API de transcricao transforma o audio em texto.
6. O texto final fica salvo no banco com status, idioma, duracao, custo e usuario.
7. O usuario baixa TXT, DOCX, PDF, SRT ou VTT.

Importante: nao coloque chaves de API no `app.js`. Chaves de transcricao, Mercado Pago e Stripe precisam ficar no servidor.

## Checklist antes de vender

- Politica de privacidade publicada.
- Termos de uso com aviso de transcricao automatica.
- Consentimento do usuario para enviar audio.
- Limite real do primeiro audio gratis por conta/e-mail.
- Webhook de pagamento testado.
- Remocao ou retencao de arquivos definida.
- Pagina de suporte com e-mail ou WhatsApp.
- Monitoramento de custos por minuto.
