// diferenciamos los periodos de la programacion docente por semestre
// y por ordinarios y extraordinarios
exports.periodoPD = {
  S1_O: '1S-O',
  S1_E: '1S-E',
  S2_O: '2S-O',
  S2_E: '2S-E'
};

const rols = {
  Admin: 'Admin',
  JefeEstudios: 'JefeEstudios',
  ResponsableDocente: 'ResponsableDocente',
  ResponsableDocenteX2: 'ResponsableDocenteDelegado',
  DirectorDepartamento: 'DirectorDepartamento',
  DirectorDepartamentoX2: 'DirectorDepartamentoDelegado',
  CoordinadorTitulacion: 'CoordinadorTitulacion',
  CoordinadorTitulacionX2: 'CoordinadorTitulacionDelegado',
  SecretarioTitulacion: 'SecretarioTitulacion',
  SubdirectorPosgrado: 'SubdirectorPosgrado'
};

exports.rols = rols;

// en delegacion se fija un array con los posibles roles delegados. Los delegados pueden hacer todo.
exports.delegacion = {
  [rols.Admin]: [],
  [rols.JefeEstudios]: [rols.SecretarioTitulacion],
  [rols.DirectorDepartamento]: [rols.DirectorDepartamentoX2],
  [rols.CoordinadorTitulacion]: [rols.CoordinadorTitulacionX2],
  [rols.ResponsableDocente]: [rols.ResponsableDocenteX2],
  [rols.SubdirectorPosgrado]: []
};

exports.eventoGeneral = {
  NoEditable: 0,
  Editable: 1
};

exports.eventosTipo = {
  ajuste: 1,
  examenes: 2,
  especial: 3,
  tft: 4,
  festivo: 5,
  otro: 6
};

exports.coloresEvento = {
  0: 'white',
  1: 'SpringGreen',
  2: 'yellow',
  3: 'red',
  4: 'LightSkyBlue',
  5: 'grey',
  6: 'Orange'
};

exports.diasDeSemana = {
  Lunes: 0,
  Martes: 1,
  Miercoles: 2,
  Jueves: 3,
  Viernes: 4
};
