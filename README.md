# FullCharge — hospedagem GitHub Pages + sincronização Spott Eco

## O que este pacote entrega
- `public/index.html`: versão atual do portal de demonstração.
- `.github/workflows/pages.yml`: publica o site no GitHub Pages.
- `.github/workflows/spott-hourly.yml`: executa a tentativa de exportação da Spott a cada hora pelo GitHub Actions.
- `scripts/sync.mjs`: automatiza navegador e grava sessões no **Cloud Firestore privado**, com idempotência aproximada.
- `firestore.rules`: impede leitura pública das transações brutas.

## Passos
1. Crie um repositório no GitHub (de preferência **privado**) e carregue os arquivos da pasta, inclusive `.github`.
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**. A publicação usa `public/index.html`.
3. Crie um projeto Firebase, ative o Cloud Firestore e aplique as regras `firestore.rules`.
4. No Firebase, gere uma **conta de serviço** com acesso ao Firestore e salve o JSON somente como secret no GitHub. Não inclua no repositório.
5. Em **Settings → Secrets and variables → Actions**, cadastre `FIREBASE_SERVICE_ACCOUNT_JSON`, `SPOTT_USER`, `SPOTT_PASSWORD`, `SPOTT_USER_SELECTOR`, `SPOTT_PASS_SELECTOR`, `SPOTT_LOGIN_BUTTON_SELECTOR`, `SPOTT_EXPORT_SELECTOR`.
6. Os seletores precisam ser identificados com acesso autorizado à página autenticada. **Ainda não foram validados**. O layout pode mudar e exigir manutenção. Se usar CAPTCHA ou MFA, esta abordagem pode não funcionar.
7. Execute manualmente **Actions → Atualizar recargas Spott Eco → Run workflow**. Veja os logs sem divulgar informações confidenciais. Só depois deixe o agendamento ativo.

## Limitações importantes
- **Não está publicado nem executando**. É um projeto pronto para configurar, ainda sem autenticação validada na Spott.
- O portal atualmente é uma demonstração; ainda **não consulta o Firestore** e **não envia e-mail de confirmação**. É necessário implementar autenticação verificada por e-mail e consultas filtradas por usuário autenticado através de um backend confiável (Firebase Cloud Functions, Cloud Run etc.) ou estrutura equivalente. Não conecte as transações brutas diretamente ao navegador.
- GitHub Pages é público e estático. Não armazene dados pessoais, CSV, senhas ou JSON da conta de serviço dentro de `public/` ou em commits Git. GitHub Actions é execução temporária e pode atrasar em horários de maior demanda.
- No CSV de exemplo, o campo `Recargas` é `Finalizado` ou `Carregando`. Considere somente `Finalizado` no ranking; o importador guarda o status de todas as sessões para futura agregação segura.
- Sem ID explícito no CSV, a chave baseada em e-mail + estação + início pode ocasionalmente confundir duas sessões iniciadas no mesmo minuto. Se a Spott oferecer um identificador estável, atualize a chave.
- Para campanha iniciada em outubro, o cálculo de elegibilidade deve ser aplicado ao construir a classificação, não à importação.
