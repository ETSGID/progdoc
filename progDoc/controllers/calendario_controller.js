/* global CONTEXT */
/* eslint-disable camelcase */
const moment = require('moment');
const Sequelize = require('sequelize');
const models = require('../models');
const enumsPD = require('../enumsPD');

const op = Sequelize.Op;

const comprobarColor = (buffer_eventos, eventos, dia) => {
  let code = -1;
  const nuevo_buffer = [];
  const dia_objetoFecha = new Date(dia);
  for (const i in buffer_eventos) {
    if (new Date(buffer_eventos[i].fechaFin) >= dia_objetoFecha) {
      nuevo_buffer.push(buffer_eventos[i]);
      // se queda con el color del evento con mayor tipo
      if (
        enumsPD.eventosTipo[buffer_eventos[i].tipo] %
          Object.keys(enumsPD.eventosTipo).length >
        code % Object.keys(enumsPD.eventosTipo).length
      ) {
        code = enumsPD.eventosTipo[buffer_eventos[i].tipo];
      }
    }
  }
  for (const i in eventos) {
    if (Object.prototype.hasOwnProperty.call(eventos, i)) {
      if (eventos[i].fechaFin !== 'Evento de dia') {
        nuevo_buffer.push(eventos[i]);
      }
      // se queda con el color del evento con mayor tipo
      if (
        enumsPD.eventosTipo[eventos[i].tipo] %
          Object.keys(enumsPD.eventosTipo).length >
        code % Object.keys(enumsPD.eventosTipo).length
      ) {
        code = enumsPD.eventosTipo[eventos[i].tipo];
      }
    }
  }
  return [code, nuevo_buffer];
};

const bisiesto = year => {
  return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
};

const generarArrayDias = (dic_eventos, ano) => {
  /* Primero generamos un array de enteros que sean todos los dias del año */
  const uno_septiembre = new Date(parseInt(ano, 10), 8, 1);
  // array udimensional con todas las casillas que habra desde
  // desde el lunes de la semana del 1 de Septiembre
  // hasta el domingo de la semana del 31 de julio
  let array_numeros = [];
  // Esta variable se requiere luego
  let dia = uno_septiembre.getDay();
  // eslint-disable-next-line eqeqeq
  if (dia == 0) {
    // si es domingo habra 6 casillas en blanco
    array_numeros = new Array(6);
  } else {
    array_numeros = new Array(dia - 1);
  }
  const mes_30_dias = Array.from(new Array(30), (val, index) => index + 1);
  const meses_30 = ['0', '2', '7', '9'];
  const mes_31_dias = Array.from(new Array(31), (val, index) => index + 1);
  const meses_31 = ['1', '3', '4', '6', '8', '10', '11'];
  let febrero = [];
  if (bisiesto(parseInt(ano, 10) + 1)) {
    febrero = Array.from(new Array(29), (val, index) => index + 1);
  } else {
    febrero = Array.from(new Array(28), (val, index) => index + 1);
  }
  for (const i in [...Array(12).keys()]) {
    if (meses_30.includes(i)) {
      // eslint-disable-next-line prefer-spread
      array_numeros.push.apply(array_numeros, mes_30_dias);
    } else if (meses_31.includes(i)) {
      // eslint-disable-next-line prefer-spread
      array_numeros.push.apply(array_numeros, mes_31_dias);
    } else {
      // eslint-disable-next-line prefer-spread
      array_numeros.push.apply(array_numeros, febrero);
    }
  }
  const resto = array_numeros.length % 7;
  const array_resto = new Array(7 - resto);
  // eslint-disable-next-line prefer-spread
  array_numeros.push.apply(array_numeros, array_resto);
  /** Una vez tenemos el array procedemos a transformarlo en un array de objetos tipo dia
   * (ver descripcion de este objeto mas abajo)
   * */
  const array_calendario = [];
  let contador_meses = 0;
  let offset_mes = 8;
  const meses = [
    '',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto'
  ];
  // eslint-disable-next-line no-param-reassign
  ano = parseInt(ano, 10);

  // dicionarios con los contadores de dias de 1S y 2S
  const dic_dias_1 = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  };
  const dic_dias_2 = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  };
  // Indica si el dia se incluye entre en el contador de Lunes, Martes...
  // Se cuentan por semestre, todos los dias que estén dentro del periodo de inicio y fin del semestre
  // Excepto: festivos y no lectivos (ajuste)
  let contar;
  // En esta variable se guardan los eventos que nos diarios
  let buffer_eventos = [];
  let vacaciones_offset = 0;
  const semanas = [];
  // contador de semanas por semestre
  let contador_semanas = 1;
  // periodo lectivo sera 0 "1S" y "2S"
  let in_periodo_lectivo = null;
  // dia de la semana a incrementar en el contador
  let dayToIncrement;
  // boolean for last day event in semester
  let lastDay;

  for (let i = 0; i < array_numeros.length; i++) {
    contar = true;
    lastDay = false;
    dayToIncrement = dia;
    if (array_numeros[i] === undefined) {
      array_calendario.push(undefined);
    } else {
      const num = array_numeros[i];
      if (num === 1) {
        contador_meses += 1;
        if (contador_meses === 5) {
          // eslint-disable-next-line no-param-reassign
          ano += 1;
          offset_mes = -4;
        }
      }
      const numero = String(num).length === 1 ? `0${String(num)}` : String(num);
      const mes = meses[contador_meses];
      const mes_codigo =
        String(contador_meses + offset_mes).length === 1
          ? `0${String(contador_meses + offset_mes)}`
          : String(contador_meses + offset_mes);
      const codigo = `${ano}-${mes_codigo}-${numero}`;
      const eventos =
        dic_eventos[codigo] === undefined ? [] : dic_eventos[codigo];
      if (vacaciones_offset > 0) {
        vacaciones_offset -= 1;
        contar = false;
      }
      // eslint-disable-next-line no-loop-func
      eventos.forEach(evento => {
        switch (evento.nombre) {
          case 'Inicio de las clases':
            in_periodo_lectivo = '1S';
            contador_semanas = 1;
            break;
          case 'Comienzo del segundo cuatrimestre':
            in_periodo_lectivo = '2S';
            contador_semanas = 1;
            break;
          case 'Final del primer cuatrimestre':
            lastDay = true;
            break;
          case 'Fin del periodo lectivo':
            lastDay = true;
            break;
          default:
            break;
        }
        switch (evento.tipo) {
          case 'festivo':
          case 'ajuste':
            contar = false;
            if (evento.fechaFin !== 'Evento de dia') {
              // cuando es un festivo prolongado
              const periodoFestivoOrAjuste =
                (Date.parse(evento.fechaFin) - Date.parse(evento.fechaInicio)) /
                86400000;
              // En caso de que se solapen vacaciones
              if (vacaciones_offset < periodoFestivoOrAjuste) {
                vacaciones_offset = periodoFestivoOrAjuste;
              }
            }
            break;
          case 'especial':
            try {
              // Día de Martes por ejemplo
              // Sanetiza los dias de la semana para quitar caracteres raros como acentos
              // y buscarlos en el enum
              dayToIncrement =
                enumsPD.diasDeSemana[
                  evento.nombre
                    .split(' ')[2]
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                ];
            } catch (error) {
              console.error(error);
            }
            break;
          default:
            break;
        }
      });
      if (contar) {
        switch (in_periodo_lectivo) {
          case '1S':
            dic_dias_1[dayToIncrement] += 1;
            break;
          case '2S':
            dic_dias_2[dayToIncrement] += 1;
            break;
          default:
            break;
        }
      }

      if (dia === 0) {
        if (in_periodo_lectivo) {
          semanas.push(contador_semanas);
          contador_semanas += 1;
        } else {
          semanas.push('');
        }
      }
      if (lastDay) {
        in_periodo_lectivo = null;
      }
      dia = (dia + 1) % 7;
      const comprobarColorArray = comprobarColor(
        buffer_eventos,
        eventos,
        codigo
      );
      let color = 'white';
      if (comprobarColorArray[0] !== -1) {
        color = enumsPD.coloresEvento[comprobarColorArray[0]];
      }
      // eslint-disable-next-line prefer-destructuring
      buffer_eventos = comprobarColorArray[1];
      const objeto = {
        numero,
        mes,
        mes_codigo,
        codigo,
        ano,
        eventos,
        color
      };
      array_calendario.push(objeto);
    }
  }
  return [array_calendario, array_numeros, dic_dias_1, dic_dias_2, semanas];
};

/**
 * Esta funcion se encarga de generar el calendario y renderizar la página con el calendario.
 * Para ello, se envia al .ejs un arry de objetos de tipo "Dia". Estos objetos son JSONs con la siguinete estructura:
 *  {
 *      numero: "02",
 *      mes: "Marzo",
 *      mes_codigo: "03",
 *      ano: 2019,
 *      codigo: "2019-03-02"
 *      color: "Yellow"
 *      eventos: [
 *          "Evento 1",
 *          "Evento 2"
 *      ]
 *  }
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */

exports.getCalendario = async (req, res, next) => {
  try {
    const { ano } = req;
    req.session.ano = req.ano_mostrar;
    let vacio = true;
    if (Object.entries(req.dic_eventos).length !== 0) {
      vacio = false;
    }
    const array_datos = generarArrayDias(req.dic_eventos, ano);
    let general = 'false';
    if (req.query.planID === undefined) {
      general = 'true';
    }
    let ano_actual = new Date().toString().split(' ')[3];
    if (new Date().getMonth() < 8) {
      ano_actual = String(parseInt(ano_actual, 10) - 1);
    }
    if (general === 'true') {
      const resultado = await models.Calendario.findAll({
        where: {
          ano: parseInt(ano, 10)
        },
        raw: true
      });
      if (resultado.length === 0) {
        const objeto_ano = {
          ano,
          estado: 0
        };
        await models.Calendario.findCreateFind({ where: objeto_ano });
        res.render('calendarios/calendario', {
          permisoDenegado: res.locals.permisoDenegado || null,
          general,
          calendario: array_datos[1],
          array_dias: array_datos[0],
          dic_diasSemana_1: array_datos[2],
          dic_diasSemana_2: array_datos[3],
          ano1: ano_actual,
          ano2: String(parseInt(ano_actual, 10) + 1),
          ano: req.ano_mostrar,
          estado: 0,
          semanas: array_datos[4],
          vacio
        });
      } else {
        res.render('calendarios/calendario', {
          permisoDenegado: res.locals.permisoDenegado || null,
          general,
          calendario: array_datos[1],
          array_dias: array_datos[0],
          dic_diasSemana_1: array_datos[2],
          dic_diasSemana_2: array_datos[3],
          ano1: ano_actual,
          ano2: String(parseInt(ano_actual, 10) + 1),
          ano: req.ano_mostrar,
          estado: resultado[0].estado,
          semanas: array_datos[4],
          vacio
        });
      }
    } else {
      const resultado = await models.Calendario.findAll({
        where: {
          ano: parseInt(ano, 10)
        },
        raw: true
      });
      if (resultado.length === 0) {
        const objeto_ano = {
          ano,
          estado: 0
        };
        await models.Calendario.findCreateFind({ where: objeto_ano });
        res.render('calendarios/calendarioCumplimentarJefeDeEstudios', {
          permisoDenegado: res.locals.permisoDenegado || null,
          general,
          calendario: array_datos[1],
          array_dias: array_datos[0],
          ano1: ano_actual,
          ano2: String(parseInt(ano_actual, 10) + 1),
          ano: req.ano_mostrar,
          estado: resultado[0].estado,
          semanas: array_datos[4]
        });
      } else {
        res.render('calendarios/calendarioCumplimentarJefeDeEstudios', {
          permisoDenegado: res.locals.permisoDenegado || null,
          general,
          calendario: array_datos[1],
          array_dias: array_datos[0],
          ano1: ano_actual,
          ano2: String(parseInt(ano_actual, 10) + 1),
          ano: req.ano_mostrar,
          estado: resultado[0].estado,
          semanas: array_datos[4]
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};
exports.getCalendarioPlanConsultar = async (req, res, next) => {
  try {
    req.calendario = {};
    const { ano } = req;
    if (ano === null) {
      res.render('calendarios/calendarioConsultar', {
        CONTEXT,
        permisoDenegado: res.locals.permisoDenegado || null,
        calendario: null,
        array_dias: null,
        ano: null,
        estado: 1
      });
      return;
    }
    req.session.ano = req.ano_mostrar;
    const array_datos = generarArrayDias(req.dic_eventos, ano);
    const resultado = await models.Calendario.findAll({
      where: {
        ano: parseInt(ano, 10)
      },
      raw: true
    });
    if (resultado.length === 0) {
      const objeto_ano = {
        ano,
        estado: 0
      };
      await models.Calendario.findCreateFind({ where: objeto_ano });
      res.render('calendarios/calendarioConsultar', {
        permisoDenegado: res.locals.permisoDenegado || null,
        calendario: array_datos[1],
        array_dias: array_datos[0],
        ano,
        estado: 0
      });
    } else if (resultado[0].estado === 0) {
      res.render('calendarios/calendarioConsultar', {
        permisoDenegado: res.locals.permisoDenegado || null,
        calendario: array_datos[1],
        array_dias: array_datos[0],
        ano,
        estado: 0
      });
    } else {
      res.render('calendarios/calendarioConsultar', {
        permisoDenegado: res.locals.permisoDenegado || null,
        calendario: array_datos[1],
        array_dias: array_datos[0],
        ano,
        estado: 1
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

/**
 * Esta funcion prepara todos las variables necesarias para general el pdf con el calendario
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getCalendarioPDF = async (req, res, next) => {
  try {
    req.calendario = {};
    if (res.locals.progDoc) {
      const { ano } = req;
      const array_datos = generarArrayDias(req.dic_eventos, ano);
      const resultado = await models.Calendario.findAll({
        where: {
          ano: parseInt(ano, 10)
        },
        raw: true
      });
      if (resultado.length === 0) {
        const objeto_ano = {
          ano,
          estado: 0
        };
        await models.Calendario.findCreateFind({ where: objeto_ano });
        req.calendario.estado = 0;
        next();
      } else {
        [req.calendario.array_dias, req.calendario.calendario] = array_datos;
        if (resultado[0].estado === 0) {
          req.calendario.estado = 0;
        } else {
          req.calendario.estado = 1;
        }
        next();
      }
    } else {
      next();
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

/**
 * Esta funcion se encarga perparar un diccionario con los eventos generales (comunes) en formato JSON para enviarlos al front-end
 * Estructura:
 *  {
 *      nombre: "Evento_nombre",
 *      fechaInicio: "2019-02-06",
 *      fechaFin: "Evento de dia",
 *      color: "#FFFF",
 *      editable: "0",
 *      mensaje: "06: Evento_nombre"
 *  }
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.eventosDiccionario = async (req, res, next) => {
  try {
    const dic_eventos = req.dic_eventos || {};
    const { ano } = req;
    const condicionesDeBusqueda = {
      fechaInicio: {
        // Solamente se coge los eventos de ese año
        gte: Date.parse(`${ano}-09-01`),
        lt: Date.parse(`${String(parseInt(ano, 10) + 1)}-09-01`)
      }
    };
    const events = await models.EventoGeneral.findAll({
      where: condicionesDeBusqueda,
      raw: true
    });
    events.forEach(e => {
      let nombre = e.evento;
      // en caso de que exista un evento especifico de plan no se coge el general
      // se debe actualizar con el evento general para ver si el general era editable
      for (const fechaInicioEvento in dic_eventos) {
        if (
          Object.prototype.hasOwnProperty.call(dic_eventos, fechaInicioEvento)
        ) {
          const eventoEditado = dic_eventos[fechaInicioEvento].find(
            obj => obj.identificador === e.identificador
          );
          if (eventoEditado) {
            eventoEditado.editable = e.editable;
            return;
          }
        }
      }
      let tipo = '';
      if (nombre.includes('eliminado//')) {
        tipo = 'eliminado';
      } else if (nombre.includes('festivo//')) {
        tipo = 'festivo';
        nombre = nombre.slice(9, nombre.length);
      } else if (nombre.includes('examenes//')) {
        tipo = 'examenes';
        nombre = nombre.slice(10, nombre.length);
      } else if (nombre.includes('tft//')) {
        tipo = 'tft';
        nombre = nombre.slice(5, nombre.length);
      } else if (nombre.includes('especial//')) {
        tipo = 'especial';
        nombre = nombre.slice(10, nombre.length);
      } else if (nombre.includes('ajuste//')) {
        tipo = 'ajuste';
        nombre = nombre.slice(8, nombre.length);
      } else if (nombre.includes('curso//')) {
        tipo = 'otro';
        nombre = nombre.slice(7, nombre.length);
      } else {
        tipo = 'otro';
      }
      let mensaje = '';
      let fechaFin;
      if (e.fechaFin === null) {
        mensaje = `${e.fechaInicio.split('-')[2]}: ${nombre}`;
        fechaFin = 'Evento de dia';
      } else {
        if (e.fechaInicio.split('-')[1] === e.fechaFin.split('-')[1]) {
          mensaje = `${e.fechaInicio.split('-')[2]}-${
            e.fechaFin.split('-')[2]
          }: ${nombre}`;
        } else {
          mensaje = `${e.fechaInicio.split('-')[2]}/${
            e.fechaInicio.split('-')[1]
          }-${e.fechaFin.split('-')[2]}/${e.fechaFin.split('-')[1]}: ${nombre}`;
        }
        fechaFin = e.fechaFin;
      }
      const objeto_evento = {
        identificador: e.identificador,
        nombre,
        fechaInicio: e.fechaInicio,
        fechaFin,
        color: e.color,
        editable: e.editable,
        mensaje: ` ${mensaje}`,
        tipo,
        identificadorEventoPlan: '0'
      };
      try {
        dic_eventos[e.fechaInicio].push(objeto_evento);
      } catch (error) {
        dic_eventos[e.fechaInicio] = [objeto_evento];
      }
    });
    req.dic_eventos = dic_eventos;
    next();
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

/**
 * Esta funcion se encarga perparar un diccionario con los eventos de un plan en formato JSON para enviarlos al front-end
 * Estructura:
 *  {
 *      nombre: "Evento_nombre",
 *      fechaInicio: "2019-02-06",
 *      fechaFin: "Evento de dia",
 *      color: "#FFFF",
 *      editable: "0",
 *      mensaje: "06: Evento_nombre"
 *  }
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.eventosPlanDiccionario = async (req, res, next) => {
  try {
    const dic_eventos = {};
    const { planID } = req.query;
    if (planID === undefined || planID === 'General') {
      next();
    } else {
      const { ano } = req;
      const events = await models.EventoPlan.findAll({
        where: {
          fechaInicio: {
            // Solamente se coge los eventos de ese año
            gte: Date.parse(`${ano}-09-01`),
            lt: Date.parse(`${String(parseInt(ano, 10) + 1)}-09-01`)
          },
          PlanEstudioId: planID
        },
        raw: true
      });
      events.forEach(e => {
        let nombre = e.evento;
        let tipo = '';
        // los eventos generales eliminados
        // en un calendario de un plan se devuelven con el nombre eliminado//
        if (nombre.includes('eliminado//')) {
          tipo = 'eliminado';
        } else if (nombre.includes('festivo//')) {
          tipo = 'festivo';
          nombre = nombre.slice(9, nombre.length);
        } else if (nombre.includes('examenes//')) {
          tipo = 'examenes';
          nombre = nombre.slice(10, nombre.length);
        } else if (nombre.includes('tft//')) {
          tipo = 'tft';
          nombre = nombre.slice(5, nombre.length);
        } else if (nombre.includes('especial//')) {
          tipo = 'especial';
          nombre = nombre.slice(10, nombre.length);
        } else if (nombre.includes('ajuste//')) {
          tipo = 'ajuste';
          nombre = nombre.slice(8, nombre.length);
        } else if (nombre.includes('curso//')) {
          tipo = 'otro';
          nombre = nombre.slice(7, nombre.length);
        } else {
          tipo = 'otro';
        }
        let mensaje = '';
        let fechaFin;
        if (e.fechaFin === null) {
          mensaje = `${e.fechaInicio.split('-')[2]}: ${nombre}`;
          fechaFin = 'Evento de dia';
        } else {
          if (e.fechaInicio.split('-')[1] === e.fechaFin.split('-')[1]) {
            mensaje = `${e.fechaInicio.split('-')[2]}-${
              e.fechaFin.split('-')[2]
            }: ${nombre}`;
          } else {
            mensaje = `${e.fechaInicio.split('-')[2]}/${
              e.fechaInicio.split('-')[1]
            }-${e.fechaFin.split('-')[2]}/${
              e.fechaFin.split('-')[1]
            }: ${nombre}`;
          }
          fechaFin = e.fechaFin;
        }
        const objeto_evento = {
          nombre,
          fechaInicio: e.fechaInicio,
          fechaFin,
          color: e.color,
          // por defecto se pone en editable los especificos de plan
          editable: enumsPD.eventoGeneral.Editable,
          mensaje: ` ${mensaje}`,
          tipo,
          identificador: e.EventoGeneralId,
          identificadorEventoPlan: e.identificador
        };
        try {
          dic_eventos[e.fechaInicio].push(objeto_evento);
        } catch (error) {
          dic_eventos[e.fechaInicio] = [objeto_evento];
        }
      });
      req.dic_eventos = dic_eventos;
      next();
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

/**
 * Esta función se encarga de guardar en req.ano el año sobre el cual se ha realizado la petición
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.anoDeTrabajo = (req, res, next) => {
  // Lo primero que hace el codigo es ver si se le ha metido el año como query
  let { ano } = req.query;

  if (ano === undefined) {
    if (
      req.originalUrl.includes('/cumplimentar/calendario') ||
      req.originalUrl.includes('/consultar/calendario')
    ) {
      if (req.session.pdID === null) {
        ano = null;
      } else {
        ano = req.session.pdID.split('_')[2].substring(0, 4);
      }
    }

    // En caso negativo, se obtiene el año actual (el de comienzo del curso, ej:19/20 --> 2019)
    else if (req.session.ano === undefined) {
      // eslint-disable-next-line prefer-destructuring
      ano = new Date().toString().split(' ')[3];
      req.ano_mostrar = ano;
    } else {
      ano = req.session.ano;
      req.ano_mostrar = ano;
    }
  } else {
    req.ano_mostrar = ano;
  }
  req.ano = ano;
  next();
};

/**
 * Esta función se encarga de guardar en req.ano el año sobre el cual se ha realizado la petición
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.anoDeTrabajoPDF = (req, res, next) => {
  /*
    let planID = req.session.pdID;
    let ano = planID.split("_")[2].substring(0,4);
    req.ano = ano */
  if (res.locals.progDoc) {
    try {
      req.ano =
        2000 +
        Number(
          `${res.locals.progDoc['ProgramacionDocentes.anoAcademico'][4]}${res.locals.progDoc['ProgramacionDocentes.anoAcademico'][5]}`
        ) -
        1;
    } catch (err) {
      req.ano =
        2000 +
        Number(
          `${res.locals.progDoc.anoAcademico[4]}${res.locals.progDoc.anoAcademico[5]}`
        ) -
        1;
    }
  }
  next();
};

// create or update eventoGeneral
exports.postEventoGeneral = async (req, res, next) => {
  try {
    let { fechaFin } = req.query;
    if (fechaFin !== undefined) {
      fechaFin = moment(fechaFin, 'YYYY-MM-DD');
    }
    const { fechaInicio } = req.query;
    const editable =
      req.query.editable === 'true'
        ? enumsPD.eventoGeneral.Editable
        : enumsPD.eventoGeneral.NoEditable;
    const nombre = req.query.evento;
    const evento = {
      evento: nombre,
      color: '',
      fechaInicio: moment(fechaInicio, 'YYYY-MM-DD'),
      fechaFin,
      editable
    };
    // si no existe se crea
    if (req.query.identificador === '0') {
      await models.EventoGeneral.findCreateFind({ where: evento });
      // res.status(409);
      res.json({ estado: 'exito' });
    } else {
      await models.EventoGeneral.update(evento, {
        where: { identificador: req.query.identificador }
      });
      // res.status(409);
      res.json({ estado: 'exito' });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

exports.deleteEventoGeneral = async (req, res, next) => {
  try {
    // borra el evento de los planes especificos
    // que habian sido borrados antes
    // los que ya habían sido modificados los deja
    await models.EventoPlan.destroy({
      where: {
        EventoGeneralId: req.query.identificador,
        evento: { [op.like]: 'eliminado//%' }
      }
    });
    // borra el evento general
    await models.EventoGeneral.destroy({
      where: {
        identificador: req.query.identificador
      }
    });
    res.json({ estado: 'exito' });
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

// EN REALIDAD SE GUARDA COMO ELIMINADO EN LA BBDD
// cuando se elimina un evento general en un calendario particular
exports.deleteEventoPlan = async (req, res, next) => {
  try {
    const { planID } = req.session;
    const eventoGeneralId = req.query.identificador;
    const { fechaInicio } = req.query;
    let nombre = req.query.evento;
    // si no es un eventoGeneral simplemente se borra
    if (eventoGeneralId === 'null') {
      await models.EventoPlan.destroy({
        where: {
          identificador: req.query.identificadorEventoPlan
        }
      });
      // res.status(409);
      res.json({ estado: 'exito' });
    } else {
      nombre = `eliminado//${nombre}`;
      const eventoEliminadoPlan = {
        evento: nombre,
        color: undefined,
        fechaInicio: moment(fechaInicio, 'YYYY-MM-DD'),
        fechaFin: undefined,
        PlanEstudioId: planID,
        EventoGeneralId: eventoGeneralId
      };
      await models.EventoPlan.destroy({
        where: {
          PlanEstudioId: planID,
          EventoGeneralId: eventoGeneralId
        }
      });
      await models.EventoPlan.findCreateFind({ where: eventoEliminadoPlan });
      // res.status(409);
      res.json({ estado: 'exito' });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};
// create or edit eventoPlan
exports.postEventoPlan = async (req, res, next) => {
  try {
    const { planID } = req.session;
    const eventoGeneralId = req.query.identificador;
    const nombre = req.query.evento;
    let { fechaInicio } = req.query;
    let { fechaFin } = req.query;
    const evento = {
      evento: nombre,
      color: undefined
    };
    if (fechaInicio) {
      fechaInicio = moment(fechaInicio, 'YYYY-MM-DD');
      evento.fechaInicio = fechaInicio;
    }
    if (fechaFin !== undefined) {
      fechaFin = moment(fechaFin, 'YYYY-MM-DD');
      evento.fechaFin = fechaFin;
    }
    // update eventoPlan no asociado a evento general
    if (eventoGeneralId === 'null') {
      evento.PlanEstudioId = planID;
      evento.EventoGeneralId = null;

      await models.EventoPlan.update(evento, {
        where: {
          identificador: parseInt(req.query.identificadorEventoPlan, 10)
        }
      });
      // res.status(409);
      res.json({ estado: 'exito' });
    } else if (eventoGeneralId === '0') {
      // create eventoPlan no asociado a evento general
      evento.PlanEstudioId = planID;
      evento.EventoGeneralId = null;
      await models.EventoPlan.findCreateFind({ where: evento });
      // res.status(409);
      res.json({ estado: 'exito' });
    } else {
      // create or update evento asociado a general
      evento.PlanEstudioId = planID;
      evento.EventoGeneralId = eventoGeneralId;
      await models.EventoPlan.destroy({
        where: {
          PlanEstudioId: planID,
          EventoGeneralId: eventoGeneralId
        }
      });
      await models.EventoPlan.findCreateFind({ where: evento });
      // res.status(409);
      res.json({ estado: 'exito' });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

exports.trasladarGeneral = async (req, res, next) => {
  try {
    const { ano } = req.query;
    let { newEstado } = req.query;
    newEstado = parseInt(newEstado, 10);
    if (ano === undefined) {
      res.status(400);
      res.json({
        estado: 'falta año'
      });
    } else if (newEstado !== 0 && newEstado !== 1) {
      res.status(400);
      res.json({
        estado: 'quiere pasar el calendario a un estado incorrecto'
      });
    } else {
      await models.Calendario.update(
        { estado: newEstado },
        { where: { ano: parseInt(ano, 10) } }
      );
      res.json({
        estado: 'exito'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

exports.getCalendarioPlan = async (req, res, next) => {
  try {
    const { ano } = req;
    if (ano === null) {
      res.render('calendarios/calendarioCumplimentar', {
        CONTEXT,
        permisoDenegado: res.locals.permisoDenegado || null,
        calendario: null,
        array_dias: null,
        ano: null,
        estado: 1
      });
      return;
    }
    const array_datos = generarArrayDias(req.dic_eventos, ano);
    const resultado = await models.Calendario.findAll({
      where: {
        ano: parseInt(ano, 10)
      },
      raw: true
    });
    if (resultado.length === 0) {
      const objeto_ano = {
        ano,
        estado: 0
      };
      await models.Calendario.findCreateFind({ where: objeto_ano });
      res.render('calendarios/calendarioCumplimentar', {
        permisoDenegado: res.locals.permisoDenegado || null,
        calendario: array_datos[1],
        array_dias: array_datos[0],
        ano,
        estado: 0
      });
    } else {
      res.render('calendarios/calendarioCumplimentar', {
        permisoDenegado: res.locals.permisoDenegado || null,
        calendario: array_datos[1],
        array_dias: array_datos[0],
        ano,
        estado: resultado[0].estado
      });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

exports.editablePlan = async (req, res, next) => {
  try {
    const { planID } = req.session;
    const { identificador } = req.query;
    const { editable } = req.query;
    if (editable === 'false') {
      await models.EventoPlan.destroy({
        where: {
          EventoGeneralId: identificador,
          PlanEstudioId: planID
        }
      });
      res.json({ estado: 'exito' });
    } else {
      const evento_general = await models.EventoGeneral.findOne({
        where: {
          identificador
        }
      });
      const evento = {
        evento: evento_general.evento,
        color: evento_general.color,
        fechaFin: evento_general.fechaFin,
        fechaInicio: evento_general.fechaInicio,
        PlanEstudioId: planID,
        EventoGeneralId: identificador
      };
      await models.EventoPlan.findOrCreate({
        where: {
          PlanEstudioId: planID,
          EventoGeneralId: identificador
        },
        defaults: evento
      });
      res.json({ estado: 'exito' });
    }
  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
};

exports.copiarEventos = async (req, res) => {
  const { ano } = req.query;
  if (ano === undefined) {
    res.status(400);
    res.json({
      estado: 'falta año'
    });
  } else {
    let transaction;
    try {
      const condicionesDeBusqueda = {
        fechaInicio: {
          // Solamente se coge los eventos de ese año
          gte: Date.parse(`${String(parseInt(ano, 10) - 1)}-09-01`),
          lt: Date.parse(`${ano}-09-01`)
        }
      };
      transaction = await models.sequelize.transaction();
      const eventosGeneral = await models.EventoGeneral.findAll({
        where: condicionesDeBusqueda,
        transaction,
        raw: true
      });
      const promises = [];
      // forEach no funciona con bucle de awaits por ser funcional
      for (let i = 0; i < eventosGeneral.length; i++) {
        const e = eventosGeneral[i];
        const nombre = e.evento;
        if (nombre.includes('festivo//')) {
          e.fechaInicio = moment(e.fechaInicio)
            .add(1, 'year')
            .format('YYYY-MM-DD');

          if (e.fechaFin !== null) {
            e.fechaFin = moment(e.fechaFin)
              .add(1, 'year')
              .format('YYYY-MM-DD');
          }
          delete e.identificador;
          promises.push(
            models.EventoGeneral.findOrCreate({ where: e, transaction })
          );
        } else {
          let { fechaInicio } = e;
          let { fechaFin } = e;
          if (e.fechaFin === null) {
            let nuevaFecha = moment(fechaInicio).add(1, 'year');
            if (nuevaFecha.day() === 0) {
              nuevaFecha = nuevaFecha.add(1, 'day');
            } else if (nuevaFecha.day() === 6) {
              nuevaFecha = nuevaFecha.add(2, 'day');
            }

            fechaInicio = nuevaFecha;
            e.fechaInicio = fechaInicio.format('YYYY-MM-DD');
            delete e.identificador;
            promises.push(
              models.EventoGeneral.findOrCreate({
                where: e,
                transaction
              })
            );
          } else {
            let nuevaFecha = moment(fechaInicio).add(1, 'year');
            let nuevaFechaFin = moment(fechaFin).add(1, 'year');
            if (nuevaFecha.day() === 0) {
              nuevaFecha = nuevaFecha.add(1, 'day');
              nuevaFechaFin = nuevaFechaFin.add(1, 'day');
            } else if (nuevaFecha.day() === 6) {
              nuevaFecha = nuevaFecha.add(2, 'day');
              nuevaFechaFin = nuevaFechaFin.add(2, 'day');
            }

            fechaInicio = nuevaFecha;
            fechaFin = nuevaFechaFin;

            e.fechaInicio = fechaInicio.format('YYYY-MM-DD');
            e.fechaFin = fechaFin.format('YYYY-MM-DD');
            delete e.identificador;
            promises.push(
              models.EventoGeneral.findOrCreate({
                where: e,
                transaction
              })
            );
          }
        }
      }
      await Promise.all(promises);
      // commit
      await transaction.commit();
      res.json({ estado: 'exito' });
    } catch (error) {
      // Rollback transaction only if the transaction object is defined
      if (transaction) await transaction.rollback();
      console.error(error);
      res.status(500);
      res.json({
        error: 'Ha ocurrido un error'
      });
    }
  }
};

/**
 * Borra los calendarios antiguos
 */
exports.borrarCalendarioAntiguos = async () => {
  try {
    const date = moment()
      .subtract(3, 'years')
      .format('YYYY-MM-DD');
    // borra eventos de plan
    await models.EventoPlan.destroy({
      where: {
        fechaInicio: {
          [op.lt]: date
        }
      }
    });
    // borra eventos generales
    await models.EventoGeneral.destroy({
      where: {
        fechaInicio: {
          [op.lt]: date
        }
      }
    });
  } catch (error) {
    console.error(error);
  }
};
