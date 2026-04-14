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
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);

  /* ================= EMISOR ================= */
  const [misDatos, setMisDatos] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
    logo: null,
  });

  /* ================= CLIENTES ================= */
  const [clientes, setClientes] = useState([]);

  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [direccion, setDireccion] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");

  const [editId, setEditId] = useState(null);

  /* ================= FACTURAS ================= */
  const [facturas, setFacturas] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [concepto, setConcepto] = useState("");
  const [base, setBase] = useState(0);

  const IVA = 0.21;
  const IRPF = 0.07;

  const ivaValor = base * IVA;
  const irpfValor = base * IRPF;
  const total = base + ivaValor - irpfValor;

  /* ================= AUTH ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        loadData(u.uid);
        loadEmisor(u.uid);
      }
    });

    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  /* ================= LOAD DATA ================= */
  const loadData = async (uid) => {
    const qClientes = query(collection(db, "clientes"), where("uid", "==", uid));
    const qFacturas = query(collection(db, "facturas"), where("uid", "==", uid));

    const snapClientes = await getDocs(qClientes);
    const snapFacturas = await getDocs(qFacturas);

    setClientes(snapClientes.docs.map((d) => ({ id: d.id, ...d.data() })));
    setFacturas(snapFacturas.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadEmisor = async (uid) => {
    const ref = doc(db, "emisores", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setMisDatos(snap.data());
    }
  };

  const saveEmisor = async () => {
    if (!user) return;

    await setDoc(doc(db, "emisores", user.uid), misDatos);
    alert("Emisor guardado ✔");
  };

  /* ================= CLIENTES ================= */
  const editCliente = (c) => {
    setNombre(c.nombre || "");
    setDni(c.dni || "");
    setDireccion(c.direccion || "");
    setEmailCliente(c.email || "");
    setTelefonoCliente(c.telefono || "");
    setEditId(c.id);
  };

  const saveCliente = async () => {
    if (!user) return;
    if (!nombre) return;

    if (editId) {
      await setDoc(doc(db, "clientes", editId), {
        uid: user.uid,
        nombre,
        dni,
        direccion,
        email: emailCliente,
        telefono: telefonoCliente,
      });
      setEditId(null);
    } else {
      await addDoc(collection(db, "clientes"), {
        uid: user.uid,
        nombre,
        dni,
        direccion,
        email: emailCliente,
        telefono: telefonoCliente,
      });
    }

    loadData(user.uid);

    setNombre("");
    setDni("");
    setDireccion("");
    setEmailCliente("");
    setTelefonoCliente("");
  };

  /* ================= FACTURAS ================= */
  const crearFactura = async () => {
    if (!user) return;
    if (!clienteSeleccionado || !concepto) return;

    await addDoc(collection(db, "facturas"), {
      uid: user.uid,
      clienteId: clienteSeleccionado,
      concepto,
      base,
      iva: ivaValor,
      irpf: irpfValor,
      total,
      fecha: new Date().toLocaleDateString(),
    });

    loadData(user.uid);
  };

  const getCliente = (id) => {
    return clientes.find((c) => c.id === id);
  };

  /* ================= PDF ================= */
  const descargarPDF = (f) => {
    const doc = new jsPDF();
    const cliente = getCliente(f.clienteId);

    doc.text("FACTURA", 20, 20);

    doc.text(`Fecha: ${f.fecha}`, 20, 30);

    doc.text(`Emisor: ${misDatos.nombre}`, 20, 40);
    doc.text(`Email: ${misDatos.email}`, 20, 50);
    doc.text(`Tel: ${misDatos.telefono}`, 20, 60);

    doc.text("----------------------", 20, 70);

    doc.text(`Cliente: ${cliente?.nombre}`, 20, 80);
    doc.text(`Email: ${cliente?.email}`, 20, 90);
    doc.text(`Tel: ${cliente?.telefono}`, 20, 100);

    doc.text(`Concepto: ${f.concepto}`, 20, 110);
    doc.text(`Base: ${f.base}`, 20, 120);
    doc.text(`IVA: ${f.iva}`, 20, 130);
    doc.text(`TOTAL: ${f.total}`, 20, 140);

    doc.save("factura.pdf");
  };

  /* ================= LOGIN ================= */
  if (!user) {
    return (
      <div style={styles.login}>
        <h1>📄 FactuControl</h1>
        <button style={styles.button} onClick={login}>
          Login con Google
        </button>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div style={styles.container}>
      <h1>📊 FactuControl</h1>

      <button onClick={logout} style={{ ...styles.button, background: "red" }}>
        Logout
      </button>

      {/* EMISOR */}
      <div style={styles.card}>
        <h2>🏢 Emisor</h2>

        <input placeholder="Nombre"
          value={misDatos.nombre}
          onChange={(e) => setMisDatos({ ...misDatos, nombre: e.target.value })}
        />

        <input placeholder="Email"
          value={misDatos.email}
          onChange={(e) => setMisDatos({ ...misDatos, email: e.target.value })}
        />

        <input placeholder="Teléfono"
          value={misDatos.telefono}
          onChange={(e) => setMisDatos({ ...misDatos, telefono: e.target.value })}
        />

        <button onClick={saveEmisor} style={styles.button}>
          Guardar emisor
        </button>
      </div>

      {/* CLIENTES */}
      <div style={styles.card}>
        <h2>👥 Clientes</h2>

        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
        <input placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        <input placeholder="Email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} />
        <input placeholder="Teléfono" value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} />

        <button onClick={saveCliente} style={styles.button}>
          {editId ? "Guardar cambios" : "Añadir cliente"}
        </button>

        <ul>
          {clientes.map((c) => (
            <li key={c.id}>
              {c.nombre}
              <button onClick={() => editCliente(c)}>✏️</button>
            </li>
          ))}
        </ul>
      </div>

      {/* FACTURAS */}
      <div style={styles.card}>
        <h2>🧾 Facturas</h2>

        <select onChange={(e) => setClienteSeleccionado(e.target.value)}>
          <option value="">Cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <input placeholder="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        <input type="number" placeholder="Base" value={base} onChange={(e) => setBase(Number(e.target.value))} />

        <button onClick={crearFactura} style={styles.button}>
          Crear factura
        </button>
      </div>

      {/* LISTA */}
      <div style={styles.card}>
        <h2>📁 Facturas</h2>

        {facturas.map((f) => (
          <div key={f.id}>
            {getCliente(f.clienteId)?.nombre} - {f.total} €
            <button onClick={() => descargarPDF(f)} style={styles.button}>
              PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: { padding: 20, background: "#eaf4ff", minHeight: "100vh" },
  card: { background: "white", padding: 15, marginBottom: 15, borderRadius: 10 },
  button: { padding: 10, background: "#38bdf8", color: "white", border: 0, borderRadius: 8 },
  login: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
};