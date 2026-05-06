import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
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
    padding: 6,
    marginTop: 8,
    borderRadius: 8,
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

  const login = () => signInWithPopup(auth, googleProvider);
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
    doc.text(`Factura ${f.numero}`, 20, 20);
    doc.text(`Total: ${f.total} €`, 20, 30);
    doc.save(`factura-${f.numero}.pdf`);
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <button style={styles.button} onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div style={styles.app}>

      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.topBarInner}>
          <h3>FactuControl</h3>

          <div style={styles.menu}>
            <button style={styles.button} onClick={() => setSeccion("emisor")}>Emisor</button>
            <button style={styles.button} onClick={() => setSeccion("clientes")}>Clientes</button>
            <button style={styles.button} onClick={() => setSeccion("facturas")}>Facturas</button>
            <button style={{ ...styles.button, ...styles.danger }} onClick={logout}>Logout</button>
          </div>
        </div>
      </div>

      <div style={styles.container}>

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
            <input type="number" style={styles.input} onChange={e=>setBase(Number(e.target.value))}/>

            <p>Total: {total.toFixed(2)} €</p>

            <button style={styles.button} onClick={crearFactura}>Crear factura</button>

            {facturas.map(f=> (
              <div key={f.id} style={{ marginTop: 10 }}>
                {f.numero} - {f.total} €
                <button style={styles.button} onClick={()=>generarPDF(f)}>PDF</button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
