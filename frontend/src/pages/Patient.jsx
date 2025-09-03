import React, { useMemo, useState } from "react";
import {
  Plus, Receipt, Search, Pill, Activity, CreditCard, Calendar,
  Eye, Edit2, Trash2, Phone, Mail, MapPin
} from "lucide-react";
import "./Patient.css"; // append the CSS additions below to your existing CSS

const initialPatient = {
  id: 101,
  firstname: "John",
  lastname: "Doe",
  age: 35,
  sex: "Male",
  phone: "+213 555 12 34 56",
  email: "john.doe@example.com",
  address: "12 Rue Didouche Mourad, Algiers",
};

const formatDate = (d) =>
  typeof d === "string" ? d : new Date(d).toLocaleDateString();

const currency = (v) => new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD" }).format(Number(v || 0));

export default function Patient() {
  const [patient] = useState(initialPatient);

  // DATA (mock)
  const [treatments, setTreatments] = useState([
    { id: 1, name: "Dental Cleaning", date: "2025-08-20", price: 4500, notes: "Routine" },
    { id: 2, name: "Filling – Molar", date: "2025-08-28", price: 9000, notes: "Composite" },
  ]);
  const [prescriptions, setPrescriptions] = useState([
    { id: 11, date: "2025-08-28", notes: "Ibuprofen 200mg, after meals" },
  ]);
  const [invoices, setInvoices] = useState([
    { id: 21, invoiceNumber: "INV-2025-001", date: "2025-08-28", status: "SENT", totalAmount: 13500 },
  ]);
  const [payments, setPayments] = useState([
    { id: 31, amount: 5000, date: "2025-08-29", method: "CASH" },
  ]);
  const [appointments, setAppointments] = useState([
    { id: 41, dateTimeStart: "2025-09-05T10:00", dateTimeEnd: "2025-09-05T10:30", status: "SCHEDULED" },
  ]);

  // SUMMARY
  const totalBilled = useMemo(
    () => invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0), [invoices]
  );
  const totalPaid = useMemo(
    () => payments.reduce((s, p) => s + Number(p.amount || 0), 0), [payments]
  );
  // const outstanding = Math.max(0, totalBilled - totalPaid);

  // NAV
  const [tab, setTab] = useState("overview");

  // SEARCH per tab
  const [query, setQuery] = useState("");

  // MODAL
  const [modal, setModal] = useState({ open: false, type: null, editId: null, payload: {} });

  const openAdd = (type) => setModal({ open: true, type, editId: null, payload: {} });
  const openEdit = (type, item) => setModal({ open: true, type, editId: item.id, payload: { ...item } });
  const closeModal = () => setModal({ open: false, type: null, editId: null, payload: {} });

  // SAVE handlers
  const upsert = (type, data) => {
    const withId = modal.editId ? { ...data, id: modal.editId } : { ...data, id: Date.now() };
    const op = (list, setList, key = "id") => {
      if (modal.editId) {
        setList(list.map((x) => (x[key] === modal.editId ? withId : x)));
      } else {
        setList([withId, ...list]);
      }
    };
    switch (type) {
      case "treatment": op(treatments, setTreatments); break;
      case "prescription": op(prescriptions, setPrescriptions); break;
      case "invoice": op(invoices, setInvoices); break;
      case "payment": op(payments, setPayments); break;
      case "appointment": op(appointments, setAppointments); break;
      default: break;
    }
    closeModal();
  };

  const remove = (type, id) => {
    const del = (list, setList, key = "id") => setList(list.filter((x) => x[key] !== id));
    switch (type) {
      case "treatment": del(treatments, setTreatments); break;
      case "prescription": del(prescriptions, setPrescriptions); break;
      case "invoice": del(invoices, setInvoices); break;
      case "payment": del(payments, setPayments); break;
      case "appointment": del(appointments, setAppointments); break;
      default: break;
    }
  };

  // FILTERS
  const filterRows = (rows, keys) => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      keys.some((k) => String(r[k] ?? "").toLowerCase().includes(q))
    );
  };

  // TIMELINE (Overview)
  const timeline = useMemo(() => {
    const items = [
      ...treatments.map(t => ({ type: "treatment", date: t.date, icon: <Activity size={16}/>, title: t.name, meta: currency(t.price) })),
      ...prescriptions.map(p => ({ type: "prescription", date: p.date, icon: <Pill size={16}/>, title: "Prescription", meta: p.notes })),
      ...payments.map(p => ({ type: "payment", date: p.date, icon: <CreditCard size={16}/>, title: "Payment", meta: `${p.method} • ${currency(p.amount)}` })),
      ...appointments.map(a => ({ type: "appointment", date: a.dateTimeStart?.slice(0,10), icon: <Calendar size={16}/>, title: "Appointment", meta: `${a.status} • ${a.dateTimeStart?.slice(11,16)}–${a.dateTimeEnd?.slice(11,16)}` })),
    ];
    return items.sort((a,b) => (a.date > b.date ? -1 : 1));
  }, [treatments, prescriptions, invoices, payments, appointments]);

return (
  <div className="patients-container">
    {/* HEADER */}
    <div className="page-header patient-hero">
      <div className="hero-id">
       
        <div>
          <div className="page-title">
            {patient.firstname} {patient.lastname}
          </div>
          <div className="page-subtitle">
            {patient.age} ans • {patient.sex}
          </div>
          <div className="page-subtitle flex-info">
            <Phone size={14}/> {patient.phone}
          </div>
          <div className="page-subtitle flex-info">
            <Mail size={14}/> {patient.email}
          </div>
          <div className="page-subtitle flex-info">
            <MapPin size={14}/> {patient.address}
          </div>
        </div>
      </div>
      <div className="hero-actions">
      <div className="chips">
  <span className="chip info">
    <Receipt size={14}/> Facture: {currency(totalBilled)}
  </span>
  <span className="chip success">
    <CreditCard size={14}/> Payé: {currency(totalPaid)}
  </span>
</div>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => openAdd("payment")}>
            <Plus size={16}/> Ajouter paiement
          </button>
        </div>
      </div>
    </div>

    {/* SUB NAV */}
    <div className="subnav">
      {["overview","treatments","prescriptions","billing","appointments"].map(key => (
        <button
          key={key}
          className={`subnav-tab ${tab === key ? "active" : ""}`}
          onClick={() => { setTab(key); setQuery(""); }}
        >
          {key === "overview" && "Overview"}
          {key === "treatments" && "Treatments"}
          {key === "prescriptions" && "Prescriptions"}
          {key === "billing" && "Billing"}
          {key === "appointments" && "Appointments"}
        </button>
      ))}
    </div>

      {/* CONTENT */}
      <div className="content-area">
        {tab === "overview" && (
          <div className="overview">
            {timeline.length === 0 ? (
              <p className="empty">No activity yet.</p>
            ) : (
              <ul className="timeline">
                {timeline.map((it, idx) => (
                  <li key={idx} className={`timeline-item ${it.type}`}>
                    <div className="tl-icon">{it.icon}</div>
                    <div className="tl-content">
                      <div className="tl-title">{it.title}</div>
                      <div className="tl-meta">{formatDate(it.date)} • {it.meta}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "treatments" && (
          <SectionTable
            title="Treatments"
            columns={["NAME","DATE","PRICE","NOTES","ACTIONS"]}
            rows={filterRows(treatments, ["name","notes","date"])}
            renderRow={(t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{formatDate(t.date)}</td>
                <td>{currency(t.price)}</td>
                <td className="muted">{t.notes || "-"}</td>
                <td className="actions-cell">
                  <button className="action-btn view"><Eye size={16}/></button>
                  <button className="action-btn" onClick={() => openEdit("treatment", t)}><Edit2 size={16}/></button>
                  <button className="action-btn" onClick={() => remove("treatment", t.id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            )}
            onAdd={() => openAdd("treatment")}
            query={query} setQuery={setQuery}
          />
        )}

        {tab === "prescriptions" && (
          <SectionTable
            title="Prescriptions"
            columns={["DATE","NOTES","ACTIONS"]}
            rows={filterRows(prescriptions, ["notes","date"])}
            renderRow={(p) => (
              <tr key={p.id}>
                <td>{formatDate(p.date)}</td>
                <td>{p.notes}</td>
                <td className="actions-cell">
                  <button className="action-btn view"><Eye size={16}/></button>
                  <button className="action-btn" onClick={() => openEdit("prescription", p)}><Edit2 size={16}/></button>
                  <button className="action-btn" onClick={() => remove("prescription", p.id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            )}
            onAdd={() => openAdd("prescription")}
            query={query} setQuery={setQuery}
          />
        )}

        {tab === "billing" && (
          <div >
        
            <SectionTable
            className="billing-grid"
              title="Payments"
              columns={["DATE","METHOD","AMOUNT","ACTIONS"]}
              rows={filterRows(payments, ["method","date","amount"])}
              renderRow={(p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td>{p.method}</td>
                  <td>{currency(p.amount)}</td>
                  <td className="actions-cell">
                    <button className="action-btn view"><Eye size={16}/></button>
                    <button className="action-btn" onClick={() => openEdit("payment", p)}><Edit2 size={16}/></button>
                    <button className="action-btn" onClick={() => remove("payment", p.id)}><Trash2 size={16}/></button>
                  </td>
                </tr>
              )}
              onAdd={() => openAdd("payment")}
              query={query} setQuery={setQuery}
            />
          </div>
        )}

        {tab === "appointments" && (
          <SectionTable
            title="Appointments"
            columns={["DATE","START","END","STATUS","ACTIONS"]}
            rows={filterRows(appointments, ["dateTimeStart","dateTimeEnd","status"])}
            renderRow={(a) => (
              <tr key={a.id}>
                <td>{formatDate(a.dateTimeStart?.slice(0,10))}</td>
                <td>{a.dateTimeStart?.slice(11,16)}</td>
                <td>{a.dateTimeEnd?.slice(11,16)}</td>
                <td><span className={`status-badge ${a.status?.toLowerCase()}`}>{a.status}</span></td>
                <td className="actions-cell">
                  <button className="action-btn view"><Eye size={16}/></button>
                  <button className="action-btn" onClick={() => openEdit("appointment", a)}><Edit2 size={16}/></button>
                  <button className="action-btn" onClick={() => remove("appointment", a.id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            )}
            onAdd={() => openAdd("appointment")}
            query={query} setQuery={setQuery}
          />
        )}
      </div>

      {/* MODAL */}
      {modal.open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <h2>
              {modal.editId ? "Update " : "Add "}
              {labelFor(modal.type)}
            </h2>
            <ModalForm
              type={modal.type}
              defaults={modal.payload}
              onCancel={closeModal}
              onSave={(data) => upsert(modal.type, data)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function labelFor(type) {
  switch (type) {
    case "treatment": return "Treatment";
    case "prescription": return "Prescription";
    case "invoice": return "Invoice";
    case "payment": return "Payment";
    case "appointment": return "Appointment";
    default: return "";
  }
}

/** Reusable section with patients-controls + table layout **/
function SectionTable({ title, rows, columns, renderRow, onAdd, query, setQuery }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <span className="search-icon"><Search size={14}/></span>
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="controls-right">
          <button className="btn-primary" onClick={onAdd}>
            <Plus size={16}/> Add {title}
          </button>
        </div>
      </div>

      <table className="patients-table">
        <thead>
          <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: "center", color: "#9ca3af" }}>No {title.toLowerCase()}.</td></tr>
          ) : rows.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}

/** Modal forms per type (using your .modal-form, .field-label, .styled-select) **/
function ModalForm({ type, defaults = {}, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    // Treatment
    name: defaults.name || "",
    date: defaults.date || new Date().toISOString().slice(0,10),
    price: defaults.price ?? "",
    notes: defaults.notes || "",
    // Prescription
    // date already
    // notes already
    // Invoice
    invoiceNumber: defaults.invoiceNumber || "",
    status: defaults.status || "DRAFT",
    totalAmount: defaults.totalAmount ?? "",
    // Payment
    amount: defaults.amount ?? "",
    method: defaults.method || "CASH",
    // Appointment
    dateTimeStart: defaults.dateTimeStart || new Date().toISOString().slice(0,16),
    dateTimeEnd: defaults.dateTimeEnd || new Date(Date.now()+30*60000).toISOString().slice(0,16),
    aStatus: defaults.status || "SCHEDULED",
  }));

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    switch (type) {
      case "treatment":
        return onSave({ name: form.name, date: form.date, price: Number(form.price||0), notes: form.notes });
      case "prescription":
        return onSave({ date: form.date, notes: form.notes });
      case "invoice":
        return onSave({ invoiceNumber: form.invoiceNumber || autoNumber(), date: form.date, status: form.status, totalAmount: Number(form.totalAmount||0) });
      case "payment":
        return onSave({ amount: Number(form.amount||0), date: form.date, method: form.method });
      case "appointment":
        return onSave({ dateTimeStart: form.dateTimeStart, dateTimeEnd: form.dateTimeEnd, status: form.aStatus });
      default:
        return;
    }
  };

  return (
    <form className="modal-form" onSubmit={save}>
      {type === "treatment" && (
        <>
          <div className="form-field">
            <label className="field-label">Name</label>
            <input name="name" value={form.name} onChange={onChange} required />
          </div>
          <div className="form-field">
            <label className="field-label">Date</label>
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </div>
          <div className="form-field">
            <label className="field-label">Price (DZD)</label>
            <input type="number" name="price" value={form.price} onChange={onChange} min="0" step="100" />
          </div>
          <div className="form-field">
            <label className="field-label">Notes</label>
            <input name="notes" value={form.notes} onChange={onChange} />
          </div>
        </>
      )}

      {type === "prescription" && (
        <>
          <div className="form-field">
            <label className="field-label">Date</label>
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </div>
          <div className="form-field">
            <label className="field-label">Notes</label>
            <input name="notes" value={form.notes} onChange={onChange} required />
          </div>
        </>
      )}

      {type === "invoice" && (
        <>
          <div className="form-field">
            <label className="field-label">Invoice Number</label>
            <input name="invoiceNumber" value={form.invoiceNumber} onChange={onChange} placeholder="INV-2025-002" />
          </div>
          <div className="form-field">
            <label className="field-label">Date</label>
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </div>
          <div className="form-field">
            <label className="field-label">Status</label>
            <div className="select-wrapper">
              <select className="styled-select" name="status" value={form.status} onChange={onChange}>
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="PAID">PAID</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="field-label">Total Amount (DZD)</label>
            <input type="number" name="totalAmount" value={form.totalAmount} onChange={onChange} min="0" step="100" />
          </div>
        </>
      )}

      {type === "payment" && (
        <>
          <div className="form-field">
            <label className="field-label">Amount (DZD)</label>
            <input type="number" name="amount" value={form.amount} onChange={onChange} min="0" step="100" required />
          </div>
          <div className="form-field">
            <label className="field-label">Date</label>
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </div>
          <div className="form-field">
            <label className="field-label">Method</label>
            <div className="select-wrapper">
              <select className="styled-select" name="method" value={form.method} onChange={onChange}>
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
                <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                <option value="CHECK">CHECK</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>
        </>
      )}

      {type === "appointment" && (
        <>
          <div className="form-field">
            <label className="field-label">Start</label>
            <input type="datetime-local" name="dateTimeStart" value={form.dateTimeStart} onChange={onChange} required />
          </div>
          <div className="form-field">
            <label className="field-label">End</label>
            <input type="datetime-local" name="dateTimeEnd" value={form.dateTimeEnd} onChange={onChange} required />
          </div>
          <div className="form-field">
            <label className="field-label">Status</label>
            <div className="select-wrapper">
              <select className="styled-select" name="aStatus" value={form.aStatus} onChange={onChange}>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="modal-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary2">Save</button>
      </div>
    </form>
  );
}

function autoNumber() {
  const n = Math.floor(1000 + Math.random()*9000);
  return `INV-${new Date().getFullYear()}-${n}`;
}
