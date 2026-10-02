# Proteção de branch

## Estado verificado

Em 29/09/2026 a conta usada neste trabalho tem `push=true`, `triage=true`, `admin=false`, `maintain=false` em `pradyumna-001/bancaemdia-frontend`. A leitura da proteção de `main` retorna 404; a lista de rulesets está vazia. Isso não comprova proteção aplicada. Não houve tentativa de alterar permissões ou usar credenciais de outra conta.

## Configuração para administrador

O payload revisável está em [config/branch-protection.json](../../config/branch-protection.json): PR com uma aprovação, invalidar aprovação após novos commits, resolver conversas, checks atuais obrigatórios e atualizados com a base, sem force-push/deleção, inclusive para administradores.

Um administrador deve primeiro consultar e preservar regras existentes mais fortes. Aplicar este payload com PUT substitui a configuração de proteção; não fazê-lo às cegas se já houver regras. Para main sem configuração anterior, a partir da raiz do repositório:

```sh
gh api --method PUT repos/pradyumna-001/bancaemdia-frontend/branches/main/protection --input config/branch-protection.json
gh api repos/pradyumna-001/bancaemdia-frontend/branches/main/protection
```

Verificar que a resposta contém todos os checks e exigências e testar em PR sem checks/sem aprovação, sem efetuar merge desse PR. Não substituir segurança por status vazio. A cadeia atual usa PRs empilhados: proteção só de main não bloqueia merge nas branches intermediárias; cada entrega ainda exige todos os checks verdes e revisão. Aplicar regras adicionais às branches de integração se esse fluxo for mantido.

Impedimento externo da #8: permissão administrativa ausente. CI verde prova execução; não prova enforcement de merge. Quem aplicar a configuração deve registrar resposta/data na issue #8.
