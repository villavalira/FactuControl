import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);

  const [emisores, setEmisores] = useState([]);
  const [emisorSel, setEmisorSel] = useState(null);

  const [clientes, setClientes] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);

  const [facturas, setFacturas] = useState([]);

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

    loadAll(user.uid);
  };

  const saveCliente = async () => {
    await addDoc(collection(db, "clientes"), {
      uid: user.uid,
      ...clienteForm,
    });

    loadAll(user.uid);
  };

  /* ================= NUMERACIÓN ================= */
  const generarNumero = () => {
    if (!facturas.length) return "FAC-000001";

    const nums = facturas.map(f =>
      parseInt((f.numero || "FAC-0").replace("FAC-", ""))
    );

    const next = Math.max(...nums) + 1;
    return "FAC-" + String(next).padStart(6, "0");
  };

  /* ================= FACTURA ================= */
  const crearFactura = async () => {
    const numero = generarNumero();

    await addDoc(collection(db, "facturas"), {
      uid: user.uid,
      emisorId: emisorSel?.id,
      clienteId: clienteSel?.id,
      numero,
      concepto,
      base,
      iva,
      irpf,
      total,
      fecha: new Date().toLocaleDateString(),
    });

    loadAll(user.uid);
  };

  const getCliente = (id) => clientes.find(c => c.id === id);
  const getEmisor = (id) => emisores.find(e => e.id === id);

  /* ================= PDF SIMPLE (ESTABLE) ================= */
  const descargarPDF = (f) => {
    const pdf = new jsPDF();

    const em = getEmisor(f.emisorId);
    const cl = getCliente(f.clienteId);

    pdf.setFontSize(18);
    pdf.text("FACTURA", 20, 20);

    pdf.setFontSize(11);
    pdf.text(`Número: ${f.numero}`, 20, 30);
    pdf.text(`Fecha: ${f.fecha}`, 20, 36);

    pdf.text("EMISOR", 20, 50);
    pdf.text(em?.nombre || "", 20, 56);
    pdf.text(em?.nif || "", 20, 62);

    pdf.text("CLIENTE", 120, 50);
    pdf.text(cl?.nombre || "", 120, 56);
    pdf.text(cl?.email || "", 120, 62);

    pdf.text("CONCEPTO:", 20, 80);
    pdf.text(f.concepto || "", 20, 86);

    pdf.text(`Base: ${f.base} €`, 20, 100);
    pdf.text(`IVA: ${f.iva} €`, 20, 106);
    pdf.text(`IRPF: ${f.irpf} €`, 20, 112);

    pdf.setFontSize(14);
    pdf.text(`TOTAL: ${f.total} €`, 20, 125);

    pdf.save(`${f.numero}.pdf`);
  };

  /* ================= EXCEL ================= */
  const exportExcel = () => {
    const data = facturas.map(f => ({
      Numero: f.numero,
      Fecha: f.fecha,
      Concepto: f.concepto,
      Base: f.base,
      IVA: f.iva,
      IRPF: f.irpf,
      Total: f.total,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Facturas");
    XLSX.writeFile(wb, "facturas.xlsx");
  };

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

      <div style={styles.sidebar}>
        <h2>FactuControl</h2>

        <button style={styles.menu}>Emisor</button>
        <button style={styles.menu}>Clientes</button>
        <button style={styles.menu}>Facturas</button>

        <button onClick={logout} style={{ ...styles.menu, background: "#ef4444" }}>
          Logout
        </button>
      </div>

      <div style={styles.main}>

        <div style={styles.card}>
          <h3>Emisor</h3>

          <input style={styles.input} placeholder="Nombre"
            onChange={e => setEmisorForm({ ...emisorForm, nombre: e.target.value })}
          />

          <input style={styles.input} placeholder="NIF"
            onChange={e => setEmisorForm({ ...emisorForm, nif: e.target.value })}
          />

          <button style={styles.button} onClick={saveEmisor}>
            Guardar emisor
          </button>
        </div>

        <div style={styles.card}>
          <h3>Clientes</h3>

          <input style={styles.input} placeholder="Nombre"
            onChange={e => setClienteForm({ ...clienteForm, nombre: e.target.value })}
          />

          <input style={styles.input} placeholder="Email"
            onChange={e => setClienteForm({ ...clienteForm, email: e.target.value })}
          />

          <button style={styles.button} onClick={saveCliente}>
            Guardar cliente
          </button>
        </div>

        <div style={styles.card}>
          <h3>Factura</h3>

          <select onChange={(e) =>
            setEmisorSel(emisores.find(x => x.id === e.target.value))
          }>
            <option>Selecciona emisor</option>
            {emisores.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>

          <select onChange={(e) =>
            setClienteSel(clientes.find(x => x.id === e.target.value))
          }>
            <option>Selecciona cliente</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <input style={styles.input} placeholder="Concepto"
            onChange={e => setConcepto(e.target.value)}
          />

          <input style={styles.input} type="number"
            onChange={e => setBase(Number(e.target.value))}
          />

          <button style={styles.button} onClick={crearFactura}>
            Crear factura
          </button>
        </div>

        <div style={styles.card}>
          <h3>Facturas</h3>

          <button style={styles.button} onClick={exportExcel}>
            Exportar Excel
          </button>

          {facturas.map(f => (
            <div key={f.id} style={styles.row}>
              {f.numero} - {f.total}€

              <button onClick={() => descargarPDF(f)}>
                PDF
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ================= ESTILOS ESTABLES ================= */
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    fontFamily: "Inter, system-ui, sans-serif",
    background: "linear-gradient(135deg, #0b1220 0%, #0f172a 100%)",
    color: "#e5e7eb",
  },

  sidebar: {
    width: 240,
    background: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(12px)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderRight: "1px solid rgba(255,255,255,0.08)",
  },

  main: {
    flex: 1,
    padding: 30,
    overflowY: "auto",
  },

  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    backdropFilter: "blur(10px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },

  input: {
    width: "100%",
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#0b1220",
    color: "#fff",
    outline: "none",
  },

  button: {
    padding: "10px 14px",
    background: "linear-gradient(135deg, #6366f1, #3b82f6)",
    color: "white",
    border: 0,
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 10,
    fontWeight: 600,
    transition: "all 0.2s ease",
  },

  menu: {
    padding: 12,
    background: "rgba(255,255,255,0.05)",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "left",
    transition: "0.2s",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  login: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle at top, #0f172a, #0b1220)",
  },
};
