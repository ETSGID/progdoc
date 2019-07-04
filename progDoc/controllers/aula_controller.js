let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
let enumsPD = require('../enumsPD');
let menuProgDocController = require('./menuProgDoc_controller');


/**
* Esta funcion se encarga de obtener los grupos que hay en cada aula y renderizar la página con el horario de las aulas.
* 
* @param {*} req 
* @param {*} res 
* @param {*} next 
*/

exports.getAulas = async function (req, res, next) {
    let anoSeleccionado = req.query.ano;
    let ano = (new Date()).toString().split(" ")[3];
    if((new Date()).getMonth() < 8){
        ano = String(parseInt(ano) - 1);
    }
    req.ano_mostrar = String(parseInt(ano) + 1);
    let ano1 = ano;
    let ano2 = parseInt(ano) + 1;
    if (anoSeleccionado === undefined) {
        anoSeleccionado = ano2;
    }
    let ano_codigo = anoSeleccionado + String(parseInt(anoSeleccionado) + 1).substring(2,4);
    let planes = res.locals.planEstudios.map( (obj) => {
        return obj.codigo
    })
    var programacionesDocentes = []
    await menuProgDocController.getAllProgramacionDocentes(planes, "1S", ano_codigo).then((p) =>{
        programacionesDocentes = planes.map((obj) => {
            if(p[obj].length !== 0 && p[obj] !== undefined){
                return p[obj][0].identificador
            }
        })
    })
    programacionesDocentes = programacionesDocentes.filter(function( element ) {
        return element !== undefined;
    });

    gruposPorProgramacionDocente = await menuProgDocController.getAllGruposConAula(programacionesDocentes);
    let offsetDeDiasDeSemana = {
        "L": 0,
        "M": 13,
        "X": 26,
        "J": 39,
        "V": 52,
        "S": 65
    }
    let aulas1 = []
    let aulas2 = []
    let gruposPorAula1 = {}
    let gruposPorAula2 = {}
    for(let i = 0; i<programacionesDocentes.length; i++){
        if(gruposPorProgramacionDocente[programacionesDocentes[i]] === undefined || gruposPorProgramacionDocente[programacionesDocentes[i]].length === 0){
            continue;
        }else{
            for(let j=0; j<gruposPorProgramacionDocente[programacionesDocentes[i]].length; j++){
                let g = gruposPorProgramacionDocente[programacionesDocentes[i]][j]
                if(g.aula === null){
                    return;
                }
                let aula = g.aula.split(".").join("").toLowerCase();
                if(aula.length === 2){
                    aula = aula[0] + "00" + aula[1];
                }else if(aula.length === 3){
                    aula = aula[0] + "0" + aula[1] + aula[2];
                }
                if(g.nombre.split(".")[1] === "1"){
                    if(!aulas1.includes(aula)){
                        aulas1.push(aula)
                        gruposPorAula1[aula] = new Array(78)
                    }
                }else{
                    if(!aulas2.includes(aula)){
                        aulas2.push(aula)
                        gruposPorAula2[aula] = new Array(78)
                    }
                }
                
                let nombreGrupo = g.ProgramacionDocenteId.substring(3,7) + " " + g.nombre;
                
                let horarios = await models.AsignacionProfesor.findAll({
                    where: {
                        GrupoId: g.grupoId,
                        Dia: {
                            $ne: null
                        },
                        HoraInicio: {
                            $ne: null
                        }
                    }
                });
                for(let z = 0; z<horarios.length; z++){
    
                    let offsetHora = parseInt(horarios[z].HoraInicio.substring(0,2)) - 8
                    let offsetTotal = offsetHora + offsetDeDiasDeSemana[horarios[z].Dia]
                    if(g.nombre.split(".")[1] === "1"){
                        if(gruposPorAula1[aula][offsetTotal] === undefined){
                            gruposPorAula1[aula][offsetTotal] = nombreGrupo;
                        }else if(gruposPorAula1[aula][offsetTotal].includes(nombreGrupo)){
                            ;
                        }else{
                            gruposPorAula1[aula][offsetTotal] += " / " + nombreGrupo;
                        }
                        
                    }else{
                        if(gruposPorAula2[aula][offsetTotal] === undefined){
                            gruposPorAula2[aula][offsetTotal] = nombreGrupo;
                        }else if(gruposPorAula2[aula][offsetTotal].includes(nombreGrupo)){
                            ;
                        }else{
                            gruposPorAula2[aula][offsetTotal] += " / " + nombreGrupo;
                        }                
                    }
                }

            }
        }
    }
     
    aulas1.sort()
    aulas2.sort()
    req.session.submenu = "Aulas";
    res.render('aulas', {
        contextPath: app.contextPath,
        permisoDenegado: res.locals.permisoDenegado,
        menu: req.session.menu,
        submenu: req.session.submenu,
        planID: req.session.planID,
        aulas1: aulas1,
        aulas2: aulas2,
        gruposPorAula1: gruposPorAula1,
        gruposPorAula2: gruposPorAula2,
        ano1: String(ano1),
        ano2: String(ano2),
        anoSeleccionado: String(anoSeleccionado)
    });
}