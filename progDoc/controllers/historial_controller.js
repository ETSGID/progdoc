exports.getHistorial = (req, res) => {
  res.render('menus/historial', {
    planID: req.session.planID,
    departamentosResponsables: res.locals.departamentosResponsables,
    planEstudios: res.locals.planEstudios,
    PDsWithPdf: res.locals.PDsWithPdf,
    anosExistentes: res.locals.anosExistentes,
    pdSeleccionada: res.locals.pdSeleccionada
  });
};
