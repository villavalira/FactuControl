import { useEffect, useState } from "react";
import jsPDF from "jspdf";

import { auth, db, loginGoogle } from "./firebase";

import {
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/* ================= STYLES ================= */
const styles = {
  app: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, sans-serif",
    background: "#f6f8fb",
    color: "#0a2540",
  },

  topBar: {
    width: "100%",
    background: "white",
    borderBottom: "1px solid #e6e8ec",
    padding: "6px 0",
    display: "flex",
    justifyContent: "center",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },

  topBarInner: {
    width: "100%",
    maxWidth: 1100,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 10px",
  },

  menu: {
    display: "flex",
    gap: 10,
  },

  button: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #e6e8ec",
    background: "#e482da",
    cursor: "pointer",
    fontWeight: 600,
  },
  loginButton: {
  padding: "16px 34px",
  borderRadius: 999,
  border: "none",
  background: "#791f8f",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 20,
  boxShadow: "0 6px 18px rgba(121,31,143,0.25)",
},

  danger: {
    background: "red",
    color: "white",
  },

  container: {
    width: "100%",
    maxWidth: 1100,
    margin: "0 auto",
    padding: 20,
  },

  card: {
    background: "#e2a9f1",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    color: "#000",
  },
  input: {
  width: "100%",
  padding: "6px 8px",
  marginTop: 6,
  fontSize: 13,
  borderRadius: 6,
  border: "1px solid #ccc",
}, 
};

export default function App() {
  /* ================= STATE ================= */
  const [user, setUser] = useState(null);
  const [seccion, setSeccion] = useState("facturas");

  const [emisores, setEmisores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);

  const [emisorSel, setEmisorSel] = useState(null);
  const [clienteSel, setClienteSel] = useState(null);

  const ADMIN_EMAIL = "andrea.garcia192@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [allFacturas, setAllFacturas] = useState([]);
  const loadAllFacturas = async () => {
  const snap = await getDocs(collection(db, "facturas"));
  setAllFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};
  const [emisorForm, setEmisorForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  const [clienteForm, setClienteForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  const [concepto, setConcepto] = useState("");
  const [base, setBase] = useState(0);

  const IVA = 0.21;
  const IRPF = 0.07;

  const iva = base * IVA;
  const irpf = base * IRPF;
  const total = base + iva - irpf;

  /* ================= AUTH ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.uid) loadAll(u.uid);
    });
    return () => unsub();
  }, []);
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    setUser(u);
    if (u?.uid) loadAll(u.uid);
  });
  return () => unsub();
}, []);
  import { loginGoogle } from "./firebase";

const login = () => loginGoogle();
  const logout = () => signOut(auth);

  /* ================= LOAD ================= */
  const loadAll = async (uid) => {
    const e = await getDocs(query(collection(db, "emisores"), where("uid", "==", uid)));
    const c = await getDocs(query(collection(db, "clientes"), where("uid", "==", uid)));
    const f = await getDocs(query(collection(db, "facturas"), where("uid", "==", uid)));

    setEmisores(e.docs.map(d => ({ id: d.id, ...d.data() })));
    setClientes(c.docs.map(d => ({ id: d.id, ...d.data() })));
    setFacturas(f.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  /* ================= SAVE ================= */
  const saveEmisor = async () => {
    await addDoc(collection(db, "emisores"), { uid: user.uid, ...emisorForm });
    loadAll(user.uid);
  };

  const saveCliente = async () => {
    await addDoc(collection(db, "clientes"), { uid: user.uid, ...clienteForm });
    loadAll(user.uid);
  };

  const crearFactura = async () => {
    if (!emisorSel || !clienteSel) return;

    await addDoc(collection(db, "facturas"), {
      uid: user.uid,
      emisorId: emisorSel.id,
      clienteId: clienteSel.id,
      concepto,
      base,
      iva,
      irpf,
      total,
      numero: `${new Date().getFullYear()}-${facturas.length + 1}`,
      fecha: new Date().toISOString(),
    });

    loadAll(user.uid);
  };

  const generarPDF = (f) => {
  const doc = new jsPDF();

  const emisor = emisores.find(e => e.id === f.emisorId);
  const cliente = clientes.find(c => c.id === f.clienteId);

  /* ================= HEADER ================= */
  doc.setFillColor(121, 31, 143); // morado
  doc.rect(0, 0, 210, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FACTURA", 15, 18);

  doc.setFontSize(10);
  doc.text(`Nº: ${f.numero}`, 150, 15);
  doc.text(new Date(f.fecha).toLocaleDateString(), 150, 22);

  doc.setTextColor(0, 0, 0);

  /* ================= CLIENTE (IZQUIERDA) ================= */
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", 15, 45);

  doc.setFont("helvetica", "normal");
  doc.text(cliente?.nombre || "", 15, 52);
  doc.text(cliente?.nif || "", 15, 58);
  doc.text(cliente?.direccion || "", 15, 64);
  doc.text(cliente?.email || "", 15, 70);
  doc.text(cliente?.telefono || "", 15, 76);

  /* ================= EMISOR (DERECHA) ================= */
  doc.setFont("helvetica", "bold");
  doc.text("EMISOR", 120, 45);

  doc.setFont("helvetica", "normal");
  doc.text(emisor?.nombre || "", 120, 52);
  doc.text(emisor?.nif || "", 120, 58);
  doc.text(emisor?.direccion || "", 120, 64);
  doc.text(emisor?.email || "", 120, 70);
  doc.text(emisor?.telefono || "", 120, 76);

  /* ================= LINEA ================= */
  doc.setDrawColor(200);
  doc.line(15, 85, 195, 85);

  /* ================= TABLA ================= */
  doc.setFont("helvetica", "bold");
  doc.text("Concepto", 15, 95);
  doc.text("Base", 120, 95);
  doc.text("IVA", 145, 95);
  doc.text("Total", 170, 95);

  doc.setFont("helvetica", "normal");
  doc.text(f.concepto || "-", 15, 105);
  doc.text(`${f.base.toFixed(2)} €`, 120, 105);
  doc.text(`${f.iva.toFixed(2)} €`, 145, 105);
  doc.text(`${f.total.toFixed(2)} €`, 170, 105);

  /* ================= TOTALES ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);

  doc.text(`Base: ${f.base.toFixed(2)} €`, 140, 130);
  doc.text(`IVA (21%): ${f.iva.toFixed(2)} €`, 140, 138);
  doc.text(`IRPF (7%): -${f.irpf.toFixed(2)} €`, 140, 146);

  doc.setFontSize(14);
  doc.text(`TOTAL: ${f.total.toFixed(2)} €`, 140, 160);

  /* ================= FOOTER ================= */
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Gracias por su confianza", 105, 280, { align: "center" });

  doc.save(`factura-${f.numero}.pdf`);
};

  if (!user) {
    return (
      <div style={styles.container}>
        <button style={styles.loginButton} onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div style={styles.app}>

   {/* TOP BAR */}
<div style={styles.topBar}>
  <div style={styles.topBarInner}>

    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/logo192.png" style={{ width: 32, height: 32 }} />
      <h3 style={{ margin: 0 }}>FactuControl</h3>
    </div>

    <div style={styles.menu}>
      <button style={styles.button} onClick={() => setSeccion("emisor")}>
        Emisor
      </button>

  <button style={styles.button} onClick={() => setSeccion("clientes")}>
    Clientes
  </button>

  <button style={styles.button} onClick={() => setSeccion("facturas")}>
    Facturas
  </button>

  {isAdmin && (
    <button style={styles.button} onClick={() => setSeccion("admin")}>
      Admin
    </button>
  )}

  <button style={{ ...styles.button, ...styles.danger }} onClick={logout}>
    Logout
  </button>
</div>
        </div>
      </div>

      <div style={styles.container}>
         {/* ADMIN */}
{seccion === "admin" && isAdmin && (
  <div style={styles.card}>
    <h3>🔥 Panel Admin - Todas las facturas</h3>

    {allFacturas.map(f => (
      <div key={f.id} style={{ marginBottom: 10 }}>
        <p>
          <b>Nº:</b> {f.numero} | <b>Total:</b> {f.total} €
        </p>

        <p style={{ fontSize: 12, opacity: 0.6 }}>
          UID: {f.uid}
        </p>

        <button onClick={() => generarPDF(f)}>
          PDF
        </button>
      </div>
    ))}
  </div>
)}
        {/* EMISOR */}
        {seccion === "emisor" && (
          <div style={styles.card}>
            <h3>Emisor</h3>
            <input placeholder="Nombre" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,nombre:e.target.value})}/>
            <input placeholder="NIF" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,nif:e.target.value})}/>
            <input placeholder="Dirección" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,direccion:e.target.value})}/>
            <input placeholder="Email" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,email:e.target.value})}/>
            <input placeholder="Teléfono" style={styles.input} onChange={e=>setEmisorForm({...emisorForm,telefono:e.target.value})}/>
            <button style={styles.button} onClick={saveEmisor}>Guardar</button>
          </div>
        )}

        {/* CLIENTES */}
        {seccion === "clientes" && (
          <div style={styles.card}>
            <h3>Clientes</h3>
            <input placeholder="Nombre" style={styles.input} onChange={e=>setClienteForm({...clienteForm,nombre:e.target.value})}/>
            <input placeholder="NIF" style={styles.input} onChange={e=>setClienteForm({...clienteForm,nif:e.target.value})}/>
            <input placeholder="Dirección" style={styles.input} onChange={e=>setClienteForm({...clienteForm,direccion:e.target.value})}/>
            <input placeholder="Email" style={styles.input} onChange={e=>setClienteForm({...clienteForm,email:e.target.value})}/>
            <input placeholder="Teléfono" style={styles.input} onChange={e=>setClienteForm({...clienteForm,telefono:e.target.value})}/>
            <button style={styles.button} onClick={saveCliente}>Guardar</button>
          </div>
        )}

        {/* FACTURAS */}
        {seccion === "facturas" && (
          <div style={styles.card}>
            <h3>Facturas</h3>

            <select onChange={e=>setEmisorSel(emisores.find(x=>x.id===e.target.value))}>
              <option>Emisor</option>
              {emisores.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>

            <select onChange={e=>setClienteSel(clientes.find(x=>x.id===e.target.value))}>
              <option>Cliente</option>
              {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <input placeholder="Concepto" style={styles.input} onChange={e=>setConcepto(e.target.value)}/>
            <input type="number" style={styles.input} placeholder="Importe (€)" onChange={e => setBase(Number(e.target.value))}/>

            <p>Total: {total.toFixed(2)} €</p>

            <button style={styles.button} onClick={crearFactura}>Crear factura</button>

            {facturas.map(f=> (
              <div key={f.id} style={{ marginTop: 10 }}>
                <p>{f.concepto} - {f.total} €</p>
                <button style={styles.button} onClick={() => generarPDF(f)}>PDF</button>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}
