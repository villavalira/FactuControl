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
  /* ================= LOAD ================= */
 const loadEmisores = async (uid) => {
  const q = query(collection(db, "emisores"), where("uid", "==", uid));
  const snap = await getDocs(q);
  setEmisores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};

const loadClientes = async (uid) => {
  const q = query(collection(db, "clientes"), where("uid", "==", uid));
  const snap = await getDocs(q);
  setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};

const loadFacturas = async (uid) => {
  const q = query(collection(db, "facturas"), where("uid", "==", uid));
  const snap = await getDocs(q);
  setFacturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));

};


  /* ================= AUTH ================= */
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    console.log("AUTH STATE:", u);
    setUser(u);

    if (u?.uid) {
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
const loadAll = async (uid) => {
  const [e, c, f] = await Promise.all([
    getDocs(query(collection(db, "emisores"), where("uid", "==", uid))),
    getDocs(query(collection(db, "clientes"), where("uid", "==", uid))),
    getDocs(query(collection(db, "facturas"), where("uid", "==", uid))),
  ]);

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
const deleteEmisor = async (id) => {
  await deleteDoc(doc(db, "emisores", id));
  loadAll(user.uid); // ✅
};
  loadAll(user.uid); // 👈 dentro de la función
};
  /* ================= CLIENTE SAVE ================= */
const saveCliente = async () => {
  console.log("👉 CLICK CLIENTE");

  if (!user?.uid) {
    console.log("❌ user null");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "clientes"), {
      uid: user.uid,
      nombre: clienteForm.nombre || "",
      nif: clienteForm.nif || "",
      direccion: clienteForm.direccion || "",
      email: clienteForm.email || "",
      telefono: clienteForm.telefono || "",
      createdAt: new Date()
    });

    console.log("🎉 CLIENTE GUARDADO ID:", docRef.id);

    setClienteForm({
      nombre: "",
      nif: "",
      direccion: "",
      email: "",
      telefono: "",
    });

    loadAll(user.uid); // 👈 IMPORTANTE

  } catch (error) {
    console.error("🔥 ERROR CLIENTE:", error);
  }
};

const deleteCliente = async (id) => {
  await deleteDoc(doc(db, "clientes", id)); // 
  loadAll(user.uid); // 
};

/* ================= FACTURAS ================= */
{seccion === "facturas" && (
  <div style={styles.card}>
    <h3>Crear factura</h3>

    <p>Número: se generará al crear</p>

    {/* EMISOR */}
    <select
      style={styles.input}
      value={emisorSel?.id || ""}
      onChange={e => {
        const seleccionado = emisores.find(em => em.id === e.target.value);
        setEmisorSel(seleccionado);
      }}
    >
      <option value="">Emisor</option>
      {emisores.map(e => (
        <option key={e.id} value={e.id}>
          {e.nombre}
        </option>
      ))}
    </select>

    {/* CLIENTE (IMPORTANTE) */}
    <select
      style={styles.input}
      value={clienteSel?.id || ""}
      onChange={e => {
        const seleccionado = clientes.find(c => c.id === e.target.value);
        setClienteSel(seleccionado);
      }}
    >
      <option value="">Cliente</option>
      {clientes.map(c => (
        <option key={c.id} value={c.id}>
          {c.nombre}
        </option>
      ))}
    </select>

    <input
      style={styles.input}
      placeholder="Concepto"
      value={concepto}
      onChange={e => setConcepto(e.target.value)}
    />

    <input
      style={styles.input}
      type="number"
      placeholder="Base"
      value={base}
      onChange={e => setBase(Number(e.target.value))}
    />

    <p>IVA: {iva.toFixed(2)} €</p>
    <p>IRPF: {irpf.toFixed(2)} €</p>
    <p><b>Total: {total.toFixed(2)} €</b></p>

    <button style={styles.button} onClick={crearFactura}>
      Crear factura
    </button>

    <hr style={{ marginTop: 20 }} />

    <h3>Facturas creadas</h3>

    {facturas.length === 0 && <p>No hay facturas aún</p>}

    {facturas.map(f => (
      <div
        key={f.id}
        style={{
          background: "#fff",
          color: "#000",
          marginTop: 10,
          padding: 10,
          borderRadius: 8
        }}
      >
        <p><b>Nº:</b> {f.numero}</p>
        <p><b>Concepto:</b> {f.concepto}</p>
        <p><b>Total:</b> {f.total.toFixed(2)} €</p>

        <button onClick={() => generarPDF(f)}>
          Descargar PDF
        </button>
      </div>
    ))}
  </div>
)}
   
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
 /* ================= generar pdf ================= */
  const generarPDF = (f) => {
  const doc = new jsPDF();

  doc.text(`FACTURA Nº: ${f.numero}`, 10, 10);
  doc.text(`Concepto: ${f.concepto}`, 10, 20);
  doc.text(`Base: ${f.base} €`, 10, 30);
  doc.text(`IVA: ${f.iva.toFixed(2)} €`, 10, 40);
  doc.text(`IRPF: ${f.irpf.toFixed(2)} €`, 10, 50);
  doc.text(`TOTAL: ${f.total.toFixed(2)} €`, 10, 60);

  doc.save(`factura-${f.numero}.pdf`);
};
 
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

    <span>{e.nombre}</span>

    <button
      style={{ padding: "6px 10px", borderRadius: 6, background: "#ef4444", color: "#fff", border: "none" }}
      onClick={() => deleteEmisor(e.id)}
    >
      Borrar
    </button>

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
         {seccion === "clientes" && (
          <div style={styles.card}>
            <h3>Clientes</h3>

{clientes.map(c => (
  <div key={c.id} style={styles.row}>

    <span>{c.nombre}</span>

    <button
      style={{ padding: "6px 10px", borderRadius: 6, background: "#ef4444", color: "#fff", border: "none" }}
      onClick={() => deleteCliente(c.id)}
    >
      Borrar
    </button>

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

            <p>Número: se generará al crear la factura</p>

           <select
  style={styles.input}
  value={emisorSel?.id || ""}
  onChange={e => {
    const seleccionado = emisores.find(em => em.id === e.target.value);
    setEmisorSel(seleccionado);
  }}
>
  <option value="">Emisor</option>
  {emisores.map(e => (
    <option key={e.id} value={e.id}>
      {e.nombre}
    </option>
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
             <hr style={{ marginTop: 20 }} />

<h3>Facturas creadas</h3>

{facturas.length === 0 && <p>No hay facturas aún</p>}

{facturas.map(f => (
  <div key={f.id} style={{
    background: "#fff",
    color: "#000",
    marginTop: 10,
    padding: 10,
    borderRadius: 8
  }}>

    <p><b>Nº:</b> {f.numero}</p>
    <p><b>Concepto:</b> {f.concepto}</p>
    <p><b>Total:</b> {f.total.toFixed(2)} €</p>

    <button
      style={{ marginTop: 8 }}
      onClick={() => generarPDF(f)}
    >
      Descargar PDF
    </button>

  </div>
))}
           
          </div>
        )}

      </div>
    </div>
  );
}

/* ================= ESTILOS (NO TOCADOS) ================= */
const styles = {
  app: { display: "flex", minHeight: "100vh", fontFamily: "Arial", background: "#834fcd", color: "#fff" },
  sidebar: { width: 200, background: "#791f8f", padding: 20, display: "flex", flexDirection: "column", gap: 10 },
  main: { flex: 1, padding: 30 },
  card: { background: "#e2a9f1", color: "#000", padding: 20, borderRadius: 14 },
  input: { width: "85%", padding: 10, margin: "6px 0", borderRadius: 8 },
  button: { padding: 10, background: "#3b82f6", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" },
  menu: { padding: 10, background: "#e482da", border: 0, borderRadius: 8, fontWeight: "bold" },
  row: {display: "flex",   alignItems: "center", justifyContent: "flex-start", padding: 8, gap: 12 },
  sidebarTitle: { color: 'white', fontSize: '30px', fontWeight: 'bold' },
  login: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
};
