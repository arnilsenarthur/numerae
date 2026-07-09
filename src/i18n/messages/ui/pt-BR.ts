export const uiPtBR = {
  validation: {
    required: "Campo obrigatório.",
    email: "Use um e-mail válido (ex: voce@email.com).",
    minLength: "Mínimo de {min} caracteres.",
    maxLength: "Máximo de {max} caracteres.",
    currency: "Use apenas números e vírgula (ex: 1.250,50).",
    positiveAmount: "Informe um valor maior que zero.",
    date: "Informe uma data válida.",
    url: "Informe uma URL válida.",
    valid: "Válido.",
  },
  dataTable: {
    empty: "Nenhum registro encontrado.",
    filter: "Filtrar…",
    sortAsc: "Ordenar coluna",
    sortDesc: "Inverter ordenação",
  },
  pagination: {
    pageOf: "Página {page} de {total}",
    rangeOf: "{from}–{to} de {total}",
    noResults: "0 resultados",
    prev: "Página anterior",
    next: "Próxima página",
    navLabel: "Paginação",
    pageLabel: "Página {page}",
  },
  smartTable: {
    edit: "Editar",
    add: "Adicionar",
  },
  select: {
    placeholder: "Selecione...",
    search: "Buscar...",
    noResults: "Nenhum resultado encontrado.",
  },
  pickers: {
    registry: {
      search: "Buscar...",
      empty: "Nenhum item encontrado.",
    },
    company: {
      label: "Empresa",
      placeholder: "Selecione a empresa…",
      search: "Buscar empresa ou registro…",
      empty: "Nenhuma empresa cadastrada.",
      manual: "Inserir manualmente",
      manualDescription: "Sem vincular a uma empresa cadastrada",
    },
    cnpj: {
      title: "Cadastrar CNPJ",
      placeholder: "00.000.000/0000-00",
      taxRateLabel: "Alíquota %",
      saveAndSelect: "Salvar e selecionar",
      lookupError: "Não foi possível consultar o CNPJ.",
      invalidCnpj: "Informe um CNPJ válido.",
      taxRateRange: "Alíquota deve estar entre 0 e 100.",
      saveError: "Erro ao salvar CNPJ.",
    },
  },
  loader: {
    loading: "Carregando...",
    ariaLabel: "Carregando",
  },
  toast: {
    close: "Fechar",
    closeNotification: "Fechar notificação",
  },
  signOut: {
    title: "Sair da conta",
    message: "Deseja encerrar sua sessão neste dispositivo?",
    confirm: "Sair",
    button: "Sair",
  },
  breadcrumbs: {
    ariaLabel: "Navegação",
  },
  iconPicker: {
    categories: {
      incomeExpense: "Despesas & receitas",
      goals: "Metas & objetivos",
      consumption: "Consumo & categorias",
      savings: "Economia & pagamentos",
      general: "Geral & utilitários",
    },
  },
} as const;
