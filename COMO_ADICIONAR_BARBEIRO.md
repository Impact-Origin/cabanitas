# Como Adicionar um Novo Barbeiro

É muito fácil adicionar um novo barbeiro ao sistema! Siga estes passos:

## Passo 1: Abrir o arquivo de configuração

Abra o arquivo: `src/config/barbers.ts`

## Passo 2: Adicionar o novo barbeiro

No array `BARBERS`, adicione um novo objeto com as informações do barbeiro:

```typescript
export const BARBERS: Barber[] = [
  {
    id: "edgar",
    name: "Edgar",
    title: "Barbeiro Mestre | Proprietário",
    image: "/assets/edgar_placeholder.jpg",
    active: true,
  },
  // ADICIONE O NOVO BARBEIRO AQUI:
  {
    id: "joao",                    // ID único (minúsculas, sem espaços)
    name: "João Silva",            // Nome completo
    title: "Barbeiro",             // Título/cargo (opcional)
    image: "/assets/joao.jpg",     // Foto (opcional)
    active: true,                  // true = ativo, false = inativo
  },
];
```

## Passo 3: Adicionar foto (opcional)

Se quiser adicionar uma foto do barbeiro:

1. Coloque a imagem na pasta: `public/assets/`
2. Use o nome no campo `image`: `/assets/nome_da_foto.jpg`

## Passo 4: Pronto! 🎉

O novo barbeiro aparecerá automaticamente em:
- ✅ Formulário de marcação do cliente
- ✅ Formulário de marcação do admin
- ✅ Filtro de barbeiros no calendário
- ✅ Sistema de slots disponíveis

## Desativar um Barbeiro

Para desativar temporariamente um barbeiro (sem apagar):

```typescript
{
  id: "joao",
  name: "João Silva",
  title: "Barbeiro",
  active: false,  // Mude para false
}
```

O barbeiro não aparecerá mais nas opções, mas as marcações antigas continuam visíveis.

## Exemplo Completo

```typescript
export const BARBERS: Barber[] = [
  {
    id: "edgar",
    name: "Edgar",
    title: "Barbeiro Mestre | Proprietário",
    image: "/assets/edgar_placeholder.jpg",
    active: true,
  },
  {
    id: "joao",
    name: "João Silva",
    title: "Barbeiro Sénior",
    image: "/assets/joao.jpg",
    active: true,
  },
  {
    id: "pedro",
    name: "Pedro Costa",
    title: "Barbeiro",
    image: "/assets/pedro.jpg",
    active: true,
  },
];
```

## Notas Importantes

- **ID único**: Cada barbeiro deve ter um `id` diferente
- **Nome exato**: O `name` deve ser exatamente igual ao usado nas marcações
- **Sem reiniciar**: As alterações aparecem automaticamente, não precisa reiniciar o servidor


