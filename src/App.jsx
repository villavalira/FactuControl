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

  /* ================= AUTH ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) loadAll(u.uid);
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

  /* ================= EMISOR SAVE ================= */
  const saveEmisor = async () => {
    if (!user?.uid) return;

    await addDoc(collection(db, "emisores"), {
      uid: user.uid,
      ...emisorForm,
    });

    setEmisorForm({
      nombre: "",
      nif: "",
      direccion: "",
      email: "",
      telefono: "",
    });

    loadAll(user.uid);
  };

  const deleteEmisor = async (id) => {
    await deleteDoc(doc(db, "emisores", id));
    loadAll(user.uid);
  };

  /* ================= CLIENTE SAVE ================= */
  const saveCliente = async () => {
    if (!user?.uid) return;

    await addDoc(collection(db, "clientes"), {
      uid: user.uid,
      ...clienteForm,
    });

    setClienteForm({
      nombre: "",
      nif: "",
      direccion: "",
      email: "",
      telefono: "",
    });

    loadAll(user.uid);
  };

  const deleteCliente = async (id) => {
    await deleteDoc(doc(db, "clientes", id));
    loadAll(user.uid);
  };

  /* ================= FACTURA ================= */
  const generarNumero = () => {
    if (!facturas.length) return "FAC-000001";

    const nums = facturas.map(f =>
      parseInt((f.numero || "FAC-0").replace("FAC-", ""))
    );

    return "FAC-" + String(Math.max(...nums) + 1).padStart(6, "0");
  };

  const crearFactura = async () => {
    if (!user?.uid || !emisorSel || !clienteSel) return;

    await addDoc(collection(db, "facturas"), {
      uid: user.uid,
      numero: generarNumero(),
      emisorId: emisorSel.id,
      clienteId: clienteSel.id,
      concepto,
      base,
      iva,
      irpf,
      total,
      fecha: new Date().toLocaleDateString(),
    });

    setConcepto("");
    setBase(0);

    loadAll(user.uid);
  };

  /* ================= LOGIN ================= */
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
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>FactuControl</h2>

        <button style={styles.menu} onClick={() => setSeccion("emisor")}>
          Emisor
        </button>

        <button style={styles.menu} onClick={() => setSeccion("clientes")}>
          Clientes
        </button>

        <button style={styles.menu} onClick={() => setSeccion("facturas")}>
          Facturas
        </button>

        <button style={{ ...styles.menu, background: "#ef4444" }} onClick={logout}>
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        {/* ================= EMISOR ================= */}
        {seccion === "emisor" && (
          <div style={styles.card}>
            <h3>Emisor</h3>

            {emisores.map(e => (
              <div key={e.id} style={styles.row}>
                {e.nombre}
                <button onClick={() => deleteEmisor(e.id)}>Borrar</button>
              </div>
            ))}

            <input style={styles.input} placeholder="Nombre"
              value={emisorForm.nombre}
              onChange={e => setEmisorForm({ ...emisorForm, nombre: e.target.value })}
            />

            <input style={styles.input} placeholder="NIF/CIF"
              value={emisorForm.nif}
              onChange={e => setEmisorForm({ ...emisorForm, nif: e.target.value })}
            />

            <input style={styles.input} placeholder="Dirección"
              value={emisorForm.direccion}
              onChange={e => setEmisorForm({ ...emisorForm, direccion: e.target.value })}
            />

            <input style={styles.input} placeholder="Email"
              value={emisorForm.email}
              onChange={e => setEmisorForm({ ...emisorForm, email: e.target.value })}
            />

            <input style={styles.input} placeholder="Teléfono"
              value={emisorForm.telefono}
              onChange={e => setEmisorForm({ ...emisorForm, telefono: e.target.value })}
            />

            <button style={styles.button} onClick={saveEmisor}>
              Guardar emisor
            </button>
          </div>
        )}

        {/* ================= CLIENTES ================= */}
       console.log("FUNCION CLIENTE EJECUTADA");
alert("CLIENTE CLICK");
        {seccion === "clientes" && (
          <div style={styles.card}>
            <h3>Clientes</h3>

            {clientes.map(c => (
              <div key={c.id} style={styles.row}>
                {c.nombre}
                <button onClick={() => deleteCliente(c.id)}>Borrar</button>
              </div>
            ))}

            <input style={styles.input} placeholder="Nombre"
              value={clienteForm.nombre}
              onChange={e => setClienteForm({ ...clienteForm, nombre: e.target.value })}
            />

            <input style={styles.input} placeholder="NIF/CIF"
              value={clienteForm.nif}
              onChange={e => setClienteForm({ ...clienteForm, nif: e.target.value })}
            />

            <input style={styles.input} placeholder="Dirección"
              value={clienteForm.direccion}
              onChange={e => setClienteForm({ ...clienteForm, direccion: e.target.value })}
            />

            <input style={styles.input} placeholder="Email"
              value={clienteForm.email}
              onChange={e => setClienteForm({ ...clienteForm, email: e.target.value })}
            />

            <input style={styles.input} placeholder="Teléfono"
              value={clienteForm.telefono}
              onChange={e => setClienteForm({ ...clienteForm, telefono: e.target.value })}
            />
            <button style={styles.button} onClick={saveCliente}>
              Guardar cliente
            </button>
          </div>
        )}

        {/* ================= FACTURAS ================= */}
        {seccion === "facturas" && (
          <div style={styles.card}>
            <h3>Crear factura</h3>

            <p>Número: {generarNumero()}</p>

            <select style={styles.input}
              onChange={e => setEmisorSel(emisores.find(x => x.id === e.target.value))}
            >
              <option>Emisor</option>
              {emisores.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>

            <select style={styles.input}
              onChange={e => setClienteSel(clientes.find(x => x.id === e.target.value))}
            >
              <option>Cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            <input style={styles.input} placeholder="Concepto"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
            />

            <input style={styles.input} type="number"
              value={base}
              onChange={e => setBase(Number(e.target.value))}
            />

            <p>IVA: {iva.toFixed(2)} €</p>
            <p>IRPF: {irpf.toFixed(2)} €</p>
            <p><b>Total: {total.toFixed(2)} €</b></p>

            <button style={styles.button} onClick={crearFactura}>
              Crear factura
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

/* ================= ESTILOS (NO TOCADOS) ================= */
const styles = {
  app: { display: "flex", minHeight: "100vh", fontFamily: "Arial", background: "#834fcd", color: "#fff" },
  sidebar: { width: 240, background: "#791f8f", padding: 20, display: "flex", flexDirection: "column", gap: 10 },
  main: { flex: 1, padding: 30 },
  card: { background: "#e2a9f1", color: "#000", padding: 20, borderRadius: 14 },
  input: { width: "100%", padding: 10, margin: "6px 0", borderRadius: 8 },
  button: { padding: 10, background: "#3b82f6", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" },
  menu: { padding: 10, background: "#e482da", border: 0, borderRadius: 8, fontWeight: "bold" },
  row: { display: "flex", justifyContent: "space-between", padding: 8 },
  sidebarTitle: { fontSize: 22, marginBottom: 20 },
  login: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
};
