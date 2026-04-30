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
} from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);

  /* ================= EMISORES ================= */
  const [emisores, setEmisores] = useState([]);
  const [emisorSel, setEmisorSel] = useState(null);

  const [emisorForm, setEmisorForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    email: "",
    telefono: "",
  });

  /* ================= CLIENTES ================= */
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

    /* ================= SAVE EMISOR ================= */
  const saveEmisor = async () => {
    console.log("CLICK EMISOR");

    if (!user?.uid) {
      console.log("Usuario no disponible");
      return;
    }

    try {
      console.log("Guardando emisor:", emisorForm);

      await addDoc(collection(db, "emisores"), {
        uid: user.uid,
        ...emisorForm,
      });

      console.log("Emisor guardado OK");

      setEmisorForm({
        nombre: "",
        nif: "",
        direccion: "",
        email: "",
        telefono: "",
      });

      loadAll(user.uid);
    } catch (error) {
      console.error("Error guardando emisor:", error);
    }
  };

  /* ================= SAVE CLIENTE ================= */
  const saveCliente = async () => {
    console.log("CLICK CLIENTE");

    if (!user?.uid) {
      console.log("Usuario no disponible");
      return;
    }

    try {
      console.log("Guardando cliente:", clienteForm);

      await addDoc(collection(db, "clientes"), {
        uid: user.uid,
        ...clienteForm,
      });

      console.log("Cliente guardado OK");

      setClienteForm({
        nombre: "",
        dni: "",
        direccion: "",
        email: "",
        telefono: "",
      });

      loadAll(user.uid);
    } catch (error) {
      console.error("Error guardando cliente:", error);
    }
  };
  /* ================= NUMERACIÓN ================= */
  const generarNumero = () => {
    if (!facturas.length) return "FAC-000001";

    const nums = facturas.map(f =>
      parseInt((f.numero || "FAC-0").replace("FAC-", ""))
    );

    return "FAC-" + String(Math.max(...nums) + 1).padStart(6, "0");
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

  /* ================= PDF ================= */
  const descargarPDF = (f) => {
    const pdf = new jsPDF();

    const em = emisores.find(e => e.id === f.emisorId);
    const cl = clientes.find(c => c.id === f.clienteId);

    pdf.setFontSize(18);
    pdf.text("FACTURA", 20, 20);

    pdf.setFontSize(11);
    pdf.text(`Número: ${f.numero}`, 20, 30);
    pdf.text(`Fecha: ${f.fecha}`, 20, 36);

    pdf.text("EMISOR", 20, 50);
    pdf.text(`Nombre: ${em?.nombre}`, 20, 56);
    pdf.text(`NIF: ${em?.nif}`, 20, 62);
    pdf.text(`Email: ${em?.email}`, 20, 68);
    pdf.text(`Tel: ${em?.telefono}`, 20, 74);

    pdf.text("CLIENTE", 120, 50);
    pdf.text(`Nombre: ${cl?.nombre}`, 120, 56);
    pdf.text(`Email: ${cl?.email}`, 120, 62);
    pdf.text(`Tel: ${cl?.telefono}`, 120, 68);

    pdf.text(`Concepto: ${f.concepto}`, 20, 90);

    pdf.text(`Base: ${f.base} €`, 20, 110);
    pdf.text(`IVA: ${f.iva} €`, 20, 116);
    pdf.text(`IRPF: ${f.irpf} €`, 20, 122);

    pdf.setFontSize(14);
    pdf.text(`TOTAL: ${f.total} €`, 20, 135);

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
        <h2 style={styles.sidebarTitle}>FactuControl</h2>

        <button style={styles.menu}>Emisor</button>
        <button style={styles.menu}>Clientes</button>
        <button style={styles.menu}>Facturas</button>

        <button onClick={logout} style={{ ...styles.menu, background: "#ef4444" }}>
          Logout
        </button>
      </div>

      <div style={styles.main}>

        {/* EMISOR */}
        <div style={styles.card}>
          <h3>Emisor</h3>

          <input style={styles.input} placeholder="Nombre"
            value={emisorForm.nombre}
            onChange={e => setEmisorForm({ ...emisorForm, nombre: e.target.value })}
          />

          <input style={styles.input} placeholder="NIF"
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

       {/* CLIENTE */}
<div style={styles.card}>
  <h3>Clientes</h3>

  <input
    style={styles.input}
    placeholder="Nombre"
    value={clienteForm.nombre}
    onChange={e =>
      setClienteForm({ ...clienteForm, nombre: e.target.value })
    }
  />

  <input
    style={styles.input}
    placeholder="DNI"
    value={clienteForm.dni}
    onChange={e =>
      setClienteForm({ ...clienteForm, dni: e.target.value })
    }
  />

  <input
    style={styles.input}
    placeholder="Dirección"
    value={clienteForm.direccion}
    onChange={e =>
      setClienteForm({ ...clienteForm, direccion: e.target.value })
    }
  />

  <input
    style={styles.input}
    placeholder="Email"
    value={clienteForm.email}
    onChange={e =>
      setClienteForm({ ...clienteForm, email: e.target.value })
    }
  />

  <input
    style={styles.input}
    placeholder="Teléfono"
    value={clienteForm.telefono}
    onChange={e =>
      setClienteForm({ ...clienteForm, telefono: e.target.value })
    }
  />

  <button style={styles.button} onClick={saveCliente}>
    Guardar cliente
  </button>
</div> 

        {/* FACTURAS */}
        <div style={styles.card}>
          <h3>Factura</h3>

          <select onChange={(e) =>
            setEmisorSel(emisores.find(x => x.id === e.target.value))
          }>
            <option value="">Selecciona emisor</option>
            {emisores.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>

          <select onChange={(e) =>
            setClienteSel(clientes.find(x => x.id === e.target.value))
          }>
            <option value="">Selecciona cliente</option>
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

          <button style={styles.button} onClick={exportExcel}>
            Exportar Excel
          </button>
        </div>

        {/* LISTA */}
        <div style={styles.card}>
          <h3>Facturas</h3>

          {facturas.map(f => (
            <div key={f.id} style={styles.row}>
              {f.numero} - {f.total}€
              <button onClick={() => descargarPDF(f)}>PDF</button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ================= ESTILOS ================= */
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
    fontWeight: "bold",
    fontWeight: 600,
letterSpacing: 0.3,
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
  marginBottom: 20
},
  login: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};
