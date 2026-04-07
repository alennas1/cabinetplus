import React, { useMemo } from "react";
import {
  Briefcase,
  BookOpen,
  Calendar,
  Check,
  CreditCard,
  FileText,
  Layers,
  Package,
  Truck,
  Users,
} from "react-feather";
import {
  EMPLOYEE_PERMISSION_ACTIONS,
  EMPLOYEE_PERMISSION_GROUPS,
  buildEmployeeActionKey,
  normalizeEmployeePermissions,
} from "../utils/employeePermissions";
import "./EmployeePermissionPicker.css";

const ICONS_BY_KEY = {
  APPOINTMENTS: Calendar,
  PATIENTS: Users,
  DEVIS: FileText,
  CATALOGUE: BookOpen,
  PROSTHESES: Layers,
  LABORATORIES: Briefcase,
  FOURNISSEURS: Truck,
  EXPENSES: CreditCard,
  INVENTORY: Package,
};

const ACTION_LABELS = {
  [EMPLOYEE_PERMISSION_ACTIONS.MESSAGE]: "Messagerie",
  [EMPLOYEE_PERMISSION_ACTIONS.CREATE]: "Créer",
  [EMPLOYEE_PERMISSION_ACTIONS.UPDATE]: "Modifier",
  [EMPLOYEE_PERMISSION_ACTIONS.CANCEL]: "Annuler",
  [EMPLOYEE_PERMISSION_ACTIONS.STATUS]: "Statut",
  [EMPLOYEE_PERMISSION_ACTIONS.ARCHIVE]: "Archiver",
  [EMPLOYEE_PERMISSION_ACTIONS.DELETE]: "Supprimer",
};

const EmployeePermissionPicker = ({ value, onChange, disabled = false }) => {
  const normalized = useMemo(() => normalizeEmployeePermissions(value), [value]);
  const enabledKeys = useMemo(() => new Set(normalized), [normalized]);

  const update = (nextKeys) => {
    onChange?.(normalizeEmployeePermissions(nextKeys));
  };

  const toggleModule = (moduleKey, availableActions = []) => {
    if (disabled) return;
    if (!moduleKey) return;
    const moduleEnabled = enabledKeys.has(moduleKey);
    if (!moduleEnabled) {
      const actionKeys = (availableActions || []).map((a) => buildEmployeeActionKey(moduleKey, a));
      update([...normalized, moduleKey, ...actionKeys]);
      return;
    }

    const actionKeys = (availableActions || []).map((a) => buildEmployeeActionKey(moduleKey, a));
    update(normalized.filter((p) => p !== moduleKey && !actionKeys.includes(p)));
  };

  const toggleAction = (moduleKey, action) => {
    if (disabled) return;
    if (!moduleKey || !action) return;
    const actionKey = buildEmployeeActionKey(moduleKey, action);
    const moduleEnabled = enabledKeys.has(moduleKey);
    const next = new Set(normalized);
    if (!moduleEnabled) next.add(moduleKey);
    if (next.has(actionKey)) next.delete(actionKey);
    else next.add(actionKey);
    update(Array.from(next));
  };

  return (
    <div className="epp">
      <div className="epp-groups">
        {EMPLOYEE_PERMISSION_GROUPS.map((group) => {
          const items = group.items || [];
          if (!items.length) return null;
          return (
            <div key={group.title} className="epp-group">
              <div className="epp-group-title">{group.title}</div>
              <div className="epp-grid">
                {items.map((item) => {
                  const Icon = ICONS_BY_KEY[item.key] || Briefcase;
                  const moduleEnabled = enabledKeys.has(item.key);
                  const actionKeys = (item.actions || []).map((a) => buildEmployeeActionKey(item.key, a));
                  const selectedActions = actionKeys.filter((k) => enabledKeys.has(k));
                  const readOnly = moduleEnabled && selectedActions.length === 0;
                  return (
                    <div
                      key={item.key}
                      className={`epp-card ${moduleEnabled ? "is-on" : ""}`}
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      onClick={() => toggleModule(item.key, item.actions)}
                      onKeyDown={(e) => {
                        if (disabled) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleModule(item.key, item.actions);
                        }
                      }}
                      aria-pressed={moduleEnabled}
                    >
                      <div className="epp-icon" aria-hidden="true">
                        <Icon size={18} />
                      </div>
                      <div className="epp-main">
                        <div className="epp-title">{item.label}</div>
                        <div className="epp-desc">{item.description}</div>
                        {item.actions?.length ? (
                          <div className="epp-actions">
                            {item.actions.map((action) => {
                              const actionKey = buildEmployeeActionKey(item.key, action);
                              const on = enabledKeys.has(actionKey);
                              return (
                                <button
                                  key={actionKey}
                                  type="button"
                                  className={`epp-chip ${on ? "is-on" : ""}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleAction(item.key, action);
                                  }}
                                  disabled={disabled}
                                  aria-pressed={on}
                                >
                                  {ACTION_LABELS[action] || action}
                                </button>
                              );
                            })}
                            {readOnly ? <span className="epp-readonly">Lecture seule</span> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="epp-check" aria-hidden="true">
                        {moduleEnabled ? <Check size={16} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeePermissionPicker;
