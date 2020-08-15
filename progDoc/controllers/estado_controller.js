const estados = require('../estados');
const departamentoController = require('./departamento_controller');
const enumsPD = require('../enumsPD');

exports.getEstado = async (req, res, next) => {
  // si no hay progDoc o no hay departamentosResponsables de dicha progDoc
  if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
    const view =
      req.session.menuBar === enumsPD.menuBar.consultar.nombre
        ? 'estados/estadoConsultar'
        : 'estados/estadoCumplimentar';
    res.render(view, {
      existe: 'Programación docente no abierta',
      permisoDenegado: res.locals.permisoDenegado || null,
      planID: req.session.planID,
      departamentoID: req.session.departamentoID,
      planEstudios: res.locals.planEstudios,
      // para diferenciar entre pantalla mostrar el estado o poder cambiarlo en gestionPlanes
      verEstado: true
    });
  } else {
    try {
      req.session.pdID =
        res.locals.progDoc['ProgramacionDocentes.identificador'];
      let departamentoID;
      if (res.locals.departamentosResponsables.length > 0) {
        departamentoID = req.session.departamentoID
          ? req.session.departamentoID
          : res.locals.departamentosResponsables[0].codigo;
      } else {
        departamentoID = req.session.departamentoID
          ? req.session.departamentoID
          : null;
      }
      // si no estaba inicializada la inicializo.
      req.session.departamentoID = departamentoID;
      const view =
        req.session.menuBar === enumsPD.menuBar.consultar.nombre
          ? 'estados/estadoConsultar'
          : 'estados/estadoCumplimentar';
      const departamentos = await departamentoController.getAllDepartamentos();
      res.render(view, {
        permisoDenegado: res.locals.permisoDenegado || null,
        planID: req.session.planID,
        departamentoID: req.session.departamentoID,
        planEstudios: res.locals.planEstudios,
        departamentos,
        progDoc: res.locals.progDoc,
        estadosProfesor: estados.estadoProfesor,
        estadosTribunal: estados.estadoTribunal,
        estadosHorario: estados.estadoHorario,
        estadosExamen: estados.estadoExamen,
        estadosCalendario: estados.estadoCalendario,
        estadosProgDoc: estados.estadoProgDoc,
        pdID: req.session.pdID,
        // para diferenciar entre mostrar el estado o poder cambiarlo en gestionPlanes
        verEstado: true
      });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  }
};
