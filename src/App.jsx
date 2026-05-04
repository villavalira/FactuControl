import { useState, useEffect } from "react";
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
  const [emisorSel, setEmisorSel] = useState(null);

  const [emisorForm, setEmisorForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  /* ================= CLIENTE ================= */
  const [clientes, setClientes] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);

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

  /* ================= EMISOR ================= */
 {seccion === "emisor" && (
  <div style={styles.card}>
    <h3>Emisor</h3>

    {emisores.map(e => (
      <div key={e.id} style={styles.row}>
        <span onClick={() => setEmisorSel(e)}>
          {e.nombre}
        </span>
        <button onClick={() => deleteEmisor(e.id)}>Borrar</button>
      </div>
    ))}

    <input style={styles.input} placeholder="Nombre"
      value={emisorForm.nombre}
      onChange={e => setEmisorForm({ ...emisorForm, nombre: e.target.value })}
    />

    <input style={styles.input} placeholder="CIF/NIF"
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
  /* ================= CLIENTE ================= */
  const saveCliente = async () => {
    if (!user?.uid) return;

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

  const deleteCliente = async (id) => {
    await deleteDoc(doc(db, "clientes", id));
    loadAll(user.uid);
  };

  /* ================= FACTURA NUM ================= */
  const generarNumero = () => {
    if (!facturas.length) return "FAC-000001";

    const nums = facturas.map(f =>
      parseInt((f.numero || "FAC-0").replace("FAC-", ""))
    );

    return "FAC-" + String(Math.max(...nums) + 1).padStart(6, "0");
  };

  /* ================= CREAR FACTURA ================= */
  const crearFactura = async () => {
    if (!emisorSel || !clienteSel) return;

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
        <h2>FactuControl</h2>

        <button style={styles.menu} onClick={() => setSeccion("emisor")}>
          Emisor
        </button>

        <button style={styles.menu} onClick={() => setSeccion("clientes")}>
          Clientes
        </button>

        <button style={styles.menu} onClick={() => setSeccion("facturas")}>
          Facturas
        </button>

        <button style={{ ...styles.menu, background: "red" }} onClick={logout}>
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        {/* EMISOR */}
        {seccion === "emisor" && (
          <div style={styles.card}>
            <h3>Emisores</h3>

            {emisores.map(e => (
              <div key={e.id} style={styles.row}>
                <span onClick={() => setEmisorSel(e)}>
                  {e.nombre}
                </span>
                <button onClick={() => deleteEmisor(e.id)}>X</button>
              </div>
            ))}

            <input placeholder="Nombre"
              value={emisorForm.nombre}
              onChange={e => setEmisorForm({ ...emisorForm, nombre: e.target.value })}
            />

            <input placeholder="NIF"
              value={emisorForm.nif}
              onChange={e => setEmisorForm({ ...emisorForm, nif: e.target.value })}
            />

            <button onClick={saveEmisor}>Guardar</button>
          </div>
        )}

        {/* CLIENTES */}
        {seccion === "clientes" && (
          <div style={styles.card}>
            <h3>Clientes</h3>

            {clientes.map(c => (
              <div key={c.id} style={styles.row}>
                <span onClick={() => setClienteSel(c)}>
                  {c.nombre}
                </span>
                <button onClick={() => deleteCliente(c.id)}>X</button>
              </div>
            ))}

            <input placeholder="Nombre"
              value={clienteForm.nombre}
              onChange={e => setClienteForm({ ...clienteForm, nombre: e.target.value })}
            />

            <button onClick={saveCliente}>Guardar</button>
          </div>
        )}

        {/* FACTURAS */}
        {seccion === "facturas" && (
          <div style={styles.card}>
            <h3>Factura</h3>

            <p>Numero: {generarNumero()}</p>

            <select onChange={e =>
              setEmisorSel(emisores.find(x => x.id === e.target.value))
            }>
              <option>Emisor</option>
              {emisores.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>

            <select onChange={e =>
              setClienteSel(clientes.find(x => x.id === e.target.value))
            }>
              <option>Cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            <input placeholder="Concepto"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
            />

            <input type="number"
              value={base}
              onChange={e => setBase(Number(e.target.value))}
            />

            <p>IVA: {iva.toFixed(2)}</p>
            <p>IRPF: {irpf.toFixed(2)}</p>
            <p><b>Total: {total.toFixed(2)}</b></p>

            <button onClick={crearFactura}>Crear factura</button>
          </div>
        )}

      </div>
    </div>
  );
}

/* ================= ESTILOS ================= */
const styles = {
  app: { display: "flex", minHeight: "100vh", fontFamily: "Arial" },
  sidebar: { width: 200, background: "#333", color: "#fff", padding: 20 },
  main: { flex: 1, padding: 20 },
  card: { background: "#eee", padding: 20, borderRadius: 10 },
  menu: { display: "block", margin: 10 },
  row: { display: "flex", justifyContent: "space-between" },
  button: { padding: 10 },
  login: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }
};
