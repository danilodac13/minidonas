/* =========================================================
   MINI DONAS LEIDY — Configurador de pedidos
   Vanilla JS, sin dependencias.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. CONFIGURACIÓN DEL NEGOCIO ---------- */

  const NEGOCIO = {
    nombre: 'Mini Donas Leidy',
    // Número en formato internacional de Colombia (57 + 10 dígitos, sin guiones ni espacios)
    whatsapp: '573113926463',
    whatsappVisible: '311 392 6463'
  };

  /* Presentaciones disponibles.
     Para agregar una nueva: añade un objeto con la misma forma. */
  const productos = [
    { cantidad: 6,  precio: 10000, maxSalsas: 2, maxToppings: 2, etiqueta: 'Ideal para compartir', destacada: false },
    { cantidad: 12, precio: 18000, maxSalsas: 3, maxToppings: 3, etiqueta: 'La favorita',       destacada: true  },
    { cantidad: 20, precio: 28000, maxSalsas: 4, maxToppings: 4, etiqueta: 'Para reuniones',     destacada: false },
    { cantidad: 24, precio: 32000, maxSalsas: 4, maxToppings: 5, etiqueta: 'La más grande',      destacada: false }
  ];

  /* Salsas. `imagen` apunta a un archivo reemplazable en assets/img/. */
  const salsas = [
    { id: 'arequipe',           nombre: 'Arequipe',           imagen: 'assets/img/salsa-arequipe.svg' },
    { id: 'mora',               nombre: 'Mora',               imagen: 'assets/img/salsa-mora.svg' },
    { id: 'leche-condensada',   nombre: 'Leche Condensada',   imagen: 'assets/img/salsa-leche-condensada.svg' },
    { id: 'chocolate',          nombre: 'Chocolate',          imagen: 'assets/img/salsa-chocolate.svg' }
  ];

  /* Toppings. Para agregar más: añade un objeto { id, nombre, imagen }. */
  const toppings = [
    { id: 'oreo',                 nombre: 'Oreo',                 imagen: 'assets/img/topping-oreo.svg' },
    { id: 'mini-masmelos',        nombre: 'Mini Masmelos',        imagen: 'assets/img/topping-mini-masmelos.svg' },
    { id: 'mani',                 nombre: 'Maní',                 imagen: 'assets/img/topping-mani.svg' },
    { id: 'galletitas-mini-chips', nombre: 'Galletas Mini Chips',  imagen: 'assets/img/topping-galletas-mini-chips.svg' },
    { id: 'mms',                  nombre: "M&M's",                imagen: 'assets/img/topping-mms.svg' },
    { id: 'chips-chocolate',      nombre: 'Chips de Chocolate',   imagen: 'assets/img/topping-chips-chocolate.svg' },
    { id: 'leche-en-polvo',       nombre: 'Leche en Polvo',       imagen: 'assets/img/topping-leche-en-polvo.svg' },
    { id: 'fresa',                nombre: 'Fresa',                imagen: 'assets/img/topping-fresa.svg' }
  ];

  const MODALIDADES = {
    recoger:   { etiqueta: 'Recoger',   icono: '🛍️' },
    domicilio: { etiqueta: 'Domicilio', icono: '🚗' }
  };

  /* ---------- 2. UTILIDADES ---------- */

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /** Formatea un número a pesos Colombian: 18000 -> "$18.000" */
  const formatPrecio = (valor) => '$' + Math.round(valor).toLocaleString('es-CO');

  /** Convierte "17:30" en "5:30 PM" */
  function formatHora12(hora) {
    if (!hora || !/^\d{2}:\d{2}$/.test(hora)) return '';
    const [h, m] = hora.split(':').map(Number);
    const sufijo = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + sufijo;
  }

  /** Crea un elemento con clase, texto y atributos en una sola llamada. */
  function el(tag, className, texto) {
    const nodo = document.createElement(tag);
    if (className) nodo.className = className;
    if (texto != null) nodo.textContent = texto;
    return nodo;
  }

  /* ---------- 3. ESTADO DEL PEDIDO ---------- */

  const estado = {
    paso: 1,
    producto: null,      // objeto de productos seleccionado
    salsas: [],          // ids
    toppings: [],        // ids
    modalidad: null      // 'recoger' | 'domicilio'
  };

  const MAX_PASO = 4;

  const productoPorCantidad = (cantidad) =>
    productos.find((p) => p.cantidad === Number(cantidad)) || null;

  const salsaPorId     = (id) => salsas.find((s) => s.id === id);
  const toppingPorId   = (id) => toppings.find((t) => t.id === id);
  const nombreDeSalsa   = (id) => (salsaPorId(id)   ? salsaPorId(id).nombre   : id);
  const nombreDeTopping = (id) => (toppingPorId(id) ? toppingPorId(id).nombre : id);

  /** Nombre legible de una salsa o un topping, buscando en ambas listas. */
  function nombreDe(id) {
    const salsa = salsaPorId(id);
    if (salsa) return salsa.nombre;
    const topping = toppingPorId(id);
    return topping ? topping.nombre : id;
  }

  /* ---------- 4. NOTIFICACIONES (reemplazan a window.alert) ---------- */

  const contenedorToasts = $('#toasts');

  function notificar(mensaje, tipo) {
    if (!contenedorToasts) return;
    const clase = tipo || 'info';
    const icono = { info: '💡', warn: '⚠️', error: '❗', success: '✅' }[clase] || '💡';

    const toast = el('div', 'toast toast--' + clase);
    toast.setAttribute('role', clase === 'error' ? 'alert' : 'status');
    toast.appendChild(el('span', 'toast__icon', icono));
    toast.appendChild(el('span', 'toast__text', mensaje));
    contenedorToasts.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('is-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 3400);
  }

  /* ---------- 5. RENDER: PRESENTACIONES ---------- */

  const gridPresentaciones = $('#presentaciones-grid');

  function renderPresentaciones() {
    gridPresentaciones.innerHTML = '';

    productos.forEach((prod) => {
      const card = el('article', 'present-card');
      card.dataset.cantidad = prod.cantidad;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label',
        'Elegir presentación de ' + prod.cantidad + ' mini donas por ' + formatPrecio(prod.precio));

      if (prod.destacada) card.appendChild(el('span', 'present-card__tag', prod.etiqueta));

      const img = el('img', 'present-card__img');
      img.src = 'assets/img/presentacion-x' + prod.cantidad + '.svg';
      img.alt = 'Caja de ' + prod.cantidad + ' mini donas';
      img.width = 520;
      img.height = 160;
      img.loading = 'lazy';
      card.appendChild(img);

      card.appendChild(el('h3', 'present-card__name', 'Donas x' + prod.cantidad));
      card.appendChild(el('p', 'present-card__price', formatPrecio(prod.precio)));

      const incluye = el('ul', 'present-card__includes');
      incluye.appendChild(el('li', 'present-card__chip', prod.maxSalsas + (prod.maxSalsas === 1 ? ' salsa' : ' salsas')));
      incluye.appendChild(el('li', 'present-card__chip present-card__chip--pink',
        prod.maxToppings + (prod.maxToppings === 1 ? ' topping' : ' toppings')));
      card.appendChild(incluye);

      const btn = el('button', 'btn btn--ghost btn--block', 'Elegir');
      btn.type = 'button';
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        seleccionarProducto(prod.cantidad, { mover: true, anunciar: true });
      });
      card.appendChild(btn);

      card.addEventListener('click', () => seleccionarProducto(prod.cantidad, { mover: true, anunciar: true }));
      card.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          seleccionarProducto(prod.cantidad, { mover: true, anunciar: true });
        }
      });

      gridPresentaciones.appendChild(card);
    });
  }

  function marcarPresentacionActiva() {
    $$('.present-card').forEach((card) => {
      const activo = estado.producto && Number(card.dataset.cantidad) === estado.producto.cantidad;
      card.classList.toggle('is-selected', !!activo);
      card.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
  }

  /* ---------- 6. RENDER: PASO 1 (cantidad) ---------- */

  const opcionesQty = $('#options-qty');

  function renderOpcionesCantidad() {
    opcionesQty.innerHTML = '';

    productos.forEach((prod) => {
      const btn = el('button', 'qty-option');
      btn.type = 'button';
      btn.dataset.cantidad = prod.cantidad;
      btn.setAttribute('aria-pressed', 'false');

      btn.appendChild(el('span', 'qty-option__name', prod.cantidad + ' mini donas'));
      btn.appendChild(el('span', 'qty-option__price', formatPrecio(prod.precio)));
      btn.appendChild(el('span', 'qty-option__meta',
        'Incluye ' + prod.maxSalsas + ' salsas y ' + prod.maxToppings + ' toppings'));
      btn.appendChild(el('span', 'qty-option__check'));

      btn.addEventListener('click', () => seleccionarProducto(prod.cantidad));
      opcionesQty.appendChild(btn);
    });

    marcarCantidadActiva();
  }

  function marcarCantidadActiva() {
    $$('.qty-option').forEach((btn) => {
      const activo = estado.producto && Number(btn.dataset.cantidad) === estado.producto.cantidad;
      btn.classList.toggle('is-selected', !!activo);
      btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
  }

  /* ---------- 7. RENDER: PASO 2 (salsas y toppings) ---------- */

  const gridSalsas   = $('#salsas-grid');
  const gridToppings = $('#toppings-grid');
  const contSalsas   = $('#salsas-counter');
  const contToppings = $('#toppings-counter');

  function renderSalsas() {
    gridSalsas.innerHTML = '';
    salsas.forEach((s) => {
      const btn = el('button', 'salsa-option');
      btn.type = 'button';
      btn.dataset.id = s.id;
      btn.setAttribute('aria-pressed', 'false');

      const img = el('img');
      img.src = s.imagen;
      img.alt = 'Salsa de ' + s.nombre;
      img.width = 120; img.height = 120; img.loading = 'lazy';
      btn.appendChild(img);

      btn.appendChild(el('span', 'salsa-option__name', s.nombre));
      btn.appendChild(el('span', 'check'));

      btn.addEventListener('click', () => alternarSalsa(s.id));
      gridSalsas.appendChild(btn);
    });
    actualizarEstadoSalsas();
  }

  function renderToppings() {
    gridToppings.innerHTML = '';
    toppings.forEach((t) => {
      const btn = el('button', 'topping-option');
      btn.type = 'button';
      btn.dataset.id = t.id;
      btn.setAttribute('aria-pressed', 'false');

      const img = el('img');
      img.src = t.imagen;
      img.alt = 'Topping de ' + t.nombre;
      img.width = 120; img.height = 120; img.loading = 'lazy';
      btn.appendChild(img);

      btn.appendChild(el('span', 'topping-option__name', t.nombre));
      btn.appendChild(el('span', 'check'));

      btn.addEventListener('click', () => alternarTopping(t.id));
      gridToppings.appendChild(btn);
    });
    actualizarEstadoToppings();
  }

  /** Recorta selecciones que superen el límite de la presentación actual. */
  function normalizarSelecciones() {
    if (!estado.producto) return;
    if (estado.salsas.length   > estado.producto.maxSalsas)   estado.salsas   = estado.salsas.slice(0, estado.producto.maxSalsas);
    if (estado.toppings.length > estado.producto.maxToppings) estado.toppings = estado.toppings.slice(0, estado.producto.maxToppings);
  }

  function actualizarEstadoSalsas() {
    const max = estado.producto ? estado.producto.maxSalsas : 0;
    const elegidas = estado.salsas.length;
    const lleno = max > 0 && elegidas >= max;

    $$('.salsa-option').forEach((btn) => {
      const seleccionada = estado.salsas.indexOf(btn.dataset.id) !== -1;
      btn.classList.toggle('is-selected', seleccionada);
      btn.classList.toggle('is-disabled', !seleccionada && lleno);
      btn.setAttribute('aria-pressed', seleccionada ? 'true' : 'false');
      btn.setAttribute('aria-disabled', (!seleccionada && lleno) ? 'true' : 'false');
    });

    contSalsas.textContent = 'Salsas seleccionadas: ' + elegidas + ' / ' + max;
    contSalsas.classList.toggle('is-full', lleno);
  }

  function actualizarEstadoToppings() {
    const max = estado.producto ? estado.producto.maxToppings : 0;
    const elegidas = estado.toppings.length;
    const lleno = max > 0 && elegidas >= max;

    $$('.topping-option').forEach((btn) => {
      const seleccionada = estado.toppings.indexOf(btn.dataset.id) !== -1;
      btn.classList.toggle('is-selected', seleccionada);
      btn.classList.toggle('is-disabled', !seleccionada && lleno);
      btn.setAttribute('aria-pressed', seleccionada ? 'true' : 'false');
      btn.setAttribute('aria-disabled', (!seleccionada && lleno) ? 'true' : 'false');
    });

    contToppings.textContent = 'Toppings seleccionados: ' + elegidas + ' / ' + max;
    contToppings.classList.toggle('is-full', lleno);
  }

  function alternarSalsa(id) {
    if (!estado.producto) {
      notificar('Primero elige la cantidad de mini donas.', 'warn');
      return;
    }
    const i = estado.salsas.indexOf(id);
    if (i !== -1) {
      estado.salsas.splice(i, 1);
    } else if (estado.salsas.length >= estado.producto.maxSalsas) {
      notificar('Has alcanzado el máximo de salsas para este pedido.', 'warn');
      return;
    } else {
      estado.salsas.push(id);
    }
    actualizarEstadoSalsas();
    actualizarResumen();
  }

  function alternarTopping(id) {
    if (!estado.producto) {
      notificar('Primero elige la cantidad de mini donas.', 'warn');
      return;
    }
    const i = estado.toppings.indexOf(id);
    if (i !== -1) {
      estado.toppings.splice(i, 1);
    } else if (estado.toppings.length >= estado.producto.maxToppings) {
      notificar('Has alcanzado el máximo de toppings para este pedido.', 'warn');
      return;
    } else {
      estado.toppings.push(id);
    }
    actualizarEstadoToppings();
    actualizarResumen();
  }

  /* ---------- 8. SELECCIÓN DE PRODUCTO ---------- */

  function seleccionarProducto(cantidad, opciones) {
    const cfg = opciones || {};
    const producto = productoPorCantidad(cantidad);
    if (!producto) return;

    const cambio = !estado.producto || estado.producto.cantidad !== producto.cantidad;
    estado.producto = producto;

    // Si se reduce el tamaño de la caja, se recortan las selections sobrantes.
    if (cambio) normalizarSelecciones();

    marcarCantidadActiva();
    marcarPresentacionActiva();
    actualizarEstadoSalsas();
    actualizarEstadoToppings();
    actualizarResumen();

    if (cfg.anunciar) {
      notificar('Presentación de ' + producto.cantidad + ' mini donas seleccionada. Puedes personalizarla en el paso 2.', 'success');
    }
    if (cfg.mover) {
      irAlPaso(2);
      desplazarA('arma-tu-pedido');
    }
  }

  /* ---------- 9. PASO 3: ENTREGA ---------- */

  function actualizarModalidad() {
    $$('.mode').forEach((btn) => {
      const activo = btn.dataset.mode === estado.modalidad;
      btn.classList.toggle('is-selected', activo);
      btn.setAttribute('aria-checked', activo ? 'true' : 'false');
    });
    $('#fields-domicilio').hidden = estado.modalidad !== 'domicilio';
    limpiarErrores();
  }

  $$('.mode').forEach((btn) => {
    btn.addEventListener('click', () => {
      estado.modalidad = btn.dataset.mode;
      actualizarModalidad();
      actualizarResumen();
    });
  });

  /* ---------- 10. RESUMEN ---------- */

  const resumenBody      = $('#summary-body');
  const resumenEmpty     = $('#summary-empty');
  const resumenBodyMovil = $('#summary-body-mobile');
  const mobileTotal      = $('#mobile-total');

  function crearGrupoResumen(etiqueta) {
    const grupo = el('div', 'summary__group');
    grupo.appendChild(el('div', 'summary__label', etiqueta));
    return grupo;
  }

  function crearListaResumen(valores) {
    if (!valores.length) {
      return el('div', 'summary__list summary__empty-line', 'Sin elegir aún');
    }
    const ul = el('ul', 'summary__list');
    valores.forEach((v) => ul.appendChild(el('li', null, v)));
    return ul;
  }

  /** Construye el contenido de "TU PEDIDO" una sola vez y lo clona donde haga falta. */
  function construirResumenHTML() {
    const cont = el('div');

    // Mini donas
    const gDona = crearGrupoResumen('Mini donas');
    gDona.appendChild(el('div', 'summary__value',
      estado.producto ? 'x' + estado.producto.cantidad : 'Sin elegir'));
    cont.appendChild(gDona);

    // Precio
    const gPrecio = crearGrupoResumen('Precio');
    gPrecio.appendChild(el('div', 'summary__value summary__price',
      estado.producto ? formatPrecio(estado.producto.precio) : '$0'));
    cont.appendChild(gPrecio);

    // Salsas
    const gSalsas = crearGrupoResumen('Salsas');
    gSalsas.appendChild(crearListaResumen(estado.salsas.map(nombreDeSalsa)));
    cont.appendChild(gSalsas);

    // Toppings
    const gToppings = crearGrupoResumen('Toppings');
    gToppings.appendChild(crearListaResumen(estado.toppings.map(nombreDeTopping)));
    cont.appendChild(gToppings);

    // Entrega
    const gEntrega = crearGrupoResumen('Entrega');
    gEntrega.appendChild(el('div', 'summary__value',
      estado.modalidad ? MODALIDADES[estado.modalidad].icono + ' ' + MODALIDADES[estado.modalidad].etiqueta : 'Sin elegir'));
    cont.appendChild(gEntrega);

    // Total
    const total = el('div', 'summary__total');
    total.appendChild(el('span', null, 'Total'));
    total.appendChild(el('strong', null, estado.producto ? formatPrecio(estado.producto.precio) : '$0'));
    cont.appendChild(total);

    // Aviso de selections pendientes
    const faltan = faltantes();
    if (faltan.length) cont.appendChild(el('p', 'summary__hint', 'Te falta: ' + faltan.join(' y ') + '.'));

    return cont;
  }

  function actualizarResumen() {
    const html = construirResumenHTML();
    const hayPedido = !!estado.producto;

    if (resumenBody) {
      resumenBody.innerHTML = '';
      resumenBody.appendChild(html.cloneNode(true));
      resumenBody.classList.toggle('is-visible', hayPedido);
    }
    if (resumenEmpty) resumenEmpty.hidden = hayPedido;

    // Móvil: la hoja inferior reutiliza el mismo resumen
    if (resumenBodyMovil) {
      resumenBodyMovil.innerHTML = '';
      if (hayPedido) {
        const card = el('div', 'summary__card');
        card.appendChild(html.cloneNode(true));
        resumenBodyMovil.appendChild(card);
      } else {
        resumenBodyMovil.appendChild(el('p', 'summary__empty', 'Aún no has elegido nada.'));
      }
    }
    if (mobileTotal) mobileTotal.textContent = estado.producto ? formatPrecio(estado.producto.precio) : '$0';

    actualizarConfirmacion();
    actualizarBarraMovil();
  }

  /* Lista de lo que falta para poder continuar. */
  function faltantes() {
    const f = [];
    if (!estado.producto) {
      f.push('elige la cantidad');
      return f;
    }
    const faltanSalsas = estado.producto.maxSalsas - estado.salsas.length;
    const faltanToppings = estado.producto.maxToppings - estado.toppings.length;
    if (faltanSalsas > 0) f.push('elige ' + faltanSalsas + (faltanSalsas === 1 ? ' salsa' : ' salsas'));
    if (faltanToppings > 0) f.push('elige ' + faltanToppings + (faltanToppings === 1 ? ' topping' : ' toppings'));
    return f;
  }

  /* ---------- 11. PASO 4: CONFIRMACIÓN ---------- */

  function valor(id) {
    const nodo = document.getElementById(id);
    return nodo ? nodo.value.trim() : '';
  }

  function filaConfirmacion(etiqueta, contenido) {
    const fila = el('div', 'confirm__row');
    fila.appendChild(el('span', null, etiqueta));
    fila.appendChild(el('strong', null, contenido || '—'));
    return fila;
  }

  function actualizarConfirmacion() {
    const cont = $('#confirm');
    if (!cont) return;
    cont.innerHTML = '';

    // Producto
    const c1 = el('div', 'confirm__card');
    c1.appendChild(el('h4', null, 'Tu pedido'));
    c1.appendChild(filaConfirmacion('Mini donas', estado.producto ? 'x' + estado.producto.cantidad : '—'));
    c1.appendChild(filaConfirmacion('Salsas incluidas', estado.producto ? estado.producto.maxSalsas : '—'));
    c1.appendChild(filaConfirmacion('Toppings incluidos', estado.producto ? estado.producto.maxToppings : '—'));
    cont.appendChild(c1);

    // Personalización
    const c2 = el('div', 'confirm__card');
    c2.appendChild(el('h4', null, 'Salsas y toppings'));
    const etiquetas = el('div', 'tag-list');
    estado.salsas.concat(estado.toppings).forEach((id) => {
      etiquetas.appendChild(el('span', 'tag', nombreDe(id)));
    });
    c2.appendChild(etiquetas);
    cont.appendChild(c2);

    // Entrega
    const c3 = el('div', 'confirm__card');
    c3.appendChild(el('h4', null, 'Entrega'));
    c3.appendChild(filaConfirmacion('Modalidad',
      estado.modalidad ? MODALIDADES[estado.modalidad].etiqueta : '—'));
    c3.appendChild(filaConfirmacion('Quien pide', valor('nombre') || '—'));
    if (estado.modalidad === 'domicilio') {
      c3.appendChild(filaConfirmacion('Quien recibe', valor('recibe') || '—'));
      c3.appendChild(filaConfirmacion('Dirección', valor('direccion') || '—'));
      c3.appendChild(filaConfirmacion('Barrio', valor('barrio') || '—'));
      if (valor('referencia')) c3.appendChild(filaConfirmacion('Referencia', valor('referencia')));
    }
    c3.appendChild(filaConfirmacion('Hora', formatHora12(valor('hora')) || '—'));
    cont.appendChild(c3);

    // Observaciones
    if (valor('observaciones')) {
      const c4 = el('div', 'confirm__card');
      c4.appendChild(el('h4', null, 'Observaciones'));
      c4.appendChild(el('p', null, valor('observaciones')));
      cont.appendChild(c4);
    }

    // Total
    const total = el('div', 'confirm__total');
    total.appendChild(el('span', null, 'Total a pagar'));
    total.appendChild(el('strong', null, estado.producto ? formatPrecio(estado.producto.precio) : '$0'));
    cont.appendChild(total);
  }

  /* ---------- 12. VALIDACIONES ---------- */

  const CAMPOS_OBLIGATORIOS = {
    nombre: 'Escribe el nombre de quien realiza el pedido.',
    recibe: 'Escribe el nombre de quien recibe el pedido.',
    direccion: 'Escribe la dirección donde entregamos tu pedido.',
    barrio: 'Escribe el barrio de la entrega.',
    hora: 'Elige la hora de entrega o de recolección.'
  };

  function mostrarError(campo, mensaje) {
    const input = document.getElementById(campo);
    const destino = $('[data-error-for="' + campo + '"]');
    if (input) input.closest('.field').classList.add('is-invalid');
    if (destino) destino.textContent = mensaje;
  }

  function limpiarError(campo) {
    const input = document.getElementById(campo);
    const destino = $('[data-error-for="' + campo + '"]');
    if (input) input.closest('.field').classList.remove('is-invalid');
    if (destino) destino.textContent = '';
  }

  function limpiarErrores() {
    $$('.field.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
    $$('[data-error-for]').forEach((p) => { p.textContent = ''; });
  }

  /** Valida el paso 3 (entrega). Devuelve true si todo está correcto. */
  function validarEntrega() {
    limpiarErrores();
    const errores = [];

    if (!estado.modalidad) {
      errores.push('Elige si recoges o si quieres domicilio.');
    }
    ['nombre', 'hora'].forEach((campo) => {
      if (!valor(campo)) {
        errores.push(CAMPOS_OBLIGATORIOS[campo]);
        mostrarError(campo, CAMPOS_OBLIGATORIOS[campo]);
      }
    });
    if (estado.modalidad === 'domicilio') {
      ['recibe', 'direccion', 'barrio'].forEach((campo) => {
        if (!valor(campo)) {
          errores.push(CAMPOS_OBLIGATORIOS[campo]);
          mostrarError(campo, CAMPOS_OBLIGATORIOS[campo]);
        }
      });
    }

    if (errores.length) {
      errores.forEach((e) => notificar(e, 'error'));
      const primero = $('.field.is-invalid .field__input');
      if (primero) primero.focus({ preventScroll: false });
      return false;
    }
    return true;
  }

  // Limpia el error en cuanto el usuario corrige el campo.
  $$('#form-entrega .field__input').forEach((input) => {
    input.addEventListener('input', () => limpiarError(input.id));
  });

  // El formulario no se envía por sí solo: el pedido sale por WhatsApp.
  $('#form-entrega').addEventListener('submit', (ev) => ev.preventDefault());

  $('#hora').addEventListener('change', () => {
    const texto = formatHora12(valor('hora'));
    $('#hora-preview').textContent = texto ? 'Tu pedido quedó para las ' + texto + '.' : 'Selecciona la hora para recibir o recoger tu pedido.';
  });

  /* ---------- 13. MENSAJE DE WHATSAPP ---------- */

  function construirMensaje() {
    const L = [];
    const modo = estado.modalidad;
    const nombreSalsas   = estado.salsas.map(nombreDeSalsa);
    const nombreToppings = estado.toppings.map(nombreDeTopping);
    const hora = formatHora12(valor('hora'));

    L.push('🍩 *NUEVO PEDIDO - ' + NEGOCIO.nombre.toUpperCase() + '* 🍩');
    L.push('');
    L.push('📦 *PEDIDO*');
    L.push('');
    L.push('Mini donas: x' + estado.producto.cantidad);
    L.push('Precio: ' + formatPrecio(estado.producto.precio));
    L.push('');
    L.push('🥫 *SALSAS*');
    nombreSalsas.forEach((s) => L.push('- ' + s));
    L.push('');
    L.push('🍫 *TOPPINGS*');
    nombreToppings.forEach((t) => L.push('- ' + t));
    L.push('');
    L.push('💰 *TOTAL: ' + formatPrecio(estado.producto.precio) + '*');
    L.push('');
    L.push(modo === 'domicilio' ? '🚚 *ENTREGA*' : '🛍️ *RECOGER EN PUNTO*');
    L.push('');
    L.push('Modalidad: ' + MODALIDADES[modo].etiqueta);
    L.push('');
    L.push('👤 *QUIEN PIDE*');
    L.push('Nombre: ' + valor('nombre'));

    if (modo === 'domicilio') {
      L.push('');
      L.push('👤 *PERSONA QUE RECIBE*');
      L.push('Nombre: ' + valor('recibe'));
      L.push('');
      L.push('📍 Dirección:');
      L.push(valor('direccion'));
      L.push('');
      L.push('🏘️ Barrio:');
      L.push(valor('barrio'));
      if (valor('referencia')) {
        L.push('');
        L.push('📌 Referencia:');
        L.push(valor('referencia'));
      }
    }

    L.push('');
    L.push((modo === 'domicilio' ? '⏰ Hora de entrega:' : '⏰ Hora para recoger:'));
    L.push(hora);

    if (valor('observaciones')) {
      L.push('');
      L.push('📝 *OBSERVACIONES*');
      L.push(valor('observaciones'));
    }

    return L.join('\n');
  }

  function enviarPedido() {
    if (!estado.producto) {
      notificar('Primero elige la cantidad de mini donas.', 'error');
      irAlPaso(1);
      return;
    }
    const faltan = faltantes();
    if (faltan.length) {
      faltan.forEach((f) => notificar('Antes de continuar, ' + f + '.', 'error'));
      irAlPaso(2);
      return;
    }
    if (!validarEntrega()) {
      irAlPaso(3);
      return;
    }

    const mensaje = construirMensaje();
    const url = 'https://wa.me/' + NEGOCIO.whatsapp + '?text=' + encodeURIComponent(mensaje);
    window.open(url, '_blank', 'noopener');
    notificar('Abriendo WhatsApp con tu pedido listo 💜', 'success');
  }

  $('#btn-enviar').addEventListener('click', enviarPedido);

  /* ---------- 14. NAVEGACIÓN ENTRE PASOS ---------- */

  const stepperItems = $$('.stepper__item');
  const barFill = $('#stepper-bar-fill');

  function irAlPaso(n) {
    const paso = Math.min(Math.max(n, 1), MAX_PASO);
    estado.paso = paso;

    $$('.panel').forEach((panel) => {
      const activo = Number(panel.dataset.panel) === paso;
      panel.hidden = !activo;
      panel.classList.toggle('is-active', activo);
    });

    stepperItems.forEach((item) => {
      const i = Number(item.dataset.step);
      item.classList.toggle('is-active', i === paso);
      item.classList.toggle('is-done', i < paso);
      if (i === paso) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });

    barFill.style.width = ((paso - 1) / (MAX_PASO - 1) * 100) + '%';

    // El botón "Continuar" solo tiene sentido hasta el paso 3.
    const btnSeguir = $('#btn-continuar');
    const btnVolver = $('#btn-volver');
    const navPasos  = $('.steps-nav');
    btnSeguir.hidden = paso === MAX_PASO;
    btnVolver.hidden = paso === 1;
    navPasos.hidden  = paso === MAX_PASO;
    btnSeguir.querySelector('span').textContent = paso === MAX_PASO - 1 ? 'Ver mi pedido' : 'Continuar';

    actualizarResumen();
    actualizarBarraMovil();
  }

  function desplazarA(id) {
    const destino = document.getElementById(id);
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#btn-continuar').addEventListener('click', () => {
    if (estado.paso === 1) {
      if (!estado.producto) { notificar('Elige la cantidad de mini donas para continuar.', 'error'); return; }
      irAlPaso(2);
    } else if (estado.paso === 2) {
      const faltan = faltantes();
      if (faltan.length) {
        faltan.forEach((f) => notificar('Antes de continuar, ' + f + '.', 'error'));
        return;
      }
      irAlPaso(3);
    } else if (estado.paso === 3) {
      if (validarEntrega()) irAlPaso(4);
      else notificar('Revisa los campos marcados en rojo.', 'error');
    }
    desplazarA('arma-tu-pedido');
  });

  $('#btn-volver').addEventListener('click', () => {
    irAlPaso(estado.paso - 1);
    desplazarA('arma-tu-pedido');
  });

  /* Barra inferior (móvil): replica el paso actual. */
  const mobilebar = $('#mobilebar');
  const btnContinuarMovil = $('#btn-continuar-movil');

  function actualizarBarraMovil() {
    if (!mobilebar) return;
    const mostrar = estado.paso < MAX_PASO;
    if (mostrar) document.body.classList.add('has-mobilebar');
    else document.body.classList.remove('has-mobilebar');
    mobilebar.hidden = !mostrar;
    btnContinuarMovil.textContent = estado.paso === 3 ? 'Ver mi pedido' : 'Continuar';
    btnContinuarMovil.disabled = estado.paso === 1 && !estado.producto;
  }

  btnContinuarMovil.addEventListener('click', () => $('#btn-continuar').click());

  /* ---------- 15. HOJA INFERIOR DEL RESUMEN ---------- */

  const sheet = $('#sheet-summary');
  const btnVerPedido = $('#btn-ver-pedido');

  function abrirSheet() {
    sheet.hidden = false;
    btnVerPedido.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    const cerrar = sheet.querySelector('[data-close-sheet]');
    if (cerrar) cerrar.focus();
  }
  function cerrarSheet() {
    sheet.hidden = true;
    btnVerPedido.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }
  btnVerPedido.addEventListener('click', () => (sheet.hidden ? abrirSheet() : cerrarSheet()));
  $$('[data-close-sheet]').forEach((n) => n.addEventListener('click', cerrarSheet));
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !sheet.hidden) cerrarSheet();
  });

  /* ---------- 16. MENÚ MÓVIL ---------- */

  const hamburger = $('#hamburger');
  const nav = $('#nav');
  const scrim = $('#nav-scrim');

  function abrirMenu() {
    nav.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Cerrar menú');
    scrim.hidden = false;
    document.body.classList.add('is-locked');
  }
  function cerrarMenu() {
    nav.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Abrir menú');
    scrim.hidden = true;
    document.body.classList.remove('is-locked');
  }
  hamburger.addEventListener('click', () => (nav.classList.contains('is-open') ? cerrarMenu() : abrirMenu()));
  scrim.addEventListener('click', cerrarMenu);
  $$('.nav__link').forEach((link) => link.addEventListener('click', cerrarMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 900) cerrarMenu(); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && nav.classList.contains('is-open')) cerrarMenu();
  });

  /* ---------- 17. VARIOS ---------- */

  // Año del pie de página
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Sombra del header al hacer scroll
  const header = $('.site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  // Resalta el enlace del menú de la sección visible
  const secciones = $$('main section[id]');
  const enlacesNav = $$('.nav__link');
  window.addEventListener('scroll', () => {
    const y = window.scrollY + 140;
    let activa = null;
    secciones.forEach((s) => { if (s.offsetTop <= y) activa = s.id; });
    enlacesNav.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + activa));
  }, { passive: true });

  /* ---------- 18. ARRANQUE ---------- */

  renderPresentaciones();
  renderOpcionesCantidad();
  renderSalsas();
  renderToppings();
  actualizarModalidad();
  irAlPaso(1);
  actualizarResumen();
})();