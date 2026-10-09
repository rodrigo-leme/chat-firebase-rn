# 💬 Chat Firebase — React Native

Aplicativo de chat em **React Native + Expo + TypeScript** com conversas individuais e em grupo, mensagens em tempo real no **Firebase Realtime Database**, perfis/grupos/configurações no **Cloud Firestore**, autenticação por **e-mail e senha** e **push notifications** enviadas por uma **API própria** publicada na internet.

## Integrantes

- RM550266 — Rodrigo Leme

---

## 🧰 Tecnologias

| Camada | Tecnologia |
|---|---|
| App | React Native 0.86, **Expo SDK 57**, TypeScript (strict, sem `any`) |
| Navegação | React Navigation 7 (native-stack) |
| Backend Firebase | Authentication, Realtime Database, Cloud Firestore, Cloud Messaging |
| Notificações no app | `expo-notifications` (token FCM nativo no Android + Expo Push Token) |
| API | Node.js 22 + Express 5 + Firebase Admin SDK, hospedada no **Render** (HTTPS) |
| Fotos | **Cloudinary** (plano gratuito; somente a URL é salva no Firestore) |

## 🔥 Responsabilidade de cada serviço

| Serviço | Uso no projeto |
|---|---|
| **Authentication** | Cadastro/login por e-mail e senha, sessão persistida (AsyncStorage), `uid`, logout. Nenhum outro provedor. |
| **Realtime Database** | `messages/{conversationId}/{messageId}` (todas as mensagens) com listeners em tempo real; `groupMembers/{groupId}` (espelho de integrantes, escrito só pela API, usado pelas regras); `.info/connected` para detectar falta de conexão. |
| **Cloud Firestore** | `users/{uid}` (perfil completo), `publicProfiles/{uid}` (nome + foto para a lista), `users/{uid}/devices/{deviceId}` (tokens), `groups/{groupId}` (metadados, `memberIds`, `memberLimit`, `notificationPolicy`), `directConversations/{id}`, `profileAccess` e `notificationDispatches` (só API). |
| **Cloud Messaging** | Entrega dos pushes no Android (Admin SDK `messaging.sendEach`), com `conversationId` e `conversationType` no payload `data`. |
| **Cloudinary** (fora do Firebase) | Arquivos das fotos em `chat-fiap/profiles/{uid}` e `chat-fiap/groups/{groupId}`. |

## 📁 Estrutura

```text
├── App.tsx / index.ts / app.config.ts
├── firebaseConfig.json          # config do SDK cliente (sem segredos)
├── firestore.rules · database.rules.json · firebase.json
├── apiConfig.json · cloudinaryConfig.json   # URL da API e conta do Cloudinary (valores públicos)
├── render.yaml                  # deploy da API no Render
├── src/
│   ├── components/   Avatar, ChatInput, ChatMessage, ConversationItem, GroupMemberItem, PhotoPicker, Feedback, Form
│   ├── screens/      Login, Register, Conversations, Users, GroupForm, Chat, GroupMembers, Profile
│   ├── services/     firebase, authService, userService, groupService, chatService, notificationService, storageService, apiService
│   ├── hooks/        useAuth, useChat (+useConnection), useGroups (+useConversations, useProfiles), useNotifications
│   ├── contexts/     AuthContext
│   ├── navigation/   AppNavigator
│   ├── types/        user, chat, group, notification, navigation
│   └── utils/        conversationId, groupValidation, errors
└── server/
    └── src/
        ├── app.ts
        ├── middleware/authenticate.ts
        ├── routes/notifications.ts · routes/groups.ts
        └── services/firebaseAdmin.ts · notificationSender.ts · recipientResolver.ts (+ testes)
```

---

## 🚀 Instalação e execução do app

Pré-requisitos: Node 20+, conta Expo (EAS) e um **dispositivo físico** (push não funciona em emulador/Expo Go).

```bash
npm install
# coloque a URL da API em apiConfig.json
npx eas login
npx eas init                  # copie o projectId para app.config.ts
npx eas build --profile development --platform android   # ou ios
npm start                     # abre o Metro para o development build
```

> O app usa **development build** (`expo-dev-client`), pois as notificações completas não funcionam no Expo Go.

### Configuração do Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com/).
2. **Authentication → Método de login →** habilite apenas **E-mail/senha**.
3. Crie o **Cloud Firestore** e o **Realtime Database**.
4. Adicione um **app Web** e copie a configuração para `firebaseConfig.json` (mesmos campos do arquivo).
5. Publique as regras:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add            # selecione o projeto
   firebase deploy --only firestore:rules,database
   ```

### Fotos (Cloudinary)

**Serviço escolhido: Cloudinary.** O Firebase Storage passou a exigir o plano pago Blaze, então as imagens são guardadas no Cloudinary (plano gratuito, sem cartão), como o enunciado permite.

Fluxo: a foto é escolhida na galeria com `expo-image-picker` (permissão solicitada e tratada), recortada em 1:1 e enviada ao Cloudinary por upload *unsigned* (`src/services/storageService.ts`). A resposta traz a URL HTTPS final, e **só essa URL** é gravada no Firestore (`photoUrl`). Nada é salvo em Base64. Se a foto não existir ou falhar ao carregar, o componente `Avatar` mostra uma imagem padrão (inicial do nome).

Configuração:
1. Crie uma conta grátis em [cloudinary.com](https://cloudinary.com) e copie o **Cloud name** do Dashboard.
2.   2. Settings → **Upload** → Upload presets → **Add upload preset**. Aba *General*: nome `chat_fiap_unsigned`, *Signing mode* **Unsigned**, *Asset folder* `chat-fiap`. Aba *Optimize and Deliver*: *Allowed formats* `jpg, jpeg, png`. Salve. (O tamanho máximo por imagem é o limite do plano gratuito, 10 MB; o app já reduz a foto antes de enviar.)
3. Preencha `cloudinaryConfig.json` com o `cloudName` e o `uploadPreset`.

O upload *unsigned* não usa API Secret: o app não contém nenhuma credencial do Cloudinary, e o preset limita pasta, formato e tamanho.

### Notificações — Android

1. No console Firebase, adicione um **app Android** com o pacote `br.com.fiap.chatfirebase`.
2. Baixe o `google-services.json` e coloque na raiz do projeto (o `app.config.ts` o inclui automaticamente). Ele contém apenas identificadores do cliente.
3. Gere o development build. O app obtém o **token FCM nativo** (`getDevicePushTokenAsync`) e a API envia pelo **Firebase Admin SDK (FCM)**.
4. Android 13+: a permissão `POST_NOTIFICATIONS` é solicitada no primeiro login. Canal: `messages`.

### Notificações — iOS

1. É necessária conta Apple Developer. No `eas build --platform ios`, deixe o EAS gerar a **chave APNs** (Push Notifications).
2. O app obtém o **Expo Push Token** e a API envia via **Expo Push Service**, que entrega pelo APNs.
3. `UIBackgroundModes: remote-notification` já está no `app.config.ts`.

> Motivo: o Admin SDK do FCM não aceita tokens APNs crus; o Expo Push Service (aceito pelo enunciado) faz essa ponte. No Android o envio é FCM direto.

---

## 🌐 API de notificações

- **Tecnologia:** Node.js 22 + Express 5 + TypeScript + Firebase Admin SDK
- **Hospedagem:** Render (HTTPS automático)
- **URL pública:** `https://chat-firebase-api.onrender.com` ← **substituir pela URL após o deploy**

### Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/health` | — | Health check: `{"status":"ok", ...}` |
| `POST` | `/notifications/messages` | Bearer ID Token | Body `{ conversationId, messageId }`. Valida token, confere no RTDB que a mensagem existe e que `senderId` = usuário, lê participantes/política/tokens no Firestore, calcula destinatários e envia. Idempotente. |
| `POST` | `/groups/:groupId/sync-members` | Bearer ID Token | Espelha os integrantes do grupo (Firestore → RTDB `groupMembers`) e atualiza `profileAccess`. Chamado após criar/editar grupo e ao abrir o chat. Idempotente. |

Verificar disponibilidade:

```bash
curl https://SUA-API.onrender.com/health
```

### Variáveis (configuradas só nos *secrets* da hospedagem)

`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, `EXPO_ACCESS_TOKEN` (opcional), `PORT`. Ver `server/.env.example` (somente marcadores).

### Executar localmente (desenvolvimento)

```bash
cd server
npm install
npm test           # testes do cálculo de destinatários
npm run dev        # exige as variáveis no ambiente
```

### Publicar no Render

1. Console Firebase → Configurações → **Contas de serviço** → gerar chave privada (não versionar!).
2. Permissões mínimas recomendadas para a conta de serviço no Google Cloud IAM: *Cloud Datastore User*, *Firebase Realtime Database Admin*, *Firebase Cloud Messaging API Admin* (a verificação de ID Token não exige papel).
3. Render → **New → Blueprint** → selecione o repositório (usa `render.yaml`, pasta `server/`).
4. Preencha os secrets com os valores da chave (`FIREBASE_PRIVATE_KEY` pode ser colada com `\n`).
5. Após o deploy, teste `/health` e coloque a URL em `apiConfig.json` e neste README.

> ⚠️ No plano gratuito o Render hiberna após inatividade (a primeira chamada pode demorar ~1 min). Para a correção, use um plano pago ou um ping periódico ao `/health` para manter a API ativa.

---

## 🔔 Política de notificações

Cada grupo possui `notificationPolicy`, alterável pelo proprietário na tela de edição. Os destinatários são **sempre calculados na API** (`recipientResolver.ts`); a API nunca aceita lista de destinatários do app.

| Política | Quem recebe |
|---|---|
| `all_group_messages` | Todos os integrantes, exceto o remetente |
| `mentioned_members` | Somente integrantes mencionados/selecionados (`@` no chat) que ainda são do grupo |
| `direct_messages_only` | Ninguém no grupo (só conversas individuais geram push) |
| `disabled` | Ninguém |

Regras gerais: remetente nunca recebe; só participantes recebem; conversas individuais notificam o outro participante; o texto do push é genérico (“Nova mensagem de Fulano”), sem o conteúdo da mensagem; o payload contém `conversationId` e `conversationType` e o toque abre a conversa (`addNotificationResponseReceivedListener` + `getLastNotificationResponse` para app fechado). Tokens rejeitados pelo FCM (`registration-token-not-registered`) ou Expo (`DeviceNotRegistered`) são marcados `enabled: false`. No logout, o token do aparelho é desativado.

**Proteção contra duplicidade:** antes de enviar, a API cria `notificationDispatches/{conversationId}__{messageId}` com `create()`, que falha se o documento já existir. Uma requisição repetida retorna `{"status":"duplicate"}` sem reenviar.

## 👥 Limite de integrantes e concorrência

- `memberLimit` é definido na criação (inteiro, 2–50) e pode ser alterado pelo proprietário; a interface mostra integrantes atuais e vagas.
- **Interface:** `validateGroup` bloqueia salvar acima do limite ou reduzir o limite abaixo da quantidade atual.
- **Serviço:** `updateGroup`, `addMember` e `removeMember` usam `runTransaction` do Firestore: leem a versão mais recente, validam e gravam. Se duas escritas concorrem, uma delas é reexecutada com os dados novos e falha na validação.
- **Banco (garantia final):** a regra `validGroup` exige `memberIds.size() <= memberLimit` sobre o **documento resultante** de cada escrita, avaliado atomicamente no servidor do Firestore. Mesmo requisições simultâneas ou clientes modificados não conseguem ultrapassar o limite. Só o `ownerId` pode atualizar o grupo.

## 🔒 Regras de segurança

Arquivos versionados: [`firestore.rules`](firestore.rules) e [`database.rules.json`](database.rules.json).

- **Firestore:** tudo exige autenticação. `users/{uid}` (e-mail, celular, nascimento) só pode ser lido pelo próprio usuário ou por quem tem conversa individual (`directConversations` com id determinístico) ou grupo em comum (`profileAccess`, mantido pela API). A lista de usuários lê apenas `publicProfiles` (nome e foto). `devices` só pelo dono. Grupos: leitura só por integrantes, escrita só pelo proprietário, com validação de limite. `directConversations`: exatamente 2 participantes distintos, id `direct_<uidMenor>_<uidMaior>` (impede duplicidade e conversa consigo mesmo).
- **Realtime Database:** leitura/escrita negadas por padrão. Mensagens diretas: só os dois `uid` contidos no id. Mensagens de grupo: só quem está em `groupMembers/{groupId}` (escrito apenas pela API). Mensagens são imutáveis, `senderId` = `auth.uid`, `createdAt` = horário do servidor, texto 1–2000 caracteres, menções só para integrantes. Usuário removido perde o acesso assim que a API sincroniza.
- **Fotos (Cloudinary):** upload *unsigned* limitado pelo preset (pasta `chat-fiap`, só `jpg/png`, até 5 MB); nenhum segredo no app. Quem pode alterar o `photoUrl` é controlado pelas regras do Firestore (perfil pelo dono, grupo pelo proprietário).

**Decisão documentada:** as regras do Realtime Database não conseguem consultar o Firestore. Por isso a API (Admin SDK) é a responsável pelas validações que dependem dos dois bancos: espelha integrantes do grupo no RTDB, confere a mensagem no RTDB contra a política/participantes no Firestore antes do push e mantém o acesso a perfis de integrantes.

## 🔑 Configuração de ambiente

- `firebaseConfig.json` — configuração do SDK cliente (apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId). **Não** contém credenciais administrativas. **Substitua os valores de exemplo pelos do seu projeto antes da entrega.**
- `.env.example` (app) e `server/.env.example` (API) — apenas nomes e marcadores.
- Nenhuma chave privada/conta de serviço é versionada (ver `.gitignore`).

---

## 📸 Prints das telas

Salve as imagens em `docs/screenshots/` com estes nomes:

| Login | Cadastro | Conversas | Usuários |
|---|---|---|---|
| ![](docs/screenshots/login.png) | ![](docs/screenshots/cadastro.png) | ![](docs/screenshots/conversas.png) | ![](docs/screenshots/usuarios.png) |

| Grupo | Chat | Integrantes | Perfil |
|---|---|---|---|
| ![](docs/screenshots/grupo.png) | ![](docs/screenshots/chat.png) | ![](docs/screenshots/integrantes.png) | ![](docs/screenshots/perfil.png) |

## 🔔 Evidência de notificação recebida

![Notificação recebida](docs/screenshots/notificacao.png)
