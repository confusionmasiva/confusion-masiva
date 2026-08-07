(() => {
  "use strict";

  const ENDPOINT_PEDIDOS = "https://script.google.com/macros/s/AKfycby1uOtObKx1ypo6iSODs8RAwly3xVjpsA40FW36iceSDyL98PnKVVo5gnSKhieHHcfhaQ/exec";
  const COMISION_MERCADO_PAGO = 0.08;
  const TALLES = ["S", "M", "L", "XL", "XXL", "XXXL"];
  const COLORES_PRENDA = ["Negro", "Blanco", "Gris", "Rojo", "Rosado", "Azul", "Verde"];
  const COLORES_ESTAMPADO = ["Blanco", "Negro"];
  const PRODUCTOS = {
    remera: { nombre: "Remera Confusión Masiva", precio: 800 },
    "remera-manga-larga": { nombre: "Remera de manga larga", precio: 900 },
    "canguro-diseno-1": { nombre: "Canguro - Diseño 1", precio: 1400 },
    "canguro-diseno-2": { nombre: "Canguro - Diseño 2", precio: 1400 }
  };

  let carrito = new URLSearchParams(window.location.search).get("pedido") === "confirmado" ? [] : cargarCarrito();
  const cantidad = document.getElementById("carritoCantidad");
  const items = document.getElementById("carritoItems");
  const resumen = document.getElementById("carritoResumen");
  const iniciarCompra = document.getElementById("iniciarCompra");
  const checkoutResumen = document.getElementById("checkoutResumen");
  const checkoutForm = document.getElementById("checkoutForm");
  const pedidoDatos = document.getElementById("pedidoDatos");
  const checkoutAviso = document.getElementById("checkoutAviso");

  if (!carrito.length) localStorage.removeItem("confusionMasivaCarrito");

  function cargarCarrito() {
    try {
      const guardado = JSON.parse(localStorage.getItem("confusionMasivaCarrito") || "[]");
      return Array.isArray(guardado) ? guardado.filter(item => PRODUCTOS[item.producto]) : [];
    } catch {
      return [];
    }
  }

  function guardarCarrito() {
    localStorage.setItem("confusionMasivaCarrito", JSON.stringify(carrito));
  }

  function dinero(valor) {
    return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(valor);
  }

  function calcularTotales() {
    const subtotal = carrito.reduce((total, item) => total + PRODUCTOS[item.producto].precio * item.cantidad, 0);
    const comision = Math.round(subtotal * COMISION_MERCADO_PAGO);
    return { subtotal, comision, total: subtotal + comision };
  }

  function llenarSelector(selector, opciones) {
    selector.innerHTML = opciones.map(opcion => `<option value="${opcion}">${opcion}</option>`).join("");
  }

  document.querySelectorAll(".producto-opciones").forEach(bloque => {
    llenarSelector(bloque.querySelector(".talle"), TALLES);
    llenarSelector(bloque.querySelector(".color-prenda"), COLORES_PRENDA);
    llenarSelector(bloque.querySelector(".color-estampa"), COLORES_ESTAMPADO);

    bloque.querySelector(".agregar-carrito").addEventListener("click", () => {
      const nuevo = {
        producto: bloque.dataset.producto,
        talle: bloque.querySelector(".talle").value,
        colorPrenda: bloque.querySelector(".color-prenda").value,
        colorEstampa: bloque.querySelector(".color-estampa").value,
        cantidad: 1
      };
      const existente = carrito.find(item => item.producto === nuevo.producto && item.talle === nuevo.talle && item.colorPrenda === nuevo.colorPrenda && item.colorEstampa === nuevo.colorEstampa);
      if (existente) existente.cantidad += 1;
      else carrito.push(nuevo);
      guardarCarrito();
      renderCarrito();
      bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("carritoPanel")).show();
    });
  });

  function renderCarrito() {
    const unidades = carrito.reduce((total, item) => total + item.cantidad, 0);
    cantidad.textContent = unidades;
    iniciarCompra.disabled = carrito.length === 0;

    if (!carrito.length) {
      items.innerHTML = '<p class="text-center text-light-emphasis">Todavía no agregaste productos.</p>';
      resumen.innerHTML = "";
      return;
    }

    items.innerHTML = carrito.map((item, indice) => {
      const producto = PRODUCTOS[item.producto];
      return `<article class="carrito-item">
        <div><strong>${producto.nombre}</strong><small>${item.talle} · Prenda ${item.colorPrenda} · Estampa ${item.colorEstampa}</small></div>
        <div class="carrito-item-controles">
          <button type="button" data-accion="restar" data-indice="${indice}" aria-label="Restar uno">−</button>
          <span>${item.cantidad}</span>
          <button type="button" data-accion="sumar" data-indice="${indice}" aria-label="Sumar uno">+</button>
          <button type="button" class="eliminar" data-accion="eliminar" data-indice="${indice}" aria-label="Eliminar producto">×</button>
        </div>
        <strong>${dinero(producto.precio * item.cantidad)}</strong>
      </article>`;
    }).join("");

    const totales = calcularTotales();
    resumen.innerHTML = `<div><span>Subtotal</span><strong>${dinero(totales.subtotal)}</strong></div>
      <div><span>Comisión de Mercado Pago (8%)</span><strong>${dinero(totales.comision)}</strong></div>
      <div><span>Envío</span><strong>Se coordina posteriormente</strong></div>
      <div class="carrito-total"><span>Total a pagar ahora</span><strong>${dinero(totales.total)}</strong></div>`;
  }

  items.addEventListener("click", event => {
    const boton = event.target.closest("button[data-accion]");
    if (!boton) return;
    const indice = Number(boton.dataset.indice);
    if (boton.dataset.accion === "sumar") carrito[indice].cantidad += 1;
    if (boton.dataset.accion === "restar") {
      carrito[indice].cantidad -= 1;
      if (carrito[indice].cantidad < 1) carrito.splice(indice, 1);
    }
    if (boton.dataset.accion === "eliminar") carrito.splice(indice, 1);
    guardarCarrito();
    renderCarrito();
  });

  document.getElementById("checkoutModal").addEventListener("show.bs.modal", () => {
    const totales = calcularTotales();
    checkoutResumen.innerHTML = `<h3 class="h5 text-start">Resumen</h3>${carrito.map(item => `<p class="mb-1">${item.cantidad} × ${PRODUCTOS[item.producto].nombre} — ${item.talle}, ${item.colorPrenda}, estampa ${item.colorEstampa}</p>`).join("")}<p class="fw-bold mt-3">Total con comisión de Mercado Pago (8%): ${dinero(totales.total)}</p><p class="small mb-0">El costo de envío se coordina posteriormente.</p>`;
  });

  iniciarCompra.addEventListener("click", () => {
    const panel = document.getElementById("carritoPanel");
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(panel);
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("checkoutModal"));

    if (panel.classList.contains("show")) {
      panel.addEventListener("hidden.bs.offcanvas", () => modal.show(), { once: true });
      offcanvas.hide();
    } else {
      modal.show();
    }
  });

  checkoutForm.addEventListener("submit", event => {
    if (ENDPOINT_PEDIDOS.startsWith("PEGAR_")) {
      event.preventDefault();
      checkoutAviso.textContent = "El formulario está listo, pero todavía falta publicar y conectar el servicio gratuito de Google Apps Script.";
      checkoutAviso.classList.remove("d-none");
      return;
    }
    if (!carrito.length) {
      event.preventDefault();
      return;
    }
    pedidoDatos.value = JSON.stringify({ items: carrito, totales: calcularTotales() });
    checkoutForm.action = ENDPOINT_PEDIDOS;
  });

  renderCarrito();
})();
