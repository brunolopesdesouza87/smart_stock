# Configuração de URLs de Redirecionamento - Supabase

## Problema Resolvido
Quando usuários confirmam o email de cadastro ou redefinição de senha, agora serão redirecionados corretamente para a página de login ao invés de erro 404.

## O que foi alterado no código
✅ Adicionado `emailRedirectTo` no `signUp()` para redirecionar após confirmação de email
✅ Adicionado `redirectTo` no `resetPasswordForEmail()` para redirecionar após reset de senha

## Configuração necessária no Supabase Dashboard

### Passo 1: Acessar o Supabase Dashboard
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto **SmartStock**
3. No menu lateral, vá em **Authentication** → **URL Configuration**

### Passo 2: Adicionar URLs de Redirecionamento
Na seção **Redirect URLs**, adicione as seguintes URLs:

#### Para produção:
```
https://estoque.r2b.ia.br
https://estoque.r2b.ia.br/
```

#### Para desenvolvimento local (XAMPP) - Opcional:
```
http://localhost/smart_stock/
http://localhost/smart_stock/index.html
```

### Passo 3: Configurar Site URL
Na seção **Site URL**, defina:

**Produção:**
```
https://estoque.r2b.ia.br
```

### Passo 4: Salvar as configurações
Clique em **Save** para aplicar as alterações.

## Como testar

### Teste 1: Confirmação de Email
1. Crie um novo usuário no sistema
2. Verifique o email de confirmação
3. Clique no link de confirmação
4. ✅ Deve redirecionar para `https://estoque.r2b.ia.br` com acesso ativado

### Teste 2: Recuperação de Senha
1. Na tela de login, clique em "Esqueceu sua senha?"
2. Digite o email cadastrado
3. Verifique o email de recuperação
4. Clique no link de redefinição
5. ✅ Deve abrir o modal para definir nova senha

## Observações importantes

⚠️ **URLs devem ser exatas**: O Supabase só permite redirecionamento para URLs previamente cadastradas por segurança.

⚠️ **Múltiplos ambientes**: Se usar desenvolvimento e produção, cadastre todas as URLs necessárias.

⚠️ **Wildcards**: O Supabase permite wildcards como `http://localhost:*/*` mas é mais seguro ser específico.

## Como ficou o fluxo completo

### Cadastro:
1. Usuário preenche formulário de cadastro
2. Recebe email com link de confirmação
3. Clica no link → Redireciona para `https://estoque.r2b.ia.br`
4. Sistema detecta confirmação e permite login automático

### Recuperação de Senha:
1. Usuário clica em "Esqueceu sua senha?"
2. Recebe email com link de redefinição
3. Clica no link → Redireciona para `https://estoque.r2b.ia.br`
4. Sistema detecta `type=recovery` na URL
5. Abre modal para definir nova senha
6. Após salvar, usuário está logado automaticamente
