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

  {/* ================= CLIENTES ================= */} 
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

  /* ================= PDF ================= */
  const generarPDF = (f) => {
    const doc = new jsPDF();

    doc.text(`FACTURA Nº: ${f.numero}`, 10, 10);
    doc.text(`Concepto: ${f.concepto}`, 10, 20);
    doc.text(`Base: ${f.base} €`, 10, 30);
    doc.text(`IVA: ${f.iva.toFixed(2)} €`, 10, 40);
    doc.text(`IRPF: ${f.irpf.toFixed(2)} €`, 10, 50);
    doc.text(`TOTAL: ${f.total.toFixed(2)} €`, 10, 60);

    doc.save(`factura-${f.numero}.pdf`);
  };

  /* ================= FACTURA ================= */
  const crearFactura = async () => {
    console.log("👉 CLICK FACTURA");

    if (!user?.uid || !emisorSel?.id || !clienteSel?.id) {
      console.log("❌ falta algo");
      return;
    }

    try {
      const data = {
        uid: user.uid,
        numero: Date.now(),
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

      console.log("✅ FACTURA CREADA", docRef.id);

      await loadFacturas(user.uid);

      setConcepto("");
      setBase(0);

    } catch (error) {
      console.error("❌ ERROR FACTURA:", error);
    }
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

  /* ================= UI ================= */
  if (!user) {
    return (
      <div style={styles.login}>
        <button style={styles.button} onClick={login}>
          Login con Google
        </button>
      </div>
    );
  }

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>FactuControl</h2>

        <button style={styles.menu} onClick={() => setSeccion("emisor")}>Emisor</button>
        <button style={styles.menu} onClick={() => setSeccion("clientes")}>Clientes</button>
        <button style={styles.menu} onClick={() => setSeccion("facturas")}>Facturas</button>

        <button style={{ ...styles.menu, background: "#ef4444" }} onClick={logout}>
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        
        {/* ================= FACTURAS ================= */}
        {seccion === "facturas" && (
          <div style={styles.card}>
            <h3>Crear factura</h3>

            <select
              style={styles.input}
              value={emisorSel?.id || ""}
              onChange={e => {
                setEmisorSel(emisores.find(em => em.id === e.target.value));
              }}
            >
              <option value="">Emisor</option>
              {emisores.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>

            <select
              style={styles.input}
              value={clienteSel?.id || ""}
              onChange={e => {
                setClienteSel(clientes.find(c => c.id === e.target.value));
              }}
            >
              <option value="">Cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            <input
              style={styles.input}
              placeholder="Concepto"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
            />

            <input
              style={styles.input}
              type="number"
              placeholder="Base"
              value={base}
              onChange={e => setBase(Number(e.target.value))}
            />

            <p>IVA: {iva.toFixed(2)} €</p>
            <p>IRPF: {irpf.toFixed(2)} €</p>
            <p><b>Total: {total.toFixed(2)} €</b></p>

            <button style={styles.button} onClick={crearFactura}>
              Crear factura
            </button>

            <hr style={{ marginTop: 20 }} />

            <h3>Facturas creadas</h3>

            {facturas.map(f => (
              <div key={f.id} style={{
                background: "#fff",
                color: "#000",
                marginTop: 10,
                padding: 10,
                borderRadius: 8
              }}>
                <p><b>Nº:</b> {f.numero}</p>
                <p><b>Concepto:</b> {f.concepto}</p>
                <p><b>Total:</b> {f.total.toFixed(2)} €</p>

                <button onClick={() => generarPDF(f)}>
                  Descargar PDF
                </button>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}

/* ================= ESTILOS (NO TOCADOS) ================= */
const styles = {
  app: { display: "flex", minHeight: "100vh", fontFamily: "Arial", background: "#834fcd", color: "#fff" },
  sidebar: { width: 200, background: "#791f8f", padding: 20, display: "flex", flexDirection: "column", gap: 10 },
  main: { flex: 1, padding: 30 },
  card: { background: "#e2a9f1", color: "#000", padding: 20, borderRadius: 14 },
  input: { width: "85%", padding: 10, margin: "6px 0", borderRadius: 8 },
  button: { padding: 10, background: "#3b82f6", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" },
  menu: { padding: 10, background: "#e482da", border: 0, borderRadius: 8, fontWeight: "bold" },
  row: { display: "flex", alignItems: "center", gap: 12 },
  sidebarTitle: { color: 'white', fontSize: '30px', fontWeight: 'bold' },
  login: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
};
