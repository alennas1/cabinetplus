export const EMPLOYEE_PERMISSION_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  CANCEL: "CANCEL",
  STATUS: "STATUS",
  ARCHIVE: "ARCHIVE",
  DELETE: "DELETE",
  MESSAGE: "MESSAGE",
};

export const buildEmployeeActionKey = (moduleKey, action) => `${moduleKey}_${action}`;

export const EMPLOYEE_PERMISSION_GROUPS = [
  {
    title: "Clinique",
    items: [
      {
        key: "APPOINTMENTS",
        label: "Rendez-vous",
        description: "Agenda, création et gestion des rendez-vous.",
        actions: [
          EMPLOYEE_PERMISSION_ACTIONS.CREATE,
          EMPLOYEE_PERMISSION_ACTIONS.UPDATE,
          EMPLOYEE_PERMISSION_ACTIONS.CANCEL,
        ],
      },
      {
        key: "PATIENTS",
        label: "Patients",
        description: "Accès aux dossiers patients et informations cliniques.",
        actions: [
          EMPLOYEE_PERMISSION_ACTIONS.CREATE,
          EMPLOYEE_PERMISSION_ACTIONS.UPDATE,
          EMPLOYEE_PERMISSION_ACTIONS.ARCHIVE,
        ],
      },
      {
        key: "DEVIS",
        label: "Devis",
        description: "Créer et consulter les devis du cabinet.",
        actions: [EMPLOYEE_PERMISSION_ACTIONS.CREATE, EMPLOYEE_PERMISSION_ACTIONS.DELETE],
      },
    ],
  },
  {
    title: "Catalogue",
    items: [
      {
        key: "CATALOGUE",
        label: "Catalogues",
        description: "Médicaments, traitements, justifications, matériaux, etc.",
        actions: [
          EMPLOYEE_PERMISSION_ACTIONS.CREATE,
          EMPLOYEE_PERMISSION_ACTIONS.UPDATE,
          EMPLOYEE_PERMISSION_ACTIONS.DELETE,
        ],
      },
      {
        key: "PROSTHESES",
        label: "Prothèses",
        description: "Suivi des prothèses et tracking.",
        actions: [
          EMPLOYEE_PERMISSION_ACTIONS.CREATE,
          EMPLOYEE_PERMISSION_ACTIONS.UPDATE,
          EMPLOYEE_PERMISSION_ACTIONS.STATUS,
          EMPLOYEE_PERMISSION_ACTIONS.CANCEL,
          EMPLOYEE_PERMISSION_ACTIONS.DELETE,
        ],
      },
    ],
  },
  {
    title: "Gestion cabinet",
    items: [
      {
        key: "LABORATORIES",
        label: "Laboratoires",
        description: "Gestion des laboratoires / partenaires.",
        actions: [
          EMPLOYEE_PERMISSION_ACTIONS.MESSAGE,
          EMPLOYEE_PERMISSION_ACTIONS.CREATE,
          EMPLOYEE_PERMISSION_ACTIONS.UPDATE,
          EMPLOYEE_PERMISSION_ACTIONS.ARCHIVE,
          EMPLOYEE_PERMISSION_ACTIONS.CANCEL,
          EMPLOYEE_PERMISSION_ACTIONS.DELETE,
        ],
      },
      {
        key: "FOURNISSEURS",
        label: "Fournisseurs",
        description: "Gestion des fournisseurs et partenaires logistiques.",
        actions: [
          EMPLOYEE_PERMISSION_ACTIONS.CREATE,
          EMPLOYEE_PERMISSION_ACTIONS.UPDATE,
          EMPLOYEE_PERMISSION_ACTIONS.ARCHIVE,
          EMPLOYEE_PERMISSION_ACTIONS.CANCEL,
          EMPLOYEE_PERMISSION_ACTIONS.DELETE,
        ],
      },
      {
        key: "EXPENSES",
        label: "Dépenses",
        description: "Saisie et suivi des dépenses du cabinet.",
        actions: [
          EMPLOYEE_PERMISSION_ACTIONS.CREATE,
          EMPLOYEE_PERMISSION_ACTIONS.UPDATE,
          EMPLOYEE_PERMISSION_ACTIONS.CANCEL,
          EMPLOYEE_PERMISSION_ACTIONS.DELETE,
        ],
      },
      {
        key: "INVENTORY",
        label: "Inventaire",
        description: "Gestion du stock et des consommables.",
        actions: [
          EMPLOYEE_PERMISSION_ACTIONS.CREATE,
          EMPLOYEE_PERMISSION_ACTIONS.UPDATE,
          EMPLOYEE_PERMISSION_ACTIONS.CANCEL,
          EMPLOYEE_PERMISSION_ACTIONS.DELETE,
        ],
      },
    ],
  },
];

export const normalizeEmployeePermissions = (permissions) => {
  const current = Array.isArray(permissions) ? permissions.filter(Boolean).map(String) : [];
  const baseKeys = EMPLOYEE_PERMISSION_GROUPS.flatMap((g) => (g.items || []).map((i) => i.key));
  const actionKeys = EMPLOYEE_PERMISSION_GROUPS.flatMap((g) =>
    (g.items || []).flatMap((i) => (i.actions || []).map((a) => buildEmployeeActionKey(i.key, a))),
  );
  const allowed = new Set([...baseKeys, ...actionKeys, "SUPPORT"]);

  const next = new Set();
  for (const raw of current) {
    const incoming = String(raw || "").trim();
    if (!incoming) continue;

    // Backward compatibility: previously, lab-messaging was stored as `MESSAGING_LABS`.
    // It is now an action under `LABORATORIES`.
    const key =
      incoming === "MESSAGING_LABS"
        ? buildEmployeeActionKey("LABORATORIES", EMPLOYEE_PERMISSION_ACTIONS.MESSAGE)
        : incoming;

    if (!allowed.has(key)) continue;
    next.add(key);
  }

  // If any action is selected, ensure the module itself is enabled.
  for (const key of Array.from(next)) {
    const idx = key.lastIndexOf("_");
    if (idx <= 0) continue;
    const maybeBase = key.slice(0, idx);
    if (baseKeys.includes(maybeBase)) next.add(maybeBase);
  }

  next.add("SUPPORT"); // always enabled for employees/staff
  return Array.from(next);
};
