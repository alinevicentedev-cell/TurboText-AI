# TurboText AI: guia de publicacao e pagamentos

Este pacote contem um site estatico pronto para demonstracao. Ele mostra upload, primeiro audio gratuito, tabela de precos e fluxo de checkout. Para transcricao e pagamento reais, conecte um backend antes de vender para clientes.

Atualizacao: esta versao ja inclui um backend Netlify em `netlify/functions/transcribe.mjs` para transcricao real com OpenAI. Para funcionar publicado, voce precisa configurar a variavel `OPENAI_API_KEY` no Netlify.

## Preco recomendado

O preco sugerido no site e:

- Primeiro audio gratuito.
- Creditos avulsos: R$ 0,99 por minuto, compra minima de R$ 19,90.
- Pro: R$ 79,90/mes com 180 minutos e extra de R$ 0,69/min.
- Estudio: R$ 249,90/mes com 720 minutos e extra de R$ 0,49/min.

Por que esse valor: em 27/06/2026, referencias internacionais de transcricao automatica ficam perto de US$ 10 por hora em pay-as-you-go e US$ 0,20/min em creditos extras. O preco em reais acima fica competitivo para o Brasil e ainda deixa margem para API, hospedagem, armazenamento e taxas.

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

Passo a passo:

1. Crie uma conta de vendedor no Mercado Pago.
2. Acesse Mercado Pago Developers e crie uma aplicacao.
3. Pegue as credenciais de producao e guarde somente no backend.
4. No backend, crie uma preferencia de pagamento com nome do plano, quantidade, moeda BRL e valor.
5. Receba o `preference_id` e envie para o front-end.
6. No `app.js`, preencha `CHECKOUT_URLS` ou troque por uma chamada ao seu backend.
7. Configure URLs de retorno para sucesso, falha e pendente.
8. Configure notificacoes/webhooks para liberar creditos somente quando o pagamento estiver aprovado.
9. Teste com contas/cartoes de teste.
10. Suba para producao.

Referencias oficiais:

- Mercado Pago Checkout Pro: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview
- Criar preferencia de pagamento: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/create-payment-preference

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
