const moment = require('moment');
const fs = require('fs');
const path = require('path');

exports.primerasMayusc = function(texto) {
  const re = /(^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?:([a-záéíóúüñ])|([A-ZÁÉÍÓÚÜÑ]))|([A-ZÁÉÍÓÚÜÑ]+)/gu;
  return texto.replace(
    re,
    (m, caracterPrevio, minuscInicial, mayuscInicial, mayuscIntermedias) => {
      const locale = ['es', 'gl', 'ca', 'pt', 'en'];
      if (mayuscIntermedias) return mayuscIntermedias.toLocaleLowerCase(locale);
      return (
        caracterPrevio +
        (minuscInicial
          ? minuscInicial.toLocaleUpperCase(locale)
          : mayuscInicial)
      );
    }
  );
};
/* ordena los planes por acrónimo o si no tiene por nombre descendete
un plan es un objeto {codigo:"09AQ",nombre:"MUIT", nombreCompleto:"Master en ..."}
nombre puede ser null
*/
exports.sortPlanes = function(a, b) {
  const aNombre = a.nombre === null ? a.codigo : a.nombre;
  const bNombre = b.nombre === null ? b.codigo : b.nombre;
  if (aNombre < bNombre) return 1;
  if (aNombre > bNombre) return -1;
  return 0;
};

/* ordena los departamentos por codigo ascendente
un plan es un objeto {codigo:"D520",nombre:"Departaento...."}
*/
exports.sortDepartamentos = function(a, b) {
  if (a.codigo < b.codigo) return -1;
  if (a.codigo > b.codigo) return 1;
  return 0;
};

/* ordena los roles por departamentos */
exports.sortRolesporDepartamento = function(a, b) {
  if (a.DepartamentoCodigo < b.DepartamentoCodigo) return -1;
  if (a.DepartamentoCodigo > b.DepartamentoCodigo) return 1;
  return 0;
};

/* ordena los profesores por nombreCorregido ascendente
un profesor tendrá entre sus atributos {nombreCorregido: "apellido apellido, nombre" ...}
*/
exports.sortProfesorCorregido = function(a, b) {
  if (a.nombreCorregido < b.nombreCorregido) return -1;
  if (a.nombreCorregido > b.nombreCorregido) return 1;
  return 0;
};

/* ordena las asignaturas por curos y después acronimo o nombre si no la tienen ascendente
un profesor tendrá entre sus atributos {nombreCorregido: "apellido apellido, nombre" ...}
*/
exports.sortAsignaturasCursoNombre = function(a, b) {
  const aNombre = a.acronimo === null ? a.nombre : a.acronimo;
  const bNombre = b.acronimo === null ? b.nombre : b.acronimo;
  if (a.curso > b.curso) return 1;
  if (a.curso < b.curso) return -1;
  if (aNombre > bNombre) return 1;
  if (aNombre < bNombre) return -1;
  return 0;
};
/* ordena las asignaturas por codigo
 */
exports.sortAsignaturasCodigo = function(a, b) {
  if (a.codigo > b.codigo) return 1;
  if (a.codigo < b.codigo) return -1;
  return 0;
};

exports.isEmpty = function(obj) {
  const { hasOwnProperty } = Object.prototype;
  // null and undefined are "empty"
  if (obj == null) return true;

  // Assume if it has a length property with a non-zero value
  // that that property is correct.
  if (obj.length > 0) return false;
  if (obj.length === 0) return true;

  // If it isn't an object at this point
  // it is empty, but it can't be anything *but* empty
  // Is it empty?  Depends on your application.
  if (typeof obj !== 'object') return true;

  // Otherwise, does it have any properties of its own?
  // Note that this doesn't handle
  // toString and valueOf enumeration bugs in IE < 9
  for (const key in obj) {
    if (hasOwnProperty.call(obj, key)) return false;
  }

  return true;
};

// convierte de formato 4,5 a 4.5 el separador de decimales en números
exports.convertCommaToPointDecimal = function(n) {
  // eslint-disable-next-line no-param-reassign
  n = n.replace(/\./g, '').replace(',', '.');
  return n;
};

// convierte de YYYY-MM-DD a DD/MM/YYYY
function formatFecha(fecha) {
  try {
    return `${fecha.split('-')[2]}/${fecha.split('-')[1]}/${
      fecha.split('-')[0]
    }`;
  } catch (error) {
    return null;
  }
}

exports.formatFecha = formatFecha;

// convierte de DD/MM/YYYY a YYYY-MM-DD
function formatFecha2(fecha) {
  try {
    return `${fecha.split('/')[2]}-${fecha.split('/')[1]}-${
      fecha.split('/')[0]
    }`;
  } catch (error) {
    return null;
  }
}
exports.formatFecha2 = formatFecha2;

// crea una fecha pasandola con formato dd/mm/yyyy
exports.nuevaDateFormat = function(fecha) {
  try {
    const ano = fecha.split('/')[2];
    const mes = fecha.split('/')[1];
    const dia = fecha.split('/')[0];
    return new Date(`${mes}/${dia}/${ano}`);
  } catch (error) {
    return null;
  }
};

// le pasas una fecha y te devuelve el dia más proximo de dentro de un año que caiga
// la fecha se pasa como YYYY-MM-DD
// el mismo dia de la semana
exports.addYear = function(fechaActual) {
  // eslint-disable-next-line no-param-reassign
  fechaActual = formatFecha(fechaActual);
  try {
    const actual = moment(fechaActual, 'DD/MM/YYYY');
    let siguiente = actual.clone().add(1, 'year');
    const a = actual.day() - siguiente.day();
    const temp = [a, a - 7, 7 - a];
    let index = 0;
    let value = temp[0];
    for (let i = 1; i < temp.length; i++) {
      if (Math.abs(temp[i]) < Math.abs(value)) {
        value = temp[i];
        index = i;
      }
    }
    siguiente = siguiente.add(temp[index], 'day');
    const resp = siguiente.isValid() ? siguiente : null;
    return resp;
  } catch (error) {
    return null;
  }
};

/**
 * le pasas una fecha y te devuelve el mismo dia del año siguiente si cae en fin de semana el lunes siguiente
 * le pasas la fechaAnterior para que el offset se reinicie si hay una diferencia mayor a 6 dias
 * porque se consideran distintos periodos a partir de 6 dias. Sino hay fecha anterior es la propia
 * el offset son los dias que quieres que desplace la fecha nueva asi si una fecha cae en sabado y otra en domino
 * en vez de caer las dos en lunes , la del sabado caera en lunes y la del domingo en martes
 * ¡¡las fechas al llamar a este método deberán estar ordenadas de manera creciente!!
 * */

exports.addYear2 = function(fechaActual, fechaAnterior, offset) {
  // eslint-disable-next-line no-param-reassign
  fechaActual = formatFecha(fechaActual);
  // eslint-disable-next-line no-param-reassign
  fechaAnterior = fechaAnterior ? formatFecha(fechaAnterior) : fechaActual;
  try {
    const actual = moment(fechaActual, 'DD/MM/YYYY');
    const anterior = moment(fechaAnterior, 'DD/MM/YYYY');
    // si hay 6 dias de diferencia entre dos examenes se interpretan como independientes, franjas distitnas
    if (actual - anterior >= 6 * 24 * 3600 * 1000) {
      // eslint-disable-next-line no-param-reassign
      offset = 0;
    }
    let siguiente = actual
      .clone()
      .add(1, 'year')
      .add(offset, 'day');
    const a = siguiente.day();
    let b = 0; // nuevo offset si vuelve a tocar fin de semana
    switch (a) {
      case 0:
        b = 1;
        break;
      case 6:
        b = 2;
        break;
      default:
        break;
    }
    siguiente = siguiente.add(b, 'day');
    // eslint-disable-next-line no-param-reassign
    offset += b;
    return [siguiente, offset];
  } catch (error) {
    return [null, null];
  }
};

// devuelve el siguiente año al pasarle con formato 201920 y devolveria 202021
exports.siguienteAnoAcademico = function(anoActual) {
  const year = Number(anoActual.substr(0, 4));
  const siguiente = year + 1;
  const siguiente2 = year + 2;
  return `${siguiente}${siguiente2.toString().substr(-2)}`;
};

exports.ensureDirectoryExistence = function probar(filePath, notCreate) {
  const dirname = path.dirname(filePath);
  // sync para evitar condiciones de bloqueo
  if (fs.existsSync(dirname)) {
    return;
  }
  if (notCreate) {
    return;
  }
  probar(dirname);
  fs.mkdirSync(dirname);
};
