import { useEffect, useState } from "react";
import jsPDF from "jspdf";
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
  import { loginGoogle } from "./firebase";
import { db, auth } from "./firebase";

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
  toast: {
  position: "fixed",
  bottom: 30,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#0a2540",
  color: "white",
  padding: "12px 18px",
  borderRadius: 999,
  fontWeight: 600,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  zIndex: 999999,
  pointerEvents: "none",
  animation: "fadeIn 0.2s ease",
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
const [toast, setToast] = useState(null);
  const showToast = (message) => {
  setToast(message);

  setTimeout(() => {
    setToast(null);
  }, 2500);
};
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
  if (!user?.uid) return;

  await addDoc(collection(db, "emisores"), {
    uid: user.uid,
    nombre: emisorForm.nombre,
    nif: emisorForm.nif,
    direccion: emisorForm.direccion,
    email: emisorForm.email,
    telefono: emisorForm.telefono,
  });

  loadAll(user.uid);
  showToast("✅ Emisor guardado correctamente");
};

const saveCliente = async () => {
  if (!user?.uid) return;

  try {
    console.log("1 - intentando guardar");

    await addDoc(collection(db, "clientes"), {
      uid: user.uid,
      nombre: clienteForm.nombre,
      nif: clienteForm.nif,
      direccion: clienteForm.direccion,
      email: clienteForm.email,
      telefono: clienteForm.telefono,
    });

    console.log("2 - guardado OK");

    await loadAll(user.uid);

    setToast("✅ Cliente guardado correctamente");

    setTimeout(() => setToast(null), 2500);

  } catch (error) {
    console.error("🔥 ERROR COMPLETO:", error);
    showToast("❌ Error al guardar cliente");
  }
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
    showToast("📄 Factura creada correctamente");
  };

  const generarPDF = (f) => {
  const doc = new jsPDF();

  const emisor = emisores.find(e => e.id === f.emisorId);
  const cliente = clientes.find(c => c.id === f.clienteId);

  const primary = [121, 31, 143];
  const dark = [20, 20, 20];
  const gray = [120, 120, 120];
  const lightGray = [245, 245, 247];

  /* ================= HEADER ================= */
  doc.setFillColor(...primary);
  doc.rect(0, 0, 210, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("FACTURA", 15, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${f.numero}`, 160, 18);
  doc.text(`Fecha: ${new Date(f.fecha).toLocaleDateString()}`, 160, 26);

  /* ================= BLOQUES SUPERIORES ================= */
  doc.setTextColor(...dark);

  // CLIENTE CARD
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, 55, 85, 40, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CLIENTE", 20, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(cliente?.nombre || "", 20, 73);
  doc.text(cliente?.nif || "", 20, 79);
  doc.text(cliente?.email || "", 20, 85);

  // EMISOR CARD
  doc.setFillColor(...lightGray);
  doc.roundedRect(110, 55, 85, 40, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EMISOR", 115, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(emisor?.nombre || "", 115, 73);
  doc.text(emisor?.nif || "", 115, 79);
  doc.text(emisor?.email || "", 115, 85);

  /* ================= TABLA HEADER ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  doc.text("Concepto", 15, 115);
  doc.text("Base", 130, 115);
  doc.text("IVA", 155, 115);
  doc.text("Total", 180, 115);

  doc.setDrawColor(220);
  doc.line(15, 118, 195, 118);

  /* ================= FILA ================= */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text(f.concepto || "-", 15, 130);
  doc.text(`${f.base.toFixed(2)} €`, 130, 130);
  doc.text(`${f.iva.toFixed(2)} €`, 155, 130);
  doc.text(`${f.total.toFixed(2)} €`, 180, 130);

  /* ================= TOTAL BOX (DESTACADO) ================= */
  doc.setFillColor(20, 20, 20);
  doc.roundedRect(120, 150, 75, 50, 5, 5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text(`Base: ${f.base.toFixed(2)} €`, 125, 165);
  doc.text(`IVA: ${f.iva.toFixed(2)} €`, 125, 173);
  doc.text(`IRPF: -${f.irpf.toFixed(2)} €`, 125, 181);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`TOTAL: ${f.total.toFixed(2)} €`, 125, 193);

  /* ================= FOOTER ================= */
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.text("Gracias por su confianza", 105, 285, { align: "center" });

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
    <button
  style={styles.button}
  onClick={() => {
    setSeccion("admin");
    loadAllFacturas();
  }}
>
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

    {toast && (
  <div style={styles.toast}>
    {toast}
  </div>
)}
    </div>
  );
}
