let app = require('../app');
let models = require('../models');
let Sequelize = require('sequelize');
const Op = Sequelize.Op;

exports.getPDsWithPdf = function (req, res, next) {
    let anos = [];
    res.locals.pdSeleccionada = req.query.pdSeleccionada;
    res.locals.fileSeleccionado = null;
    if (res.locals.pdSeleccionada) {
        let elements = res.locals.pdSeleccionada.split("_")
        res.locals.fileSeleccionado = elements[1] + "/" + elements[2] + "/" + elements[3] + "/" + res.locals.pdSeleccionada
    }

    return models.ProgramacionDocente.findAll({
        attributes: ["identificador", "anoAcademico", "PlanEstudioId", "HistorialID"],
        where: {
            HistorialID: {
                [Op.ne]: null
            }
        },
        order: [
            [Sequelize.literal('"identificador"'), 'DESC'],
        ],
        raw: true
    }).each((pd) => {
        let ano = anos.find(function (obj) { return obj === pd.anoAcademico; });
        if (!ano) {
            anos.push(pd.anoAcademico);
        }
    })
        .then((pds) => {
            anos.sort().reverse();
            res.locals.anosExistentes = anos;
            res.locals.PDsWithPdf = pds;
            next();
        }).catch(function (error) {
            console.log("Error:", error);
            //TODO BORRAR LA PD Y LO QUE CAE DE ELLA PQ DIO ERROR Y VER SI EL ERROR ES ITNERNO TAMBIEN HACE ESTO
            next(error);
        });
}

