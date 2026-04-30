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
  /* ================= LOGIN ================= */
  const [user, setUser] = useState(null);

  /* ================= MENU ================= */
  const [seccion, setSeccion] = useState("facturas");

  /* ================= EMISORES ================= */
const [emisorForm, setEmisorForm] = useState({
  nombre: "",
  nif: "",
  direccion: "",
  email: "",
  telefono: "",
});

  /* ================= CLIENTES ================= */
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
    const e = await getDocs(
      query(collection(db, "emisores"), where("uid", "==", uid))
    );

    const c = await getDocs(
      query(collection(db, "clientes"), where("uid", "==", uid))
    );

    const f = await getDocs(
      query(collection(db, "facturas"), where("uid", "==", uid))
    );

    setEmisores(e.docs.map((d) => ({ id: d.id, ...d.data() })));
    setClientes(c.docs.map((d) => ({ id: d.id, ...d.data() })));
    setFacturas(f.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  /* ================= NUMERO FACTURA ================= */
  const generarNumero = () => {
    if (!facturas.length) return "FAC-000001";

    const nums = facturas.map((f) =>
      parseInt((f.numero || "FAC-0").replace("FAC-", ""))
    );

    const siguiente = Math.max(...nums) + 1;

    return "FAC-" + String(siguiente).padStart(6, "0");
  };

  /* ================= CREAR FACTURA ================= */
  const crearFactura = async () => {
    if (!emisorSel || !clienteSel) {
      alert("Selecciona emisor y cliente");
      return;
    }

    const numero = generarNumero();

    await addDoc(collection(db, "facturas"), {
      uid: user.uid,
      numero,
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

        <button
          style={styles.menu}
          onClick={() => setSeccion("emisor")}
        >
          Emisor
        </button>

        <button
          style={styles.menu}
          onClick={() => setSeccion("clientes")}
        >
          Clientes
        </button>

        <button
          style={styles.menu}
          onClick={() => setSeccion("facturas")}
        >
          Facturas
        </button>

        <button
          style={{ ...styles.menu, background: "#ef4444" }}
          onClick={logout}
        >
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        {/* EMISOR */}
        {seccion === "emisor" && (
          <div style={styles.card}>
            <h3>Emisor</h3>

            {emisores.map((e) => (
              <div key={e.id} style={styles.row}>
                {e.nombre}
                <button onClick={() => deleteEmisor(e.id)}>
                  Borrar
                </button>
              </div>
            ))}

            <input
              style={styles.input}
              placeholder="Nombre"
              value={emisorForm.nombre}
              onChange={(e) =>
                setEmisorForm({
                  ...emisorForm,
                  nombre: e.target.value,
                })
              }
            />

            <button
              style={styles.button}
              onClick={saveEmisor}
            >
              Guardar emisor
            </button>
          </div>
        )}

        {/* CLIENTES */}
        {seccion === "clientes" && (
          <div style={styles.card}>
            <h3>Clientes</h3>

            {clientes.map((c) => (
              <div key={c.id} style={styles.row}>
                {c.nombre}
                <button onClick={() => deleteCliente(c.id)}>
                  Borrar
                </button>
              </div>
            ))}

            <input
              style={styles.input}
              placeholder="Nombre"
              value={clienteForm.nombre}
              onChange={(e) =>
                setClienteForm({
                  ...clienteForm,
                  nombre: e.target.value,
                })
              }
            />

            <button
              style={styles.button}
              onClick={saveCliente}
            >
              Guardar cliente
            </button>
          </div>
        )}

        {/* FACTURAS */}
        {seccion === "facturas" && (
          <div style={styles.card}>
            <h3>Crear factura</h3>

            <p>Número automático: {generarNumero()}</p>

            <select
              style={styles.input}
              value={emisorSel?.id || ""}
              onChange={(e) =>
                setEmisorSel(
                  emisores.find(
                    (x) => x.id === e.target.value
                  )
                )
              }
            >
              <option value="">
                Selecciona emisor
              </option>

              {emisores.map((e) => (
                <option
                  key={e.id}
                  value={e.id}
                >
                  {e.nombre}
                </option>
              ))}
            </select>

            <select
              style={styles.input}
              value={clienteSel?.id || ""}
              onChange={(e) =>
                setClienteSel(
                  clientes.find(
                    (x) => x.id === e.target.value
                  )
                )
              }
            >
              <option value="">
                Selecciona cliente
              </option>

              {clientes.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.nombre}
                </option>
              ))}
            </select>

            <input
              style={styles.input}
              placeholder="Concepto"
              value={concepto}
              onChange={(e) =>
                setConcepto(e.target.value)
              }
            />

            <input
              style={styles.input}
              type="number"
              placeholder="Base imponible"
              value={base}
              onChange={(e) =>
                setBase(Number(e.target.value))
              }
            />

            <p>IVA: {iva.toFixed(2)} €</p>
            <p>IRPF: {irpf.toFixed(2)} €</p>
            <p>
              <b>Total: {total.toFixed(2)} €</b>
            </p>

            <button
              style={styles.button}
              onClick={crearFactura}
            >
              Crear factura
            </button>

            <hr />

            <h3>Facturas creadas</h3>

            {facturas.map((f) => (
              <div
                key={f.id}
                style={styles.row}
              >
                {f.numero} - {f.total} €
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= ESTILOS ================= */
const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
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
  },

  card: {
    background: "#e2a9f1",
    color: "#000",
    padding: 20,
    borderRadius: 14,
  },

  input: {
    width: "100%",
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    border: "1px solid #ccc",
  },

  button: {
    padding: 10,
    background: "#3b82f6",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 10,
  },

  menu: {
    padding: 10,
    background: "#e482da",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    borderBottom: "1px solid #ccc",
  },

  sidebarTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },

  login: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};
