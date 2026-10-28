require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 8080;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ==========================================================
// INFORMACIÓN OFICIAL
// ==========================================================

const DATOS_PAGO = {
  banco: "Spin by OXXO",
  titular: "Francisco Camacho Sotelo",
  clabe: "728969000160022558",

  aportes: {
    gratitud: 90,
    proyecto: 150,
    alcance: 200
  }
};

// ==========================================================
// PROMPT DEL AGENTE
// ==========================================================

const SYSTEM_PROMPT = `
Eres Isabella Rojas, asistente de soporte del proyecto
Cuando Dios Habla.

Tu personalidad es amable, cálida, espiritual, paciente,
respetuosa y humana.

Responde como una persona real por WhatsApp.

REGLAS DE ESTILO:

- Responde en español.
- Utiliza párrafos cortos.
- Deja una línea en blanco entre ideas.
- Usa emojis cálidos con moderación.
- Evita bloques largos de texto.
- No repitas información innecesariamente.
- No saludes nuevamente si la conversación ya comenzó.
- No hagas preguntas innecesarias.
- Responde directamente la duda del usuario.
- No uses Markdown como encabezados con símbolos #.
- No inventes enlaces, promociones, cuentas ni información.
- No digas que eres una inteligencia artificial.
- No presiones a la persona para pagar.
- El apoyo es voluntario.
- Nunca presentes el apoyo como una compra obligatoria.

INFORMACIÓN OFICIAL DEL PROYECTO:

El material principal es un libro digital en formato PDF
llamado "Cuando Dios Habla".

El PDF ya fue enviado previamente dentro de la conversación
de WhatsApp.

El contenido es bíblico y no pertenece exclusivamente a una
religión o denominación.

Los montos de apoyo sugeridos son:

- $70 MXN como muestra de gratitud.
- $150 MXN para apoyar el proyecto.
- $200 MXN para ayudarnos a llegar a más personas.

La persona puede realizar su apoyo por:

- Transferencia bancaria.
- Depósito en OXXO.

DATOS PARA TRANSFERENCIA:

Banco: Spin by OXXO
Titular: Francisco Camacho Sotelo
CLABE: 728969000160022558

Después de realizar el apoyo, la persona debe enviar en este
mismo chat la imagen de su comprobante.

El apoyo puede hacerse después, mañana o cuando la persona
tenga oportunidad. No existe ningún problema por esperar.

Cuando respondas una pregunta concreta, no repitas todo el
discurso de venta. Contesta únicamente lo necesario de manera
clara, amable, ordenada y visual.
`;

// ==========================================================
// FUNCIONES GENERALES
// ==========================================================

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contieneAlguna(texto, frases) {
  return frases.some((frase) => texto.includes(frase));
}

function elegirAleatoria(opciones) {
  return opciones[
    Math.floor(Math.random() * opciones.length)
  ];
}

function limpiarRespuesta(valor) {
  return String(valor ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ==========================================================
// MENSAJES REUTILIZABLES
// ==========================================================

function cierrePago() {
  return [
    "💌 Para apoyar este proyecto espiritual puedes elegir:",
    "",
    "🏦 Transferencia bancaria",
    "🏪 Depósito en OXXO",
    "",
    "¿Cuál opción prefieres? 🙏"
  ].join("\n");
}

function agregarCierre(respuesta) {
  const respuestaLimpia = limpiarRespuesta(respuesta);

  if (!respuestaLimpia) {
    return cierrePago();
  }

  const normalizada =
    normalizarTexto(respuestaLimpia);

  const yaIncluyeCierre =
    normalizada.includes("cual opcion prefieres") ||
    (
      normalizada.includes("transferencia bancaria") &&
      normalizada.includes("deposito en oxxo")
    );

  if (yaIncluyeCierre) {
    return respuestaLimpia;
  }

  return `${respuestaLimpia}\n\n${cierrePago()}`;
}

function respuestaCuenta() {
  return [
    "Claro 😊 Estos son los datos para realizar tu apoyo por transferencia:",
    "",
    `🏦 Banco: ${DATOS_PAGO.banco}`,
    `👤 Titular: ${DATOS_PAGO.titular}`,
    `🔢 CLABE: ${DATOS_PAGO.clabe}`,
    "",
    "Cuando realices tu apoyo, envíame aquí la imagen del comprobante y con mucho gusto te entregaré tus regalos 🎁🙏"
  ].join("\n");
}

function respuestaPagoPosterior() {
  return [
    "Claro 😊 No hay ningún problema, puedes realizar tu apoyo después.",
    "",
    "Cuando estés listo, estos son los datos para transferencia:",
    "",
    `🏦 Banco: ${DATOS_PAGO.banco}`,
    `👤 Titular: ${DATOS_PAGO.titular}`,
    `🔢 CLABE: ${DATOS_PAGO.clabe}`,
    "",
    "Después solo envíame aquí la imagen del comprobante para entregarte tus regalos 🎁",
    "",
    "Que Dios te bendiga 🙏❤️"
  ].join("\n");
}

function respuestaOxxo() {
  return [
    "Claro 😊 También puedes realizar tu apoyo mediante depósito en OXXO.",
    "",
    "Utiliza el código o QR de Spin que te compartimos anteriormente en esta conversación 🏪",
    "",
    "Cuando termines, envíame aquí una fotografía completa y legible del ticket para poder entregarte tus regalos 🎁🙏"
  ].join("\n");
}

function respuestaReligion() {
  return [
    "El contenido está basado en la Biblia 🙏📖",
    "",
    "No pertenece exclusivamente a una religión o denominación. Fue preparado para cualquier persona que quiera acercarse más a Dios y profundizar en Su Palabra ❤️"
  ].join("\n");
}

function respuestaEntrega() {
  return [
    "El libro es completamente digital y se entrega en formato PDF 📖✨",
    "",
    "Ya fue enviado anteriormente en esta misma conversación. Puedes buscarlo un poco más arriba en el chat y descargarlo directamente en tu teléfono 📲"
  ].join("\n");
}

function respuestaPrecio() {
  return [
    "El libro digital ya fue entregado y el apoyo al proyecto es completamente voluntario 🙏",
    "",
    "Puedes elegir la cantidad con la que te sientas cómodo:",
    "",
    `💛 $${DATOS_PAGO.aportes.gratitud} MXN como muestra de gratitud`,
    `🌱 $${DATOS_PAGO.aportes.proyecto} MXN para apoyar el proyecto`,
    `✨ $${DATOS_PAGO.aportes.alcance} MXN para ayudarnos a llegar a más personas`,
    "",
    cierrePago()
  ].join("\n");
}

// ==========================================================
// RESPUESTAS DIRECTAS
// ==========================================================

function respuestaDirecta(mensajeOriginal) {
  const texto =
    normalizarTexto(mensajeOriginal);

  if (!texto) {
    return null;
  }

  // --------------------------------------------------------
  // PAGAR DESPUÉS
  // Debe evaluarse antes de la intención genérica de pago.
  // --------------------------------------------------------

  const preguntaPagoPosterior =
    contieneAlguna(texto, [
      "pagar despues",
      "pago despues",
      "depositar despues",
      "transferir despues",
      "hacerlo despues",
      "puedo hacerlo despues",
      "puedo pagar manana",
      "pagar manana",
      "pago manana",
      "depositar manana",
      "transferir manana",
      "lo hago manana",
      "mas tarde",
      "otro dia",
      "la proxima semana",
      "cuando tenga dinero"
    ]) ||
    texto === "despues" ||
    texto === "manana";

  if (preguntaPagoPosterior) {
    return respuestaPagoPosterior();
  }

  // --------------------------------------------------------
  // DATOS BANCARIOS
  // --------------------------------------------------------

  const preguntaCuenta =
    contieneAlguna(texto, [
      "numero de cuenta",
      "numero para depositar",
      "numero para transferir",
      "datos bancarios",
      "datos de transferencia",
      "cuenta bancaria",
      "a que cuenta",
      "en que cuenta",
      "donde transfiero",
      "donde deposito",
      "cual es la cuenta",
      "cual cuenta",
      "pasame la cuenta",
      "mandame la cuenta",
      "clave interbancaria"
    ]) ||
    texto === "cuenta" ||
    texto === "clabe";

  if (preguntaCuenta) {
    return respuestaCuenta();
  }

  // --------------------------------------------------------
  // OXXO
  // --------------------------------------------------------

  const preguntaOxxo =
    contieneAlguna(texto, [
      "deposito en oxxo",
      "depositar en oxxo",
      "pagar en oxxo",
      "pago en oxxo",
      "como pago en oxxo",
      "como deposito en oxxo",
      "codigo de oxxo",
      "qr de oxxo",
      "ticket de oxxo"
    ]) ||
    texto === "oxxo";

  if (preguntaOxxo) {
    return respuestaOxxo();
  }

  // --------------------------------------------------------
  // RELIGIÓN
  // --------------------------------------------------------

  if (
    contieneAlguna(texto, [
      "catolico",
      "catolica",
      "cristiano",
      "cristiana",
      "religion",
      "religioso",
      "religiosa",
      "evangelico",
      "evangelica",
      "denominacion",
      "de que iglesia"
    ])
  ) {
    return respuestaReligion();
  }

  // --------------------------------------------------------
  // ENTREGA, PDF O PRODUCTO FÍSICO
  // --------------------------------------------------------

  if (
    contieneAlguna(texto, [
      "es fisico",
      "libro fisico",
      "producto fisico",
      "formato fisico",
      "es digital",
      "libro digital",
      "es pdf",
      "archivo pdf",
      "como lo recibo",
      "cuando lo recibo",
      "donde lo recibo",
      "como se entrega",
      "donde esta el libro",
      "no encuentro el libro",
      "no me llego",
      "no lo recibi",
      "envio",
      "domicilio"
    ])
  ) {
    return respuestaEntrega();
  }

  // --------------------------------------------------------
  // PRECIO O MONTO
  // --------------------------------------------------------

  if (
    contieneAlguna(texto, [
      "cuanto cuesta",
      "cuanto vale",
      "que precio",
      "precio",
      "costo",
      "cuanto pago",
      "cuanto deposito",
      "cuanto transfiero",
      "cuanto hay que dar",
      "cuanto debo pagar",
      "de cuanto es el apoyo",
      "cantidad"
    ])
  ) {
    return respuestaPrecio();
  }

  return null;
}

// ==========================================================
// RUTAS
// ==========================================================

app.get("/", (req, res) => {
  return res
    .status(200)
    .send("Bot ventas activo ✅");
});

app.post("/mensaje", async (req, res) => {
  try {
    const mensaje =
      req.body?.texto ??
      req.body?.mensaje ??
      req.body?.message ??
      "";

    const textoUsuario =
      String(mensaje).trim();

    console.log(
      "Mensaje recibido:",
      textoUsuario
    );

    if (!textoUsuario) {
      return res.json({
        respuesta: [
          "Estoy aquí para ayudarte 😊",
          "",
          "Puedes escribirme tu duda sobre el libro, la entrega o las formas de apoyo 🙏"
        ].join("\n")
      });
    }

    const directa =
      respuestaDirecta(textoUsuario);

    if (directa) {
      const respuestaFinal =
        limpiarRespuesta(directa);

      console.log(
        "Respuesta directa enviada:",
        respuestaFinal
      );

      return res.json({
        respuesta: respuestaFinal
      });
    }

    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",

        temperature: 0.4,

        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: SYSTEM_PROMPT
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: textoUsuario
              }
            ]
          }
        ]
      });

    const respuestaIA =
      response.output_text || "";

    const respuestaFinal =
      agregarCierre(respuestaIA);

    console.log(
      "Respuesta enviada:",
      respuestaFinal
    );

    return res.json({
      respuesta: respuestaFinal
    });
  } catch (error) {
    console.error(
      "Error en /mensaje:",
      error
    );

    return res.json({
      respuesta: [
        "Con mucho gusto te ayudo 😊",
        "",
        cierrePago()
      ].join("\n")
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Servidor corriendo en puerto ${PORT}`
  );
});
