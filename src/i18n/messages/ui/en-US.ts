export const uiEnUS = {
  validation: {
    required: "This field is required.",
    email: "Enter a valid email (e.g. you@email.com).",
    minLength: "At least {min} characters.",
    maxLength: "Maximum {max} characters.",
    currency: "Use numbers and comma only (e.g. 1,250.50).",
    positiveAmount: "Enter an amount greater than zero.",
    date: "Enter a valid date.",
    url: "Enter a valid URL.",
    valid: "Valid.",
  },
  dataTable: {
    empty: "No records found.",
    filter: "Filter…",
    sortAsc: "Sort column",
    sortDesc: "Reverse sort",
  },
  pagination: {
    pageOf: "Page {page} of {total}",
    rangeOf: "{from}–{to} of {total}",
    noResults: "0 results",
    prev: "Previous page",
    next: "Next page",
    navLabel: "Pagination",
    pageLabel: "Page {page}",
  },
  smartTable: {
    edit: "Edit",
    add: "Add",
  },
  select: {
    placeholder: "Select...",
    search: "Search...",
    noResults: "No results found.",
  },
  pickers: {
    registry: {
      search: "Search...",
      empty: "No items found.",
    },
    company: {
      label: "Company",
      placeholder: "Select a company…",
      search: "Search company or registration…",
      empty: "No companies registered.",
      manual: "Enter manually",
      manualDescription: "Without linking to a registered company",
    },
    cnpj: {
      title: "Register CNPJ",
      placeholder: "00.000.000/0000-00",
      taxRateLabel: "Tax rate %",
      saveAndSelect: "Save and select",
      lookupError: "Could not look up CNPJ.",
      invalidCnpj: "Enter a valid CNPJ.",
      taxRateRange: "Tax rate must be between 0 and 100.",
      saveError: "Could not save CNPJ.",
    },
  },
  loader: {
    loading: "Loading...",
    ariaLabel: "Loading",
  },
  toast: {
    close: "Close",
    closeNotification: "Close notification",
  },
  signOut: {
    title: "Sign out",
    message: "Do you want to end your session on this device?",
    confirm: "Sign out",
    button: "Sign out",
  },
  breadcrumbs: {
    ariaLabel: "Breadcrumb",
  },
  iconPicker: {
    categories: {
      incomeExpense: "Income & expenses",
      goals: "Goals & objectives",
      consumption: "Spending & categories",
      savings: "Savings & payments",
      general: "General & utilities",
    },
  },
} as const;
