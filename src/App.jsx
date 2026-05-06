import { useEffect, useState } from "react";
            <input placeholder="Teléfono" style={styles.input} onChange={e=>setClienteForm({...clienteForm,telefono:e.target.value})}/>
            <button style={styles.button} onClick={saveCliente}>Guardar</button>
          </div>
        )}

        {/* FACTURAS */}
        {seccion === "facturas" && (
          <div style={styles.card}>
            <h3>Facturas</h3>

            <select onChange={e=>setEmisorSel(emisores.find(x=>x.id===e.target.value))}>
              <option>Emisor</option>
              {emisores.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>

            <select onChange={e=>setClienteSel(clientes.find(x=>x.id===e.target.value))}>
              <option>Cliente</option>
              {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <input placeholder="Concepto" style={styles.input} onChange={e=>setConcepto(e.target.value)}/>
            <input type="number" style={styles.input} onChange={e=>setBase(Number(e.target.value))}/>

            <p>Total: {total.toFixed(2)} €</p>

            <button style={styles.button} onClick={crearFactura}>Crear factura</button>

            {facturas.map(f=> (
              <div key={f.id} style={{ marginTop: 10 }}>
                {f.numero} - {f.total} €
                <button style={styles.button} onClick={()=>generarPDF(f)}>PDF</button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
