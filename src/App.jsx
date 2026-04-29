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
} from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);

  /* ================= EMISORES ================= */
  const [emisores, setEmisores] = useState([]);
  const [emisorSeleccionado, setEmisorSeleccionado] = useState(null);

  const [misDatos, setMisDatos] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  /* ================= CLIENTES ================= */
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [direccion, setDireccion] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");

  /* ================= FACTURAS ================= */
  const [facturas, setFacturas] = useState([]);

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
        loadEmisores(u.uid);
        loadClientes(u.uid);
        loadFacturas(u.uid);
      }
    });

    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  /* ================= LOAD ================= */
  const loadEmisores = async (uid) => {
    const q = query(collection(db, "emisores"), where("uid", "==", uid));
    const snap = await getDocs(q);

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setEmisores(data);
    if (data.length > 0 && !emisorSeleccionado) {
      setEmisorSeleccionado(data[0]);
    }
  };

  const loadClientes = async (uid) => {
    const q = query(collection(db, "clientes"), where("uid", "==", uid));
    const snap = await getDocs(q);

    setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadFacturas = async (uid) => {
    const q = query(collection(db, "facturas"), where("uid", "==", uid));
    const snap = await getDocs(q);

    setFacturas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  /* ================= EMISOR ================= */
  const saveEmisor = async () => {
    if (!user) return;

    await addDoc(collection(db, "emisores"), {
      uid: user.uid,
      ...misDatos,
    });

    loadEmisores(user.uid);

    setMisDatos({
      nombre: "",
      nif: "",
      direccion: "",
      email: "",
      telefono: "",
    });
  };

  /* ================= CLIENTES ================= */
  const saveCliente = async () => {
    if (!user || !nombre) return;

    await addDoc(collection(db, "clientes"), {
      uid: user.uid,
      nombre,
      dni,
      direccion,
      email: emailCliente,
      telefono: telefonoCliente,
    });

    loadClientes(user.uid);

    setNombre("");
    setDni("");
    setDireccion("");
    setEmailCliente("");
    setTelefonoCliente("");
  };

  /* ================= FACTURA ================= */
  const crearFactura = async () => {
    if (!user || !clienteSeleccionado || !emisorSeleccionado) return;

    await addDoc(collection(db, "facturas"), {
      uid: user.uid,
      emisorId: emisorSeleccionado.id,
      clienteId: clienteSeleccionado.id,
      concepto,
      base,
      iva: ivaValor,
      irpf: irpfValor,
      total,
      fecha: new Date().toLocaleDateString(),
    });

    loadFacturas(user.uid);
  };

  const getCliente = (id) => clientes.find((c) => c.id === id);
  const getEmisor = (id) => emisores.find((e) => e.id === id);

  /* ================= PDF ================= */
  const descargarPDF = (f) => {
    const pdf = new jsPDF();

    const cliente = getCliente(f.clienteId);
    const emisor = getEmisor(f.emisorId);

    pdf.text("FACTURA", 20, 20);
    pdf.text(`Fecha: ${f.fecha}`, 20, 30);

    /* EMISOR */
    pdf.text(`Emisor: ${emisor?.nombre || ""}`, 20, 45);
    pdf.text(`NIF: ${emisor?.nif || ""}`, 20, 55);
    pdf.text(`Dirección: ${emisor?.direccion || ""}`, 20, 65);
    pdf.text(`Email: ${emisor?.email || ""}`, 20, 75);
    pdf.text(`Tel: ${emisor?.telefono || ""}`, 20, 85);

    pdf.text("----------------------", 20, 95);

    /* CLIENTE */
    pdf.text(`Cliente: ${cliente?.nombre || ""}`, 20, 105);
    pdf.text(`DNI: ${cliente?.dni || ""}`, 20, 115);
    pdf.text(`Dirección: ${cliente?.direccion || ""}`, 20, 125);
    pdf.text(`Email: ${cliente?.email || ""}`, 20, 135);
    pdf.text(`Tel: ${cliente?.telefono || ""}`, 20, 145);

    pdf.text("----------------------", 20, 155);

    /* FACTURA */
    pdf.text(`Concepto: ${f.concepto}`, 20, 165);
    pdf.text(`Base: ${f.base}`, 20, 175);
    pdf.text(`IVA: ${f.iva}`, 20, 185);
    pdf.text(`IRPF: ${f.irpf}`, 20, 195);
    pdf.text(`TOTAL: ${f.total}`, 20, 205);

    pdf.save("factura.pdf");
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

      {/* ================= EMISORES ================= */}
      <div style={styles.card}>
        <h2>🏢 Emisor</h2>

        <select
          onChange={(e) =>
            setEmisorSeleccionado(
              emisores.find((e2) => e2.id === e.target.value)
            )
          }
        >
          <option value="">Selecciona emisor</option>
          {emisores.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>

        <input
          placeholder="Nombre"
          value={misDatos.nombre}
          onChange={(e) =>
            setMisDatos({ ...misDatos, nombre: e.target.value })
          }
        />

        <input
          placeholder="NIF"
          value={misDatos.nif}
          onChange={(e) =>
            setMisDatos({ ...misDatos, nif: e.target.value })
          }
        />

        <input
          placeholder="Dirección"
          value={misDatos.direccion}
          onChange={(e) =>
            setMisDatos({ ...misDatos, direccion: e.target.value })
          }
        />

        <input
          placeholder="Email"
          value={misDatos.email}
          onChange={(e) =>
            setMisDatos({ ...misDatos, email: e.target.value })
          }
        />

        <input
          placeholder="Teléfono"
          value={misDatos.telefono}
          onChange={(e) =>
            setMisDatos({ ...misDatos, telefono: e.target.value })
          }
        />

        <button onClick={saveEmisor} style={styles.button}>
          Guardar emisor
        </button>
      </div>

      {/* ================= CLIENTES ================= */}
      <div style={styles.card}>
        <h2>👥 Clientes</h2>

        <select
          onChange={(e) =>
            setClienteSeleccionado(
              clientes.find((c) => c.id === e.target.value)
            )
          }
        >
          <option value="">Selecciona cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
        <input placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        <input placeholder="Email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} />
        <input placeholder="Teléfono" value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} />

        <button onClick={saveCliente} style={styles.button}>
          Añadir cliente
        </button>
      </div>

      {/* ================= FACTURA ================= */}
      <div style={styles.card}>
        <h2>🧾 Crear factura</h2>

        <input
          placeholder="Concepto"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
        />

        <input
          type="number"
          placeholder="Base"
          value={base}
          onChange={(e) => setBase(Number(e.target.value))}
        />

        <button onClick={crearFactura} style={styles.button}>
          Crear factura
        </button>
      </div>

      {/* ================= LISTA ================= */}
      <div style={styles.card}>
        <h2>📁 Facturas</h2>

        {facturas.map((f) => (
          <div key={f.id}>
            {f.total} €

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
