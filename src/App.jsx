import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default function App() {
  /* ================= PRUEBA ================= */
  
  /* ================= MOVIL ================= */
  const [isMobile, setIsMobile] = useState(false);
const menuStyle = {
  ...styles.menu,
  fontSize: isMobile ? 11 : 16,
  padding: isMobile ? "6px 8px" : 10,
  flex: 1,              // 👈 clave para repartir espacio
  margin: "0 3px",
  textAlign: "center"
};
  const appStyle = {
  ...styles.app,
  flexDirection: isMobile ? "column" : "row"
};
const sidebarStyle = isMobile
  ? {
      ...styles.sidebar,
      width: "100%",
      boxSizing: "border-box"
    }
  : styles.sidebar;
};
  const mainStyle = {
  ...styles.main,
  padding: isMobile ? 10 : 30,
  width: "100%"
};
const titleStyle = {
  ...styles.sidebarTitle,
  fontSize: isMobile ? 14 : 30,
  marginRight: isMobile ? 10 : 0,
  flexShrink: 0
};
useEffect(() => {
  const check = () => {
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  };

  check();
  window.addEventListener("resize", check);

  return () => window.removeEventListener("resize", check);
}, []);
  /* ================= AUTH ================= */
  const [user, setUser] = useState(null);

  /* ================= NAV ================= */
  const [seccion, setSeccion] = useState("facturas");

  /* ================= EMISOR ================= */
  const [emisores, setEmisores] = useState([]);
  const [emisorForm, setEmisorForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  /* ================= CLIENTES ================= */
  const [clientes, setClientes] = useState([]);
  const [clienteForm, setClienteForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  /* ================= FACTURAS ================= */
  const [facturas, setFacturas] = useState([]);

  const [emisorSel, setEmisorSel] = useState(null);
  const [clienteSel, setClienteSel] = useState(null);

  const [concepto, setConcepto] = useState("");
  const [base, setBase] = useState(0);

  const IVA = 0.21;
  const IRPF = 0.07;

  const iva = base * IVA;
  const irpf = base * IRPF;
  const total = base + iva - irpf;

  /* ================= LOAD ================= */
  const loadEmisores = async (uid) => {
    const q = query(collection(db, "emisores"), where("uid", "==", uid));
    const snap = await getDocs(q);
    setEmisores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadClientes = async (uid) => {
    const q = query(collection(db, "clientes"), where("uid", "==", uid));
    const snap = await getDocs(q);
    setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadFacturas = async (uid) => {
    const q = query(collection(db, "facturas"), where("uid", "==", uid));
    const snap = await getDocs(q);
    setFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  /* ================= NUMERO FACTURA ================= */
const generarNumero = () => {
  const year = new Date().getFullYear();
  const next = facturas.length + 1;
  return `${year}-${String(next).padStart(4, "0")}`;
};

  /* ================= PDF ================= */
  const generarPDF = (f) => {
  const doc = new jsPDF();

  const emisor = emisores.find(e => e.id === f.emisorId);
  const cliente = clientes.find(c => c.id === f.clienteId);

  /* ================= TITULO ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FACTURA", 105, 20, { align: "center" });

  /* ================= LINEA SEPARADORA ================= */
  doc.setLineWidth(0.5);
  doc.line(10, 25, 200, 25);

  /* ================= EMISOR ================= */
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("EMISOR", 15, 35);

  doc.setFont("helvetica", "normal");
  doc.text(emisor?.nombre || "", 15, 42);
  doc.text(emisor?.nif || "", 15, 48);
  doc.text(emisor?.direccion || "", 15, 54);
  doc.text(emisor?.email || "", 15, 60);
  doc.text(emisor?.telefono || "", 15, 66);

  /* ================= CLIENTE ================= */
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", 120, 35);

  doc.setFont("helvetica", "normal");
  doc.text(cliente?.nombre || "", 120, 42);
  doc.text(cliente?.nif || "", 120, 48);
  doc.text(cliente?.direccion || "", 120, 54);
  doc.text(cliente?.email || "", 120, 60);
  doc.text(cliente?.telefono || "", 120, 66);

  /* ================= INFO FACTURA ================= */
  doc.setFont("helvetica", "bold");
  doc.text(`Factura Nº: ${f.numero}`, 15, 80);
  doc.text(`Fecha: ${new Date(f.fecha).toLocaleDateString()}`, 120, 80);

  /* ================= TABLA SIMPLE ================= */
  doc.setLineWidth(0.2);
  doc.line(10, 85, 200, 85);

  doc.setFont("helvetica", "bold");
  doc.text("Concepto", 15, 95);
  doc.text("Base", 120, 95);
  doc.text("IVA", 150, 95);
  doc.text("Total", 175, 95);

  doc.setFont("helvetica", "normal");
  doc.text(f.concepto, 15, 105);
  doc.text(`${f.base.toFixed(2)} €`, 120, 105);
  doc.text(`${f.iva.toFixed(2)} €`, 150, 105);
  doc.text(`${f.total.toFixed(2)} €`, 175, 105);

  /* ================= TOTAL GRANDE ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`TOTAL: ${f.total.toFixed(2)} €`, 150, 140);

  doc.save(`factura-${f.numero}.pdf`);
};

  /* ================= FACTURA ================= */
  const crearFactura = async () => {
    console.log("👉 CLICK FACTURA");

    if (!user?.uid || !emisorSel?.id || !clienteSel?.id) {
      console.log("❌ falta algo");
      return;
    }

    const data = {
      uid: user.uid,
      numero: generarNumero(),
      emisorId: emisorSel.id,
      clienteId: clienteSel.id,
      concepto,
      base,
      iva,
      irpf,
      total,
      fecha: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "facturas"), data);

    console.log("FACTURA CREADA", docRef.id);

    loadFacturas(user.uid);
  };

  /* ================= AUTH ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (u?.uid) {
        loadEmisores(u.uid);
        loadClientes(u.uid);
        loadFacturas(u.uid);
      }
    });

    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  /* ================= SAVE EMISOR ================= */
  const saveEmisor = async () => {
    await addDoc(collection(db, "emisores"), {
      uid: user.uid,
      ...emisorForm
    });

    setEmisorForm({
      nombre: "",
      nif: "",
      direccion: "",
      email: "",
      telefono: "",
    });

    loadEmisores(user.uid);
  };

  /* ================= SAVE CLIENTE ================= */
  const saveCliente = async () => {
    await addDoc(collection(db, "clientes"), {
      uid: user.uid,
      ...clienteForm
    });

    setClienteForm({
      nombre: "",
      nif: "",
      direccion: "",
      email: "",
      telefono: "",
    });

    loadClientes(user.uid);
  };

  /* ================= UI LOGIN ================= */
  if (!user) {
    return (
      <div style={styles.login}>
        <button style={styles.button} onClick={login}>
          Login con Google
        </button>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div style={appStyle}>

      {/* SIDEBAR */}

<div style={sidebarStyle}>
  <h2 style={titleStyle}>FactuControl</h2>

       <button onClick={() => setSeccion("emisor")} style={menuStyle}>Emisor</button>
<button onClick={() => setSeccion("clientes")} style={menuStyle}>Clientes</button>
<button onClick={() => setSeccion("facturas")} style={menuStyle}>Facturas</button>
<button onClick={logout} style={{ ...menuStyle, background: "red" }}>Logout</button>
      </div>

      {/* MAIN */}
      <div style={mainStyle}>
{seccion === "emisor" && (
  <div style={styles.card}>
    <h3>Emisor</h3>

    <input
      style={styles.input}
      placeholder="Nombre"
      value={emisorForm.nombre}
      onChange={e => setEmisorForm({ ...emisorForm, nombre: e.target.value })}
    />

    <input
      style={styles.input}
      placeholder="NIF"
      value={emisorForm.nif}
      onChange={e => setEmisorForm({ ...emisorForm, nif: e.target.value })}
    />

    <input
      style={styles.input}
      placeholder="Dirección"
      value={emisorForm.direccion}
      onChange={e => setEmisorForm({ ...emisorForm, direccion: e.target.value })}
    />

    <input
      style={styles.input}
      placeholder="Email"
      value={emisorForm.email}
      onChange={e => setEmisorForm({ ...emisorForm, email: e.target.value })}
    />

    <input
      style={styles.input}
      placeholder="Teléfono"
      value={emisorForm.telefono}
      onChange={e => setEmisorForm({ ...emisorForm, telefono: e.target.value })}
    />

    <button style={styles.button} onClick={saveEmisor}>
      Guardar emisor
    </button>
  </div>
)}
        {seccion === "clientes" && (
  <div style={styles.card}>
    <h3>Clientes</h3>

    <input
      style={styles.input}
      placeholder="Nombre"
      value={clienteForm.nombre}
      onChange={e => setClienteForm({ ...clienteForm, nombre: e.target.value })}
    />

    <input
      style={styles.input}
      placeholder="NIF"
      value={clienteForm.nif}
      onChange={e => setClienteForm({ ...clienteForm, nif: e.target.value })}
    />

    <input
      style={styles.input}
      placeholder="Dirección"
      value={clienteForm.direccion}
      onChange={e => setClienteForm({ ...clienteForm, direccion: e.target.value })}
    />

    <input
      style={styles.input}
      placeholder="Email"
      value={clienteForm.email}
      onChange={e => setClienteForm({ ...clienteForm, email: e.target.value })}
    />

    <input
      style={styles.input}
      placeholder="Teléfono"
      value={clienteForm.telefono}
      onChange={e => setClienteForm({ ...clienteForm, telefono: e.target.value })}
    />

    <button style={styles.button} onClick={saveCliente}>
      Guardar cliente
    </button>
  </div>
)}
        {/* FACTURAS */}
        {seccion === "facturas" && (
          <div style={styles.card}>

            <h3>Crear factura</h3>

            <select value={emisorSel?.id || ""} onChange={e => setEmisorSel(emisores.find(x => x.id === e.target.value))}>
              <option>Emisor</option>
              {emisores.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>

            <select value={clienteSel?.id || ""} onChange={e => setClienteSel(clientes.find(x => x.id === e.target.value))}>
              <option>Cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <input placeholder="Concepto" value={concepto} onChange={e => setConcepto(e.target.value)} />
            <input type="number" value={base} onChange={e => setBase(Number(e.target.value))} />

            <p>Total: {total.toFixed(2)} €</p>

            <button onClick={crearFactura}>Crear factura</button>

            <h3>Facturas</h3>

            {facturas.map(f => (
              <div key={f.id}>
                <p>{f.numero}</p>

                <p>
                  {emisores.find(e => e.id === f.emisorId)?.nombre} →
                  {clientes.find(c => c.id === f.clienteId)?.nombre}
                </p>

                <button onClick={() => generarPDF(f)}>PDF</button>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}

/* ================= ESTILOS (NO TOCADOS) ================= */ 
const styles = { app:
{ display: "flex", minHeight: "100vh", fontFamily: "Arial", background: "#834fcd", color: "#fff", flexDirection: "row" },
 sidebar: { overflow: "hidden", width: "100%", maxWidth: 200, background: "#791f8f", padding: 20, display: "flex", flexDirection: "column", gap: 10 }, 
 main: { flex: 1, padding: 20, width: "100%" }, 
 body: { margin: 0, padding: 0},
 card: { background: "#e2a9f1", color: "#000", padding: 20, borderRadius: 14 }, 
 input: { width: "85%", padding: 10, margin: "6px 0", borderRadius: 8 }, 
 button: { padding: 10, background: "#3b82f6", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }, 
 menu: { padding: 10, background: "#e482da", border: 0, borderRadius: 8, fontWeight: "bold" }, 
 row: {display: "flex", alignItems: "center", justifyContent: "flex-start", padding: 8, gap: 12 }, 
 sidebarTitle: { color: 'white', fontSize: '30px', fontWeight: 'bold' }, 
 login: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }, 
};
