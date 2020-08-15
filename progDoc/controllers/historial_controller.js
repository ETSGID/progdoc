exports.getHistorial = (req, res) => {
  res.render('historial', {
    departamentosResponsables: res.locals.departamentosResponsables,
    planEstudios: res.locals.planEstudios,
    PDsWithPdf: res.locals.PDsWithPdf,
    anosExistentes: res.locals.anosExistentes,
    pdSeleccionada: res.locals.pdSeleccionada
  });
};
