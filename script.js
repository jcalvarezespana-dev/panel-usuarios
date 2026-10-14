// ==========================================================
// Panel de Gestión de Usuarios
// Consume https://jsonplaceholder.typicode.com/users y permite
// buscar, agregar, modificar y eliminar usuarios sin recargar.
// Los cambios solo viven mientras la página está abierta.
// ==========================================================

// ---------- 1. Constantes y estado ----------

// URL de la API (si la cambias por una incorrecta, verás el mensaje de error)
const URL_API = "https://jsonplaceholder.typicode.com/users";

// Array de objetos { id, nombre, correo, ciudad }: la "base de datos" en memoria
let usuarios = [];

// Guarda el id del usuario que se está editando (null = estamos agregando)
let idEnEdicion = null;

// ---------- 2. Referencias al DOM ----------

const formulario = document.getElementById("formulario");
const inputId = document.getElementById("id");
const inputNombre = document.getElementById("nombre");
const inputCorreo = document.getElementById("correo");
const inputCiudad = document.getElementById("ciudad");
const btnEnviar = document.getElementById("btn-enviar");
const btnCancelar = document.getElementById("btn-cancelar");
const tituloForm = document.getElementById("titulo-form");
const buscador = document.getElementById("buscador");
const cuerpoTabla = document.getElementById("cuerpo-tabla");
const mensaje = document.getElementById("mensaje");
const resumen = document.getElementById("resumen");

// ---------- 3. Mensajes de estado ----------

// Muestra un mensaje en el <p id="mensaje">.
// tipo puede ser: "info", "exito" o "error" (cambia el color en el CSS)
const mostrarMensaje = (texto, tipo = "info") => {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
};

// ---------- 4. Carga de datos con fetch + async/await ----------

const cargarUsuarios = async () => {
  mostrarMensaje("Cargando usuarios...", "info");

  try {
    const res = await fetch(URL_API);

    // fetch no lanza error con respuestas 404/500, así que lo revisamos a mano
    if (!res.ok) {
      throw new Error(`La API respondió con el estado ${res.status}`);
    }

    // Convertimos la respuesta (JSON) a un array de JavaScript
    const datos = await res.json();

    // map() transforma cada usuario de la API al formato de nuestra tabla.
    // Usamos destructuring para sacar solo los campos que necesitamos;
    // la ciudad viene dentro de address, por eso el destructuring anidado.
    usuarios = datos.map(({ id, name, email, address: { city } }) => ({
      id,
      nombre: name,
      correo: email,
      ciudad: city,
    }));

    actualizarLista();
    mostrarMensaje(`Se cargaron ${usuarios.length} usuarios.`, "exito");
  } catch (error) {
    // Mensaje amigable para la persona; el detalle técnico va a la consola
    console.error("Error al cargar usuarios:", error);
    mostrarMensaje(
      "No pudimos cargar los usuarios. Revisa tu conexión e intenta de nuevo.",
      "error"
    );
  }
};

// ---------- 5. Dibujar la tabla ----------

// Devuelve los usuarios cuyo nombre contiene lo escrito en el buscador.
// filter() crea un array NUEVO: el array original "usuarios" no se modifica.
const obtenerFiltrados = () => {
  const texto = buscador.value.trim().toLowerCase();
  return usuarios.filter(({ nombre }) => nombre.toLowerCase().includes(texto));
};

// Redibuja el <tbody> con la lista que reciba
const renderTabla = (lista) => {
  // Limpiamos el contenido anterior
  cuerpoTabla.innerHTML = "";

  if (lista.length === 0) {
    cuerpoTabla.innerHTML = `
      <tr><td colspan="5" class="fila-vacia">No hay usuarios para mostrar.</td></tr>
    `;
    return;
  }

  // Recorremos la lista y armamos cada fila con template strings.
  // data-label se usa en celular para mostrar el nombre de cada columna.
  const filas = lista.map(({ id, nombre, correo, ciudad }) => `
    <tr>
      <td data-label="Id">${id}</td>
      <td data-label="Nombre">${escaparHTML(nombre)}</td>
      <td data-label="Correo">${escaparHTML(correo)}</td>
      <td data-label="Ciudad">${escaparHTML(ciudad)}</td>
      <td class="celda-acciones">
        <button type="button" class="btn btn-editar" data-accion="editar" data-id="${id}">Editar</button>
        <button type="button" class="btn btn-eliminar" data-accion="eliminar" data-id="${id}">Eliminar</button>
      </td>
    </tr>
  `);

  cuerpoTabla.innerHTML = filas.join("");
};

// Evita que texto escrito por la persona se interprete como HTML
const escaparHTML = (texto) => {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
};

// Cuenta cuántos usuarios hay por ciudad usando un bucle for...of
const contarPorCiudad = () => {
  const conteo = {};

  for (const { ciudad } of usuarios) {
    conteo[ciudad] = (conteo[ciudad] || 0) + 1;
  }

  return conteo;
};

// Muestra el conteo por ciudad debajo del buscador
const renderResumen = () => {
  const conteo = contarPorCiudad();
  const partes = Object.entries(conteo).map(
    ([ciudad, total]) => `${ciudad}: ${total}`
  );
  resumen.textContent = partes.length
    ? `Usuarios por ciudad → ${partes.join(" | ")}`
    : "";
};

// Se llama CADA VEZ que cambia la lista (cargar, agregar, modificar, eliminar)
const actualizarLista = () => {
  // Imprime el array completo en la consola como texto JSON
  console.log(JSON.stringify(usuarios, null, 2));

  renderTabla(obtenerFiltrados());
  renderResumen();
};

// ---------- 6. Validación del formulario ----------

// Revisa los datos y devuelve un código que describe el resultado.
// Usamos un bucle para recorrer los campos y detectar vacíos.
const validarFormulario = ({ id, nombre, correo, ciudad }) => {
  // Bucle: ningún campo puede estar vacío
  for (const valor of [id, nombre, correo, ciudad]) {
    if (valor === "") return "CAMPO_VACIO";
  }

  // El id debe ser un número entero
  if (!/^\d+$/.test(id)) return "ID_NO_NUMERICO";

  // El correo debe contener "@"
  if (!correo.includes("@")) return "CORREO_INVALIDO";

  // Al agregar, el id no puede existir (incluye los que vinieron de la API).
  // Al editar el id está bloqueado, así que no se vuelve a comprobar.
  if (idEnEdicion === null && usuarios.some((u) => u.id === Number(id))) {
    return "ID_REPETIDO";
  }

  return "OK";
};

// Elige el mensaje de error según el código de validación (switch)
const mensajeDeValidacion = (codigo, id) => {
  switch (codigo) {
    case "CAMPO_VACIO":
      return "Completa todos los campos antes de continuar.";
    case "ID_NO_NUMERICO":
      return "El id debe ser un número entero (por ejemplo, 11).";
    case "CORREO_INVALIDO":
      return "El correo debe contener el símbolo @.";
    case "ID_REPETIDO":
      return `Ya existe un usuario con el id ${id}.`;
    default:
      return "";
  }
};

// ---------- 7. Modo del formulario: agregar o editar ----------

// Devuelve el formulario a su estado inicial (modo agregar)
const reiniciarFormulario = () => {
  formulario.reset();
  idEnEdicion = null;
  inputId.disabled = false;
  btnEnviar.textContent = "Agregar";
  tituloForm.textContent = "Registrar usuario";
  btnCancelar.hidden = true;
};

// Carga los datos de un usuario en el formulario y pasa a modo editar
const prepararEdicion = (id) => {
  const usuario = usuarios.find((u) => u.id === id);
  if (!usuario) return;

  const { nombre, correo, ciudad } = usuario;

  inputId.value = id;
  inputNombre.value = nombre;
  inputCorreo.value = correo;
  inputCiudad.value = ciudad;

  idEnEdicion = id;
  inputId.disabled = true; // el id no se puede cambiar
  btnEnviar.textContent = "Guardar cambios";
  tituloForm.textContent = `Editar usuario ${id}`;
  btnCancelar.hidden = false;

  mostrarMensaje(`Editando al usuario con id ${id}.`, "info");
  inputNombre.focus();
};

// ---------- 8. Eventos ----------

// 8.1 Enviar el formulario (agregar o guardar cambios)
formulario.addEventListener("submit", (event) => {
  // Evita que la página se recargue
  event.preventDefault();

  // En edición el id está deshabilitado, pero su valor se puede leer igual
  const datos = {
    id: inputId.value.trim(),
    nombre: inputNombre.value.trim(),
    correo: inputCorreo.value.trim(),
    ciudad: inputCiudad.value.trim(),
  };

  const resultado = validarFormulario(datos);

  if (resultado !== "OK") {
    mostrarMensaje(mensajeDeValidacion(resultado, datos.id), "error");
    return; // no se agrega ni se modifica nada
  }

  const { id, nombre, correo, ciudad } = datos;

  if (idEnEdicion === null) {
    // --- AGREGAR ---
    usuarios.push({ id: Number(id), nombre, correo, ciudad });
    mostrarMensaje(`Usuario "${nombre}" agregado con el id ${id}.`, "exito");
  } else {
    // --- MODIFICAR: buscamos el objeto por su id y lo actualizamos ---
    const usuario = usuarios.find((u) => u.id === idEnEdicion);
    usuario.nombre = nombre;
    usuario.correo = correo;
    usuario.ciudad = ciudad;
    mostrarMensaje(`Usuario ${idEnEdicion} actualizado correctamente.`, "exito");
  }

  reiniciarFormulario();
  actualizarLista();
});

// 8.2 Cancelar la edición
btnCancelar.addEventListener("click", () => {
  reiniciarFormulario();
  mostrarMensaje("Edición cancelada.", "info");
});

// 8.3 Búsqueda en vivo: se redibuja la tabla con cada letra escrita
buscador.addEventListener("input", () => {
  renderTabla(obtenerFiltrados());
});

// 8.4 Delegación de eventos: un solo "click" en el <tbody> atiende
//     todos los botones Editar y Eliminar, incluso los de filas nuevas
cuerpoTabla.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-accion]");
  if (!boton) return;

  const { accion } = boton.dataset;
  const id = Number(boton.dataset.id);

  if (accion === "editar") {
    prepararEdicion(id);
  } else if (accion === "eliminar") {
    const usuario = usuarios.find((u) => u.id === id);

    // Pedimos confirmación antes de borrar
    if (!confirm(`¿Eliminar a ${usuario.nombre}?`)) return;

    // filter() deja todos los usuarios EXCEPTO el que tiene ese id
    usuarios = usuarios.filter((u) => u.id !== id);

    // Si justo se estaba editando ese usuario, se sale del modo edición
    if (idEnEdicion === id) reiniciarFormulario();

    mostrarMensaje(`Usuario "${usuario.nombre}" eliminado.`, "exito");
    actualizarLista();
  }
});

// ---------- 9. Inicio ----------

// Al abrir la página se piden los usuarios a la API
cargarUsuarios();
