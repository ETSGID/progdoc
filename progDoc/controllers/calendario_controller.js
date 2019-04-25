let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
let enumsPD = require('../enumsPD');


function comprobarColor(buffer_eventos, eventos, dia){
    var code = 0;
    var nuevo_buffer = [];
    var dia_objetoFecha = new Date(dia);
    for(var i in buffer_eventos){
        if(new Date(buffer_eventos[i].fechaFin) >= dia_objetoFecha){
            nuevo_buffer.push(buffer_eventos[i]);
            if(enumsPD.eventosTipo[buffer_eventos[i].tipo] > code){
                code = enumsPD.eventosTipo[buffer_eventos[i].tipo];
            }
        }
    }
    for(var i in eventos){
        if(eventos[i].fechaFin !== "Evento de dia"){
            nuevo_buffer.push(eventos[i]);
        }
        if(enumsPD.eventosTipo[eventos[i].tipo] > code){
            code = enumsPD.eventosTipo[eventos[i].tipo];
        }
    }
    return [code, nuevo_buffer];
}

function bisiesto(year){
    return (year % 100 === 0) ? (year % 400 === 0) : (year % 4 === 0);
}

function generarArrayDias(dic_eventos, ano){

    /**Primero generamos un array de enteros que sean todos los dias del año */
    


    uno_septiembre = new Date(parseInt(ano), 8, 1);

    dia_de_semana = uno_septiembre.getDay();    

    array_numeros = [];
    //Esta variable se requiere luego
    let dia = 0;
    if(dia_de_semana == 0){
        dia = 6;
        array_numeros = new Array(6);
    }else{
        dia = dia_de_semana-1;
        array_numeros = new Array(dia_de_semana-1);
    }


    mes_30_dias = Array.from(new Array(30),(val,index)=>index+1);
    meses_30 = ["0","2","7","9"]

    mes_31_dias = Array.from(new Array(31),(val,index)=>index+1);
    meses_31 = ["1","3","4","6","8","10","11"]
    febrero = []

    if(bisiesto(parseInt(ano))){
        febrero = Array.from(new Array(29),(val,index)=>index+1);
    }else{
        febrero = Array.from(new Array(28),(val,index)=>index+1);
    }

    for(var i in [...Array(12).keys()]){
        if(meses_30.includes(i)){
            array_numeros.push.apply(array_numeros, mes_30_dias);
            

        }else if(meses_31.includes(i)){
            array_numeros.push.apply(array_numeros, mes_31_dias);
            

        }else{
            array_numeros.push.apply(array_numeros, febrero);
        }
    }

    resto = array_numeros.length % 7;

    array_resto = new Array(7 - resto);

    array_numeros.push.apply(array_numeros, array_resto);

    /**Una vez tenemos el array procedemos a transformarlo en un array de objetos tipo dia (ver descripcion de este objeto mas abajo) */
    
    array_calendario = [];

    contador_meses = 0;
    offset_mes = 8;
    meses = ["", "Septiembre", "Octubre", "Noviembre", "Diciembre","Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto"];
    ano = parseInt(ano)
    let dic_dias = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0
    }
    let dic_dias_1 = {};
    let dic_dias_2 = {};
    let contar = false;
    
    
    //En esta variable se guardan los eventos que nos diarios
    var buffer_eventos = [];
    let vacaciones_offset = 0;
    let semanas = []
    let contador_semanas = 1
    let contador_dias_semana = 0
    let in_periodo_lectivo = false;
    for(var i = 0; i < array_numeros.length; i++){
        contador_dias_semana = (contador_dias_semana+1)%7
        if(contador_dias_semana === 0){
            if(in_periodo_lectivo){
                semanas.push(contador_semanas);
                contador_semanas += 1
            }else{
                semanas.push("")
            }
        }
        
        //console.log(i, dia, dic_dias)
        if(array_numeros[i] === undefined){
            array_calendario.push(undefined);
            continue;
        }
        num = array_numeros[i];
        if(num === 1){
            contador_meses += 1;
            if(contador_meses === 5){
                ano += 1;
                offset_mes = -4;
            }
        }
        numero = String(num).length === 1 ? "0" + String(num) : String(num);
        mes = meses[contador_meses];
        mes_codigo = String(contador_meses + offset_mes).length === 1 ? "0" + String(contador_meses + offset_mes) : String(contador_meses + offset_mes);
        codigo = ano + "-" + mes_codigo + "-" + numero;
        eventos = dic_eventos[codigo] === undefined ? [] : dic_eventos[codigo];
        
        if(contar){
            //console.log("EPA")
            let noContar = false
            for(var j =0 ; j < eventos.length; j++){
                
                let evento = eventos[j];
                //console.log(evento)
                if(evento.nombre === "Fin del periodo lectivo"){
                    contar = false;
                    noContar = true;
                    in_periodo_lectivo = false;
                    break;
                }
                if(evento.nombre === "Final del primer cuatrimestre"){
                    contar = false;
                    noContar = true;
                    dic_dias_1 = dic_dias;
                    contador_semanas = 1;
                    dic_dias = {
                        0: 0,
                        1: 0,
                        2: 0,
                        3: 0,
                        4: 0,
                        5: 0,
                        6: 0
                    };
                    in_periodo_lectivo = false;
                    break;
                }
                if(evento.tipo === "festivo"){
                    noContar = true;
                    if(evento.fechaFin !== "Evento de dia"){
                        if(evento.nombre === "Periodo festivo de navidades"){
                            contar = false;
                        }else{
                            //console.log((Date.parse(evento.fechaFin) - Date.parse(evento.fechaInicio))/86400000)
                            vacaciones_offset = 1 + (Date.parse(evento.fechaFin) - Date.parse(evento.fechaInicio))/86400000;
                        }
                        
                        
                    }
                    break;
                }
                
                try{
                    if(evento.nombre.substring(0, 6) === "Día de"){
                        if(evento.nombre.length === 12){
                            noContar = true
                            dic_dias[enumsPD.diasDeSemana["Lunes"]] += 1
                        }else if(evento.nombre.length === 13){
                            noContar = true
                            if(evento.nombre.substring(7, 13) === "Martes"){
                                dic_dias[enumsPD.diasDeSemana["Martes"]] += 1
                            }else{
                                dic_dias[enumsPD.diasDeSemana["Jueves"]] += 1
                            }
                        }else if(evento.nombre.length === 14){
                            noContar = true
                            dic_dias[enumsPD.diasDeSemana["Viernes"]] += 1
                        }else if(evento.nombre.length === 16){
                            noContar = true
                            dic_dias[enumsPD.diasDeSemana["Miercoles"]] += 1
                        }
                    }
                }catch (error){

                }
                if(noContar){
                    break;
                
                }
                
                
            }
            if(noContar){

            }else{
                dic_dias[dia] += 1
            }
        }else{
            //console.log("EPAA", vacaciones_offset);
            if(vacaciones_offset > 1){
                vacaciones_offset -= 1
            }else if(vacaciones_offset === 1){
                vacaciones_offset = 0
                contar = true
            }else if(eventos.length !== 0){
                
                for(var j =0 ; j < eventos.length; j++){
                    let evento = eventos[j];
                    //console.log(evento)
                    if(evento.nombre === "Inicio de las clases" || evento.nombre === "Comienzo del segundo cuatrimestre"){
                        in_periodo_lectivo = true;
                        contar = true;
                        dic_dias[dia] += 1;
                    }
                }

            }
        }
        dia = (dia + 1)%7;
        let comprobarColorArray = comprobarColor(buffer_eventos, eventos, codigo);
        //console.log(comprobarColorArray);
        let color = enumsPD.coloresEvento[comprobarColorArray[0]];
        buffer_eventos = comprobarColorArray[1];
        objeto = {
            numero: numero,
            mes: mes,
            mes_codigo: mes_codigo,
            codigo: codigo,
            ano: ano,
            eventos: eventos,
            color: color
        };
        array_calendario.push(objeto);
    }
    //console.log(dic_dias)
    return [array_calendario, array_numeros, dic_dias_1, dic_dias, semanas];


}

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

exports.getCalendario = function (req, res, next) {

    //console.log(req.dic_eventos);
    let ano = req.ano;
    //console.log(ano);
    array_datos = generarArrayDias(req.dic_eventos, ano);

    let ano_actual = (new Date()).toString().split(" ")[3];
    //onsole.log(ano_actual)
    let general = "false"
    if(req.query.planID === undefined){
        general = "true"
    }

    if((new Date()).getMonth() < 8){
        ano_actual = String(parseInt(ano_actual) - 1);
    }
    if(general === "true"){

        return models.Calendario.findAll({
            where:{
                ano: parseInt(ano)
            },
            raw: true
        }).then((resultado) => {
            //console.log(resultado);
            if(resultado.length === 0){
                let objeto_ano = {
                    ano: ano,
                    estado: 0
                };
                return models.Calendario.findCreateFind({where: objeto_ano })
                .then(
                    () => {
                        req.session.submenu = "Calendario";
                        res.render('calendario', {
                            contextPath: app.contextPath,
                            permisoDenegado: res.locals.permisoDenegado,
                            menu: req.session.menu,
                            submenu: req.session.submenu,
                            planID: req.session.planID,
                            general: general,
                            calendario: array_datos[1],
                            array_dias: array_datos[0],
                            dic_diasSemana_1: array_datos[2],
                            dic_diasSemana_2: array_datos[3],
                            ano1: String(parseInt(ano_actual) - 1),
                            ano2: ano_actual,
                            ano3: String(parseInt(ano_actual) + 1),
                            anoSeleccionado: ano,
                            estado: 0,
                            semanas: array_datos[4]
                        });
                    }
                );
            }else{
                req.session.submenu = "Calendario";
                res.render('calendario', {
                    contextPath: app.contextPath,
                    permisoDenegado: res.locals.permisoDenegado,
                    planID: req.session.planID,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    general: general,
                    calendario: array_datos[1],
                    array_dias: array_datos[0],
                    dic_diasSemana_1: array_datos[2],
                    dic_diasSemana_2: array_datos[3],
                    ano1: String(parseInt(ano_actual) - 1),
                    ano2: ano_actual,
                    ano3: String(parseInt(ano_actual) + 1),
                    anoSeleccionado: ano,
                    estado: resultado[0].estado,
                    semanas: array_datos[4]
                });
            }
            
        });
        //console.log("nop");
            
    }else{
        return models.Calendario.findAll({
            where:{
                ano: parseInt(ano)
            },
            raw: true
        }).then((resultado) => {
            //console.log(resultado);
            if(resultado.length === 0){
                let objeto_ano = {
                    ano: ano,
                    estado: 0
                };
                return models.Calendario.findCreateFind({where: objeto_ano })
                .then(
                    () => {
                        req.session.submenu = "Calendario";
                        res.render('calendarioCumplimentarJefeDeEstudios', {
                            contextPath: app.contextPath,
                            permisoDenegado: res.locals.permisoDenegado,
                            menu: req.session.menu,
                            submenu: req.session.submenu,
                            general: general,
                            planID: req.session.planID,
                            calendario: array_datos[1],
                            array_dias: array_datos[0],
                            ano1: String(parseInt(ano_actual) - 1),
                            ano2: ano_actual,
                            ano3: String(parseInt(ano_actual) + 1),
                            anoSeleccionado: ano,
                            estado: resultado[0].estado,
                            semanas: array_datos[4]
                        });
                    });
            }else{
                req.session.submenu = "Calendario";
                res.render('calendarioCumplimentarJefeDeEstudios', {
                    contextPath: app.contextPath,
                    permisoDenegado: res.locals.permisoDenegado,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    general: general,
                    calendario: array_datos[1],
                    array_dias: array_datos[0],
                    ano1: String(parseInt(ano_actual) - 1),
                    ano2: ano_actual,
                    ano3: String(parseInt(ano_actual) + 1),
                    anoSeleccionado: ano,
                    estado: resultado[0].estado,
                    semanas: array_datos[4]
                });
            }
        });
    }
}
exports.getCalendarioPlanConsultar = function(req, res, next){
    req.calendario = {};
    //console.log(req.dic_eventos);
    let ano = req.ano;
    //console.log(ano);
    array_datos = generarArrayDias(req.dic_eventos, ano);

    let ano_actual = (new Date()).toString().split(" ")[3];
    //onsole.log(ano_actual)
    if((new Date()).getMonth() < 8){
        ano_actual = String(parseInt(ano_actual) - 1);
    }

    return models.Calendario.findAll({
        where:{
            ano: parseInt(ano)
        },
        raw: true
    }).then((resultado) => {
        //console.log(resultado);
        if(resultado.length === 0){
            let objeto_ano = {
                ano: ano,
                estado: 0
            };
            return models.Calendario.findCreateFind({where: objeto_ano })
            .then(
                () => {
                        
                    req.session.submenu = "Calendario";
                    //console.log(req.session.submenu);
                    res.render('calendarioConsultar', {
                        contextPath: app.contextPath,
                        permisoDenegado: res.locals.permisoDenegado,
                        menu: req.session.menu,
                        submenu: req.session.submenu,
                        planID: req.session.planID,
                        calendario: array_datos[1],
                        array_dias: array_datos[0],
                        ano1: String(parseInt(ano_actual) - 1),
                        ano2: ano_actual,
                        ano3: String(parseInt(ano_actual) + 1),
                        anoSeleccionado: ano,
                        estado: 0
                    });
                    
                }
            );
        }else{
            if(resultado[0].estado === 0){
                req.session.submenu = "Calendario";
                //console.log(req.session.submenu);
                res.render('calendarioConsultar', {
                    contextPath: app.contextPath,
                    permisoDenegado: res.locals.permisoDenegado,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    calendario: array_datos[1],
                    array_dias: array_datos[0],
                    ano1: String(parseInt(ano_actual) - 1),
                    ano2: ano_actual,
                    ano3: String(parseInt(ano_actual) + 1),
                    anoSeleccionado: ano,
                    estado: 0
                });
            }else{
                
                req.session.submenu = "Calendario";
                //console.log(req.session.submenu);
                res.render('calendarioConsultar', {
                    contextPath: app.contextPath,
                    permisoDenegado: res.locals.permisoDenegado,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planID: req.session.planID,
                    calendario: array_datos[1],
                    array_dias: array_datos[0],
                    ano1: String(parseInt(ano_actual) - 1),
                    ano2: ano_actual,
                    ano3: String(parseInt(ano_actual) + 1),
                    anoSeleccionado: ano,
                    estado: 1
                });
            
            }
        }
        
    });
}
 
/**
 * Esta funcion prepara todos las variables necesarias para general el pdf con el calendario
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.getCalendarioPDF = function(req, res, next){
    req.calendario = {};
    //console.log(req.dic_eventos);
    let ano = req.ano;
    //console.log(ano);
    array_datos = generarArrayDias(req.dic_eventos, ano);

    let ano_actual = (new Date()).toString().split(" ")[3];
    //onsole.log(ano_actual)
    if((new Date()).getMonth() < 8){
        ano_actual = String(parseInt(ano_actual) - 1);
    }

    return models.Calendario.findAll({
        where:{
            ano: parseInt(ano)
        },
        raw: true
    }).then((resultado) => {
        //console.log(resultado);
        if(resultado.length === 0){
            let objeto_ano = {
                ano: ano,
                estado: 0
            };
            return models.Calendario.findCreateFind({where: objeto_ano })
            .then(
                () => {
                        
                        req.calendario.estado = 0;
                        next();
                    
                }
            );
        }else{
            if(resultado[0].estado === 0){
                req.calendario.estado = 0;
                next();
            }else{
                
                req.calendario.calendario = array_datos[1],
                req.calendario.array_dias = array_datos[0],
                req.calendario.estado = 1
                next();
            
            }
        }
        
    });
}


/**
 * Esta funcion se encarga perparar un diccionario con los eventos en formato JSON para enviarlos al front-end
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
exports.eventosDiccionario = function (req, res, next){
    //console.log(req);
    let dic_eventos = {};
    if(req.dic_eventos !== undefined){
        dic_eventos = req.dic_eventos
    }
    let editados = []
    //console.log()
    //console.log("EDITADOS", req.editados)
    if(req.editados !== undefined){
        editados = req.editados
    }
    //console.log(editados)
    let ano = req.ano;
    let condicionesDeBusqueda = {
        fechaInicio: {
            //Solamente se coge los eventos de ese año
            gte: Date.parse(ano + "-09-01"),
            lt: Date.parse(String(parseInt(ano) +1) + "-09-01")
        }
    }
    //console.log("\n", req.query.planID, req.originalUrl, req.baseUrl + "/gestion/calendario")
    if(req.query.planID !== undefined && req.originalUrl.includes("/gestion/calendario")){
        //console.log("HOLA!");
        condicionesDeBusqueda["editable"] = 0
    }
    
    
    return models.EventoGeneral.findAll({
        where: condicionesDeBusqueda,
        raw: true
    }).each((e) => {
        //console.log(e)
        var nombre = e.evento;
        if(editados.includes(e.identificador)){
            return;
        }
        let tipo = "";
        if(nombre.includes("festivo//")){
            tipo = "festivo";
            nombre = nombre.slice(9, nombre.length);
            //console.log(nombre);
        }else if(nombre.includes("examenes//")){
            tipo = "examenes";
            nombre = nombre.slice(10, nombre.length);
            //console.log(nombre);
        }else if(nombre.includes("tft//")){
            tipo = "tft";
            nombre = nombre.slice(5, nombre.length);
        }else if(nombre.includes("especial//")){
            tipo = "especial";
            nombre = nombre.slice(10, nombre.length);
        }else if(nombre.includes("ajuste//")){
            tipo = "ajuste";
            nombre = nombre.slice(8, nombre.length);
        }else if(nombre.includes("curso//")){
            tipo = "otro";
            nombre = nombre.slice(7, nombre.length);
        }else{
            tipo = "otro";
        }
        if(e.fechaFin === null){
            var mensaje = e.fechaInicio.split("-")[2] + ": " + nombre;
            var fechaFin = "Evento de dia";
        }else{
            //console.log(nombre);
            if(e.fechaInicio.split("-")[1] === e.fechaFin.split("-")[1]){
                var mensaje = e.fechaInicio.split("-")[2] + "-" + e.fechaFin.split("-")[2] + ": " + nombre;
            }else{
                var mensaje = e.fechaInicio.split("-")[2] + "/" +  e.fechaInicio.split("-")[1] + "-" + e.fechaFin.split("-")[2] + "/" + e.fechaFin.split("-")[1] + ": " + nombre;
            }
            var fechaFin = e.fechaFin;
        }
        var objeto_evento = {
            identificador: e.identificador,
            nombre: nombre,
            fechaInicio: e.fechaInicio,
            fechaFin: fechaFin,
            color: e.color,
            editable: e.editable,
            mensaje: (" " + mensaje),
            tipo: tipo,
            identificadorPlan: "0"
        };
        try{
            dic_eventos[e.fechaInicio].push(objeto_evento);
        }catch(error){
            dic_eventos[e.fechaInicio] = [objeto_evento];
        }
    }).then(
        () => {
            req.dic_eventos = dic_eventos;
            next();
        }
    );
}

/**
 * Esta funcion se encarga perparar un diccionario con los eventos en formato JSON para enviarlos al front-end
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
exports.eventosPlanDiccionario = function (req, res, next){
    let dic_eventos = {};

    let editados = [];

    let planID = req.session.planID;

    if(planID === undefined || planID === "General"){
        return
    }else{
        
        let ano = req.ano;
        return models.EventoPlan.findAll({
            where:{
                fechaInicio: {
                    //Solamente se coge los eventos de ese año
                    gte: Date.parse(ano + "-09-01"),
                    lt: Date.parse(String(parseInt(ano) +1) + "-09-01")
                },
                PlanEstudioId: planID
            },
            raw: true
        }).each((e) => {
            //console.log("PLAN", e)
            if(req.isJefeDeEstudios && e.EventoGeneralId === null){
                return
            }
            editados.push(e.EventoGeneralId);
            var nombre = e.evento;
            try{
                if(nombre.substring(0,11) === "eliminado//"){
                    return
                }
                
            }catch (error){
                console.log("ERROR", error)
            }
            
            let tipo = "";
            if(nombre.includes("festivo//")){
                tipo = "festivo";
                nombre = nombre.slice(9, nombre.length);
                //console.log(nombre);
            }else if(nombre.includes("examenes//")){
                tipo = "examenes";
                nombre = nombre.slice(10, nombre.length);
                //console.log(nombre);
            }else if(nombre.includes("tft//")){
                tipo = "tft";
                nombre = nombre.slice(5, nombre.length);
            }else if(nombre.includes("especial//")){
                tipo = "especial";
                nombre = nombre.slice(10, nombre.length);
            }else if(nombre.includes("ajuste//")){
                tipo = "ajuste";
                nombre = nombre.slice(8, nombre.length);
            }else if(nombre.includes("curso//")){
                tipo = "otro";
                nombre = nombre.slice(7, nombre.length);
            }else{
                tipo = "otro";
            }
            if(e.fechaFin === null){
                var mensaje = e.fechaInicio.split("-")[2] + ": " + nombre;
                var fechaFin = "Evento de dia";
            }else{
                //console.log(nombre);
                if(e.fechaInicio.split("-")[1] === e.fechaFin.split("-")[1]){
                    var mensaje = e.fechaInicio.split("-")[2] + "-" + e.fechaFin.split("-")[2] + ": " + nombre;
                }else{
                    var mensaje = e.fechaInicio.split("-")[2] + "/" +  e.fechaInicio.split("-")[1] + "-" + e.fechaFin.split("-")[2] + "/" + e.fechaFin.split("-")[1] + ": " + nombre;
                }
                var fechaFin = e.fechaFin;
            }
            var objeto_evento = {
                nombre: nombre,
                fechaInicio: e.fechaInicio,
                fechaFin: fechaFin,
                color: e.color,
                editable: enumsPD.eventoGeneral.Editable,
                mensaje: (" " + mensaje),
                tipo: tipo,
                identificador: e.EventoGeneralId,
                identificadorPlan: e.identificador
            };
            try{

                dic_eventos[e.fechaInicio].push(objeto_evento);
            }catch(error){
                dic_eventos[e.fechaInicio] = [objeto_evento];
            }
        }).then(
            () => {
                req.dic_eventos = dic_eventos;
                req.editados = editados
                next();
            }
        );
    }
    
}



/**
 * Esta función se encarga de guardar en req.ano el año sobre el cual se ha realizado la petición
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.anoDeTrabajo = function (req, res, next){
    //Lo primero que hace el codigo es ver si se le ha metido el año como query
    let ano = req.query.ano;
    //console.log(ano);
    if(ano === undefined){
        //En caso negativo, se obtiene el año actual (el de comienzo del curso, ej:19/20 --> 2019)
        ano = (new Date()).toString().split(" ")[3];
        if((new Date()).getMonth() < 8){
            ano = String(parseInt(ano) - 1);
        }
    }
    req.ano = ano;
    next();
    
}

/**
 * Esta función se encarga de guardar en req.ano el año sobre el cual se ha realizado la petición
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.anoDeTrabajoPDF = function (req, res, next){
    /*
    console.log("ESTAMOS!!!!!!\n\n");
    let planID = req.session.pdID;
    console.log(planID)
    let ano = planID.split("_")[2].substring(0,4);
    req.ano = ano*/
    req.ano = "2018";
    //console.log("LEEEL", req.session.pdID);
    next();
    
}

exports.postEventoGeneral = function (req, res, next) {
    //console.log("AQUI!\n")
    let meses = [" ", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre" , "Octubre", "Noviembre", "Diciembre"];
    let fechaFin = req.query.fechaFin;
    if(fechaFin !== undefined){
        
        fechaFin = Date.parse(fechaFin);
    }
    let fechaInicio = req.query.fechaInicio;
    
    let editable = req.query.editable === "true" ? enumsPD.eventoGeneral.Editable : enumsPD.eventoGeneral.NoEditable;
    let nombre = req.query.evento;

    
    let evento = {
        evento: nombre,
        color: "",
        fechaInicio: Date.parse(fechaInicio),
        fechaFin: fechaFin,
        editable: editable
    }    

    if(req.query.identificador === "0"){
        
        return models.EventoGeneral.findCreateFind({where: evento})
        .then(() => {
            //res.status(409);
            res.json({estado: "exito"});
        });
    }else{
        return models.EventoPlan.destroy({
            where:{
                EventoGeneralId: req.query.identificador
            }
        })
        .then(() => {
            return models.EventoGeneral.update(
                evento,
                {where: {identificador: req.query.identificador}})
            .then(() => {
    
                    //res.status(409);
                    res.json({estado: "exito"});
            });
        })        
    } 
    
}

exports.deleteEventoGeneral = function (req, res, next) {
    return models.EventoPlan.destroy({where: {
        EventoGeneralId: req.query.identificador
    }
        
    }).then(() => {
        return models.EventoGeneral.destroy({where: {
            identificador: req.query.identificador
        }
        }).then(() => {
            res.json({estado: "exito"});
        });
        
    });
    
    
}

//EN REALIDAD SE GUARDA COMO ELIMINADO EN LA BBDD
exports.deleteEventoPlan = function (req, res, next) {
    let planID = req.session.planID
    let eventoGeneralId = req.query.identificador;
    let nombre = req.query.evento;
    let fechaInicio = req.query.fechaInicio;
    
    if(eventoGeneralId === "null"){
        return models.EventoPlan.destroy({where: {
            identificador: req.query.identificadorPlan
        }})
        .then(() => {
            //res.status(409);
            res.json({estado: "exito"});
        });
    }else{
        nombre = "eliminado//" + nombre;
        let eventoEliminadoPlan = {
            evento: nombre,
            color: undefined,
            fechaInicio: Date.parse(fechaInicio),
            fechaFin: undefined,
            PlanEstudioId: planID,
            EventoGeneralId: eventoGeneralId
        } 
        return models.EventoPlan.destroy({where: {
            PlanEstudioId: planID,
            EventoGeneralId: eventoGeneralId
        }
        }).then(() => {
            return models.EventoPlan.findCreateFind({where: eventoEliminadoPlan})
            .then(() => {
                //res.status(409);
                res.json({estado: "exito"});
            });
        });
    }
}
    

exports.postEventoPlan = function (req, res, next) {
    let planID = req.session.planID
    let eventoGeneralId = req.query.identificador;
    let nombre = req.query.evento;
    let fechaInicio = req.query.fechaInicio;
    let fechaFin = req.query.fechaFin;
    let meses = [" ", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre" , "Octubre", "Noviembre", "Diciembre"];
    if(fechaFin !== undefined){
        fechaFin = Date.parse(fechaFin);
    }
    if(eventoGeneralId === "null"){
        let evento = {
            evento: nombre,
            color: undefined,
            fechaInicio: Date.parse(fechaInicio),
            fechaFin: fechaFin,
            PlanEstudioId: planID,
            EventoGeneralId: null
        }
        return models.EventoPlan.update(
            evento,
            {where: {identificador: parseInt(req.query.identificadorPlan)}}
        ).then(() => {
            //res.status(409);
            res.json({estado: "exito"});
        });
    }else{
        if(eventoGeneralId === "0"){
            //console.log("Es 0");
            eventoGeneralId = null;
        }
        
        let evento = {
            evento: nombre,
            color: undefined,
            fechaInicio: Date.parse(fechaInicio),
            fechaFin: fechaFin,
            PlanEstudioId: planID,
            EventoGeneralId: eventoGeneralId
        }
        return models.EventoPlan.destroy({where: {
            PlanEstudioId: planID,
            EventoGeneralId: eventoGeneralId
        }
        }).then(() => {
            return models.EventoPlan.findCreateFind({where: evento})
            .then(() => {
                //res.status(409);
                res.json({estado: "exito"});
            });
        });
    }
 
}

exports.aprobarGeneral = function (req, res, next) {
    let ano = req.query.ano;
    if(ano === undefined){
        res.status(400);
        res.json({
            estado: "falta año"
        });
    }else{
        return models.Calendario.update(
            {estado: 1},
            {where: {ano: parseInt(ano)}}
        ).then(
            () => {
                res.json({
                    estado: "exito"
                }); 
            }
        )
    }
}

exports.getCalendarioPlan = function (req, res, next) {
    //console.log("EVENTOS", req.dic_eventos)
    //console.log(req.dic_eventos);
    let ano = req.ano;
    //console.log(ano);
    array_datos = generarArrayDias(req.dic_eventos, ano);

    let ano_actual = (new Date()).toString().split(" ")[3];
    //onsole.log(ano_actual)
    if((new Date()).getMonth() < 8){
        ano_actual = String(parseInt(ano_actual) - 1);
    }

    return models.Calendario.findAll({
        where:{
            ano: parseInt(ano)
        },
        raw: true
    }).then((resultado) => {
        //console.log(resultado);
        if(resultado.length === 0){
            let objeto_ano = {
                ano: ano,
                estado: 0
            };
            return models.Calendario.findCreateFind({where: objeto_ano })
            .then(
                () => {
                    req.session.submenu = "Calendario";
                    res.render('calendarioCumplimentar', {
                        contextPath: app.contextPath,
                        permisoDenegado: res.locals.permisoDenegado,
                        menu: req.session.menu,
                        submenu: req.session.submenu,
                        planID: req.session.planID,
                        calendario: array_datos[1],
                        array_dias: array_datos[0],
                        ano1: String(parseInt(ano_actual) - 1),
                        ano2: ano_actual,
                        ano3: String(parseInt(ano_actual) + 1),
                        anoSeleccionado: ano,
                        estado: 0
                    });
                }
            );
        }else{
            
            req.session.submenu = "Calendario";
            res.render('calendarioCumplimentar', {
                contextPath: app.contextPath,
                permisoDenegado: res.locals.permisoDenegado,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planID: req.session.planID,
                calendario: array_datos[1],
                array_dias: array_datos[0],
                ano1: String(parseInt(ano_actual) - 1),
                ano2: ano_actual,
                ano3: String(parseInt(ano_actual) + 1),
                anoSeleccionado: ano,
                estado: resultado[0].estado
            });
            
            
        }
        
    });
    //console.log("nop");
}

exports.editablePlan = function (req, res, next) {
    let planID = req.session.planID;
    let identificador = req.query.identificador;
    let editable = req.query.editable;
    //console.log(editable);
    if(editable === "false"){
        //console.log("NO EDITABLE")
        return models.EventoPlan.destroy({
            where: {EventoGeneralId: identificador}
        }).then(
            () => {
                res.json({estado: "exito"});
            }
        )
    }else{
        //console.log("EDITABLE")
        return models.EventoGeneral.find({
            where: {
                identificador: identificador
            }
        }).then(
            (evento_general) => {
                let evento = {
                    evento: evento_general.evento,
                    color: evento_general.color,
                    fechaFin: evento_general.fechaFin,
                    fechaInicio: evento_general.fechaInicio,
                    PlanEstudioId: planID,
                    EventoGeneralId: identificador
                }
                return models.EventoPlan.findCreateFind({where: evento })
                .then(
                    () => {
                        res.json({estado: "exito"});
                    }
                )
            }
        )
    }
    
}