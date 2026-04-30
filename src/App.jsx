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

  /* ================= DATA ================= */
  const [emisores, setEmisores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);

  /* ================= FORMS ================= */
  const [emisorForm, setEmisorForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  const [clienteForm, setClienteForm] = useState({
    nombre: "",
    dni: "",
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

        {seccion === "emisor" && (
          <div style={styles.card}>
            <h3>Emisor</h3>

            {emisores.map(e => (
              <div key={e.id} style={styles.row}>
                {e.nombre}
                <button onClick={() => deleteEmisor(e.id)}>Borrar</button>
              </div>
            ))}

            <input style={styles.input}
              placeholder="Nombre"
              value={emisorForm.nombre}
              onChange={e => setEmisorForm({ ...emisorForm, nombre: e.target.value })}
            />

            <button style={styles.button} onClick={saveEmisor}>
              Guardar emisor
            </button>
          </div>
        )}

        {seccion === "clientes" && (
          <div style={styles.card}>
            <h3>Clientes</h3>

            {clientes.map(c => (
              <div key={c.id} style={styles.row}>
                {c.nombre}
                <button onClick={() => deleteCliente(c.id)}>Borrar</button>
              </div>
            ))}

            <input style={styles.input}
              placeholder="Nombre"
              value={clienteForm.nombre}
              onChange={e => setClienteForm({ ...clienteForm, nombre: e.target.value })}
            />

            <button style={styles.button} onClick={saveCliente}>
              Guardar cliente
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

/* ================= ESTILOS (ESTO ES LO QUE TE FALTABA) ================= */
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    fontFamily: "Arial",
    background: "#834fcd",
    color: "#fff",
  },

  sidebar: {
    width: 240,
    background: "#791f8f",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  main: {
    flex: 1,
    padding: 30,
    overflowY: "auto",
  },

  card: {
    background: "#e2a9f1",
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
  },

  input: {
    width: "100%",
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    border: "1px solid #374151",
    background: "#0b1220",
    color: "#fff",
  },

  button: {
    padding: 10,
    background: "#3b82f6",
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 10,
  },

  menu: {
    padding: 10,
    background: "#e482da",
    color: "black",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    textTransform: "uppercase",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    borderBottom: "1px solid #e482da",
  },

  sidebarTitle: {
    color: "#38bdf8",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },

  login: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};
