const fs = require('fs');

function updatePatient() {
  const file = 'c:/Users/DELL/Desktop/cabinetplus/frontend/src/pages/Patient.jsx';
  let content = fs.readFileSync(file, 'utf8');

  // isProthesisCancelPending
  if (!content.includes('isProthesisCancelPending')) {
    content = content.replace(
      'const isProthesisCancelled = (p) => String(p?.status || "").toUpperCase() === "CANCELLED";',
      'const isProthesisCancelled = (p) => String(p?.status || "").toUpperCase() === "CANCELLED";\nconst isProthesisCancelPending = (p) => p?.cancelRequestDecision === "PENDING";'
    );
  }

  // update status chip
  content = content.replace(
    '<span className={`status-chip ${String(currentStatus || "").toLowerCase()}`}>\n          {prothesisStatusLabels[currentStatus] || currentStatus}\n        </span>',
    '<span className={`status-chip ${isProthesisCancelPending(p) ? "cancelled" : String(currentStatus || "").toLowerCase()}`}>\n          {isProthesisCancelPending(p) ? "Annulation en attente" : (prothesisStatusLabels[currentStatus] || currentStatus)}\n        </span>'
  );

  // update actions
  const oldActions = `      <td className="actions-cell">
        {cancelled ? (
          "—"
        ) : (`;
  
  const oldActionsDash = oldActions.replace('—', '—'); // just in case
  const oldActionsDash2 = `      <td className="actions-cell">\r
        {cancelled ? (\r
          "—"\r
        ) : (`

  const newActions = `      <td className="actions-cell">
        {cancelled ? (
          <span className="context-badge cancelled">Annulé</span>
        ) : isProthesisCancelPending(p) ? (
          <span className="context-badge cancelled" title="Annulation en attente, confirmation du laboratoire requise">En attente</span>
        ) : (`;
        
  // Handle CRLF or LF
  content = content.replace(/{\s*\/\*\s*Actions\s*\*\/\s*}\s*<td className="actions-cell">\s*{cancelled \? \(\s*["']—["']\s*\)\s*:\s*\(/, 
   `{/* Actions */}\n      <td className="actions-cell">\n        {cancelled ? (\n          <span className="context-badge cancelled">Annulé</span>\n        ) : isProthesisCancelPending(p) ? (\n          <span className="context-badge cancelled" title="Annulation en attente, confirmation du laboratoire requise">En attente</span>\n        ) : (`
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Patient.jsx updated');
}

function updateProsthetics() {
  const file = 'c:/Users/DELL/Desktop/cabinetplus/frontend/src/pages/Prosthetics.jsx';
  let content = fs.readFileSync(file, 'utf8');

  // update status chip
  content = content.replace(/<span className={`status-chip \${p\.status\?\.toLowerCase\(\)}`} style={{ cursor: "default" }}>\s*{busyStatusId === p\.id\s*\?\s*"Mise a jour\.\.\."\s*:\s*prothesisStatusLabels\[p\.status\] \|\| p\.status \|\| "-"}\s*<\/span>/m,
    `<span className={\`status-chip \${p.cancelRequestDecision === "PENDING" ? "cancelled" : (p.status?.toLowerCase() || "")}\`} style={{ cursor: "default" }}>
                    {busyStatusId === p.id
                      ? "Mise a jour..."
                      : p.cancelRequestDecision === "PENDING"
                        ? "Annulation en attente"
                        : prothesisStatusLabels[p.status] || p.status || "-"}
                  </span>`
  );

  // update actions
  content = content.replace(/<td className="actions-cell">\s*{\(\(\) => {/m,
    `<td className="actions-cell">
                  {p.status === "CANCELLED" || p.cancelRequestDecision === "PENDING" ? (
                    <span className="context-badge cancelled">
                      {p.cancelRequestDecision === "PENDING" ? "En attente" : "Annulé"}
                    </span>
                  ) : (
                    <>
                      {(() => {`
  );

  // Close the fragment at the end of the actions cell
  // Wait, replacing the end cleanly requires knowing where the cancel button ends.
  content = content.replace(/<button\s*className="action-btn cancel"\s*onClick={\(\) => {\s*handleCancelClick\(p\);\s*}}\s*title="Annuler"\s*aria-label="Annuler"\s*>\s*<X size={16} \/>\s*<\/button>\s*<\/td>/m,
    `<button
                    className="action-btn cancel"
                    onClick={() => {
                      handleCancelClick(p);
                    }}
                    title="Annuler"
                    aria-label="Annuler"
                  >
                    <X size={16} />
                  </button>
                    </>
                  )}
                </td>`
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Prosthetics.jsx updated');
}

try {
  updatePatient();
  updateProsthetics();
} catch (e) {
  console.error(e);
}
