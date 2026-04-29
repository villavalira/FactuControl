import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import emailjs from "@emailjs/browser";

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

  /* ================= DATA ================= */
  const [emisores, setEmisores] = useState([]);
  const [emisorSel, setEmisorSel] = useState(null);

  const [clientes, setClientes] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);

  const [facturas, setFacturas] = useState([]);

  /* ================= FORMS ================= */
  const [emisorForm, setEmisorForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
    logo: "",
  });

  const [logo, setLogo] = useState(null);

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

    const emisoresData = e.docs.map(d => ({ id: d.id, ...d.data() }));
    const clientesData = c.docs.map(d => ({ id: d.id, ...d.data() }));
    const facturasData = f.docs.map(d => ({ id: d.id, ...d.data() }));

    setEmisores(emisoresData);
    setClientes(clientesData);
    setFacturas(facturasData);

    if (!emisorSel && emisoresData.length > 0) setEmisorSel(emisoresData[0]);
  };

  /* ================= LOGO ================= */
  const handleLogo = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  /* ================= SAVE ================= */
  const saveEmisor = async () => {
    await addDoc(collection(db, "emisores"), {
      uid: user.uid,
      ...emisorForm,
      logo,
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

  /* ================= FACTURA NUMERO ================= */
  const generarNumero = () => {
    if (!facturas.length) return "FAC-000001";

    const nums = facturas.map(f =>
      parseInt((f.numero || "FAC-0").replace("FAC-", ""))
    );

    const next = Math.max(...nums) + 1;
    return "FAC-" + String(next).padStart(6, "0");
  };

  /* ================= CREATE FACTURA ================= */
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

  /* ================= PDF PRO ================= */
  const descargarPDF = (f) => {
    const pdf = new jsPDF();

    const em = getEmisor(f.emisorId);
    const cl = getCliente(f.clienteId);

    pdf.setFontSize(18);
    pdf.text("FACTURA", 14, 18);

    pdf.setFontSize(10);
    pdf.text(f.numero, 14, 26);
    pdf.text(f.fecha, 14, 32);

    if (em?.logo) {
      pdf.addImage(em.logo, "PNG", 150, 10, 40, 40);
    }

    pdf.text("EMISOR", 14, 45);
    pdf.text(em?.nombre || "", 14, 50);
    pdf.text(em?.nif || "", 14, 55);

    pdf.text("CLIENTE", 110, 45);
    pdf.text(cl?.nombre || "", 110, 50);

    autoTable(pdf, {
      startY: 70,
      head: [["Concepto", "Base", "IVA", "IRPF", "Total"]],
      body: [[f.concepto, f.base, f.iva, f.irpf, f.total]],
      theme: "grid",
    });

    pdf.save(f.numero + ".pdf");
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

  /* ================= EMAIL ================= */
  const sendEmail = async (f) => {
    const cl = getCliente(f.clienteId);
    const em = getEmisor(f.emisorId);

    await emailjs.send(
      "TU_SERVICE_ID",
      "TU_TEMPLATE_ID",
      {
        to_email: cl.email,
        cliente: cl.nombre,
        empresa: em.nombre,
        numero: f.numero,
        total: f.total,
      },
      "TU_PUBLIC_KEY"
    );

    alert("Email enviado");
  };

  /* ================= UI ================= */
  if (!user) {
    return (
      <div style={styles.login}>
        <button onClick={login} style={styles.button}>
          Login con Google
        </button>
      </div>
    );
  }

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2>📊 FactuControl</h2>

        <button style={styles.menu}>Emisor</button>
        <button style={styles.menu}>Clientes</button>
        <button style={styles.menu}>Facturas</button>

        <button onClick={logout} style={{ ...styles.menu, background: "#ef4444" }}>
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        <h1>Dashboard</h1>

        {/* EMISOR */}
        <div style={styles.card}>
          <h3>🏢 Emisor</h3>

          <select onChange={(e) =>
            setEmisorSel(emisores.find(x => x.id === e.target.value))
          }>
            <option>Selecciona empresa</option>
            {emisores.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>

          <input style={styles.input} placeholder="Nombre"
            onChange={e => setEmisorForm({...emisorForm, nombre: e.target.value})}
          />

          <input style={styles.input} placeholder="NIF"
            onChange={e => setEmisorForm({...emisorForm, nif: e.target.value})}
          />

          <input type="file" onChange={handleLogo} />

          <button style={styles.button} onClick={saveEmisor}>
            Guardar
          </button>
        </div>

        {/* CLIENTES */}
        <div style={styles.card}>
          <h3>👥 Clientes</h3>

          <select onChange={(e) =>
            setClienteSel(clientes.find(x => x.id === e.target.value))
          }>
            <option>Selecciona cliente</option>
            {clientes.map(c => (
              <option key={c.id}>{c.nombre}</option>
            ))}
          </select>

          <input style={styles.input} placeholder="Nombre"
            onChange={e => setClienteForm({...clienteForm, nombre: e.target.value})}
          />

          <button style={styles.button} onClick={saveCliente}>
            Guardar
          </button>
        </div>

        {/* FACTURA */}
        <div style={styles.card}>
          <h3>🧾 Factura</h3>

          <input style={styles.input} placeholder="Concepto" onChange={e => setConcepto(e.target.value)} />
          <input style={styles.input} type="number" onChange={e => setBase(Number(e.target.value))} />

          <button style={styles.button} onClick={crearFactura}>
            Crear factura
          </button>
        </div>

        {/* LISTA */}
        <div style={styles.card}>
          <h3>📁 Facturas</h3>

          <button style={styles.button} onClick={exportExcel}>
            Excel
          </button>

          {facturas.map(f => (
            <div key={f.id} style={styles.row}>
              {f.numero} - {f.total}€

              <div>
                <button onClick={() => descargarPDF(f)}>PDF</button>
                <button onClick={() => sendEmail(f)}>Email</button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ================= STYLE ================= */
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    fontFamily: "Inter, system-ui, sans-serif",
    background: "#0b1220",
    color: "#e5e7eb",
  },

  sidebar: {
    width: 240,
    background: "#0f172a",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderRight: "1px solid rgba(255,255,255,0.05)",
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
    background: "#6366f1",
    color: "white",
    border: 0,
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 10,
    fontWeight: 600,
  },

  menu: {
    padding: 12,
    background: "transparent",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "left",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },

  login: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0b1220",
  },
};
