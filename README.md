# FullCharge — Portal privado com GitHub Pages e Firebase

## Alterações desta versão
- Botão **Ver demonstração** removido por completo.
- **Área Admin** com login Firebase Auth por e-mail e senha, protegida por `customClaims.admin`.
- **Inscrição do cliente** e acesso por link de verificação enviado por e-mail (Firebase Auth). **Não é código numérico de 6 dígitos**: para isso é necessário construir um serviço seguro de OTP.
- Cliente vê **exclusivamente seus próprios dados e sua colocação** — nunca a lista de posições, nomes ou consumo dos outros usuários.
- Firestore `resultados/{uid}/meses/{YYYY-MM}`: dados preparados via GitHub Actions, legíveis só pelo próprio UID autenticado.
- CSV bruto da Spott permanece em `spott_transactions`, bloqueado para clientes.

## Configuração obrigatória antes de publicar
1. Em **Firebase Console → Authentication → Sign-in method**, habilite **Email/Password** (para Admin) e **Email link (passwordless)** (para clientes). O Firebase pode exigir habilitar ambos.
2. Em **Authentication → Settings → Authorized domains**, adicione `grupogoncalves.github.io` caso não esteja presente. O link de e-mail retorna para `https://grupogoncalves.github.io/recarga/`.
3. Em **Firestore → Rules**, publique o conteúdo de `firestore.rules`. **Regras antigas devem ser substituídas.**
4. GitHub → **Settings → Secrets and variables → Actions**: cadastre `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON de conta de serviço privada), `FULLCHARGE_ADMIN_EMAIL` e `FULLCHARGE_ADMIN_PASSWORD` (senha forte com mínimo 12 caracteres). NÃO coloque esses valores no código público.
5. GitHub Actions → **Configurar administrador FullCharge** → Run workflow. Ele cria a conta Admin e aplica custom claim `admin: true`. Caso a conta já exista, somente concede acesso Admin; nesse caso a senha anterior continua válida.
6. Login Admin fica disponível em **Admin** no portal. Não existe senha padrão nem cadastro público de administradores.
7. Configure a rotina **Atualizar recargas Spott Eco** com os Secrets documentados abaixo. Só depois de importar um CSV com êxito os dados do cliente serão exibidos.

## Secrets necessários para sincronização
`FIREBASE_SERVICE_ACCOUNT_JSON`, `SPOTT_USER`, `SPOTT_PASSWORD`, `SPOTT_USER_SELECTOR`, `SPOTT_PASS_SELECTOR`, `SPOTT_LOGIN_BUTTON_SELECTOR`, `SPOTT_EXPORT_SELECTOR`.

**Atenção:** os seletores de login/exportação da Spott Eco **ainda não foram verificados**. O workflow não poderá sincronizar até que sejam configurados com base na interface autenticada. Playwright usa uma conta autorizada da Spott e não contorna CAPTCHA ou mecanismos de segurança. GitHub Actions pode atrasar em horários de pico.

## Dados e privacidade
O site **não publica o CSV** e não mostra dados pessoais de terceiros. Os valores individuais são escritos pelo importador com Firebase Admin SDK (ignora regras do Firestore), e as regras garantem que `resultados/{uid}/meses/{YYYY-MM}` seja lido somente pelo próprio usuário ou Admin. A identificação das recargas usa o e-mail confirmado no Firebase igual ao e-mail do motorista na Spott.

**Atenção à elegibilidade da campanha:** a sincronização atual considera todas as recargas finalizadas de cada e-mail que estiver inscrito, dentro do mês do CSV, inclusive anteriores à inscrição. Se a promoção exigir contar só recargas depois do cadastro, ajuste essa condição no importador.

**Atenção à exatidão:** o CSV não apresenta ID único confirmado; o importador deduplica pela combinação e-mail, carregador e hora de início (precisão de minuto), o que pode colidir em sessões diferentes. Ranking é calculado somente sobre registros presentes no CSV de cada execução; mantenha exportação do período completo ou ajuste para agregar o acervo inteiro antes de usar em produção.

## Estrutura
- `public/index.html`: site estático GitHub Pages.
- `firestore.rules`: controle de acesso no Firestore.
- `scripts/setup-admin.mjs`: provisionamento seguro do Admin.
- `scripts/sync.mjs`: leitura do CSV, gravação de transações e projeção privada por cliente.
- `.github/workflows/pages.yml`: publicação.
- `.github/workflows/spott-hourly.yml`: tentativa de sincronização a cada hora.
- `.github/workflows/setup-admin.yml`: cadastro inicial da conta Admin.
