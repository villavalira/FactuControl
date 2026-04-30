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
  const [seccion, setSeccion] = useState("emisor");

  /* ================= EMISORES ================= */
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
    dni: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  /* ================= FACTURAS ================= */
  const [facturas, setFacturas] = useState([]);

  const [concepto, setConcepto] = useState("");
  const [base, setBase] = useState(0);

  const IVA = 0.21;
  const IRPF = 0.07;

  const iva = base * IVA;
  const irpf = base * IRPF;
  const total = base + iva - irpf;

  /* ================= AUTH LISTENER ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) loadAll(u.uid);
    });

    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  /* ================= LOAD DATA ================= */
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

  const saveCliente = async () => {
    await addDoc(collection(db, "clientes"), {
      uid: user.uid,
      ...clienteForm,
    });

    setClienteForm({
      nombre: "",
      dni: "",
      direccion: "",
      email: "",
      telefono: "",
    });

    loadAll(user.uid);
  };

  /* ================= DELETE ================= */
  const deleteEmisor = async (id) => {
    await deleteDoc(doc(db, "emisores", id));
    loadAll(user.uid);
  };

  const deleteCliente = async (id) => {
    await deleteDoc(doc(db, "clientes", id));
    loadAll(user.uid);
  };

  /* ================= LOGIN SCREEN ================= */
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

        <button onClick={logout} style={{ ...styles.menu, background: "#ef4444" }}>
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        {/* EMISOR */}
        {seccion === "emisor" && (
          <div style={styles.card}>
            <h3>Emisor</h3>

            {emisores.map(e => (
              <div key={e.id} style={styles.row}>
                {e.nombre}
                <button onClick={() => deleteEmisor(e.id)}>Borrar</button>
              </div>
            ))}

            <input
              style={styles.input}
              placeholder="Nombre"
              value={emisorForm.nombre}
              onChange={(e) =>
                setEmisorForm({ ...emisorForm, nombre: e.target.value })
              }
            />

            <button style={styles.button} onClick={saveEmisor}>
              Guardar emisor
            </button>
          </div>
        )}

        {/* CLIENTES */}
        {seccion === "clientes" && (
          <div style={styles.card}>
            <h3>Clientes</h3>

            {clientes.map(c => (
              <div key={c.id} style={styles.row}>
                {c.nombre}
                <button onClick={() => deleteCliente(c.id)}>Borrar</button>
              </div>
            ))}

            <input
              style={styles.input}
              placeholder="Nombre"
              value={clienteForm.nombre}
              onChange={(e) =>
                setClienteForm({ ...clienteForm, nombre: e.target.value })
              }
            />

            <button style={styles.button} onClick={saveCliente}>
              Guardar cliente
            </button>
          </div>
        )}

        {/* FACTURAS */}
        {seccion === "facturas" && (
          <div style={styles.card}>
            <h3>Facturas</h3>

            <input
              style={styles.input}
              placeholder="Concepto"
              onChange={(e) => setConcepto(e.target.value)}
            />

            <input
              style={styles.input}
              type="number"
              onChange={(e) => setBase(Number(e.target.value))}
            />

            <button style={styles.button}>
              Crear factura
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
