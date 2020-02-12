
exports.getHistorial = function (req, res) {
  res.render('menus/historial', {
    menu: req.session.menu,
    planID: req.session.planID,
    departamentosResponsables: res.locals.departamentosResponsables,
    planEstudios: res.locals.planEstudios,
    PDsWithPdf: res.locals.PDsWithPdf,
    anosExistentes: res.locals.anosExistentes,
    pdSeleccionada: res.locals.pdSeleccionada,
  });
};
