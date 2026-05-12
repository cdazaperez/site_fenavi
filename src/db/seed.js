import { fileURLToPath } from 'url';
import { initDatabase } from './init.js';

const productos = [
  ['0207.11.00.00', 'Carne de gallo o gallina sin trocear, fresca o refrigerada', 164.4, 0, 5, 'F', 'Cuartos traseros', 'Contingente TLC con arancel 0%'],
  ['0207.12.00.00', 'Carne de gallo o gallina sin trocear, congelada', 164.4, 0, 5, 'F', 'Cuartos traseros', 'Contingente TLC con arancel 0%'],
  ['0207.13.00.10', 'Cuartos traseros de gallo o gallina, frescos o refrigerados', 164.4, 0, 5, 'F', 'Cuartos traseros', 'Producto más importado bajo TLC'],
  ['0207.13.00.90', 'Los demás trozos y despojos de gallo o gallina, frescos o refrigerados', 164.4, 0, 5, 'F', 'Cuartos traseros', null],
  ['0207.14.00.10', 'Cuartos traseros de gallo o gallina, congelados', 164.4, 0, 5, 'F', 'Cuartos traseros', 'Producto más importado bajo TLC'],
  ['0207.14.00.90', 'Los demás trozos y despojos de gallo o gallina, congelados', 164.4, 0, 5, 'F', 'Cuartos traseros', null],
  ['1602.32.10.00', 'Preparaciones de gallo o gallina, sin cocer', 70, 0, 19, 'D', null, 'Desgravación en 12 años'],
  ['1602.32.90.00', 'Las demás preparaciones de gallo o gallina', 70, 0, 19, 'D', null, 'Desgravación en 12 años'],
  ['0407.11.00.00', 'Huevos fértiles para incubar, de gallina', 15, 0, 0, 'A', null, 'Desgravación inmediata'],
  ['0408.11.00.00', 'Yemas de huevo, secas', 15, 0, 5, 'A', null, 'Desgravación inmediata'],
];

const normas = [
  ['decreto', '730', '2012-04-13', 'MinCIT', 'Implementación del TLC Colombia-EE.UU. para productos avícolas', 'Decreto que reglamenta la implementación del Acuerdo de Promoción Comercial entre Colombia y Estados Unidos en materia de productos avícolas.', null],
  ['decreto', '993', '2012-05-15', 'MinCIT', 'Entrada en vigencia del TLC Colombia-EE.UU.', 'Promulga el Acuerdo de Promoción Comercial entre la República de Colombia y los Estados Unidos de América.', null],
  ['resolucion', '3283', '2008-09-01', 'ICA', 'Requisitos sanitarios para importación de productos avícolas', 'Establece los requisitos sanitarios para la importación de aves, productos y subproductos avícolas al territorio colombiano.', null],
  ['resolucion', '5109', '2005-12-29', 'MinSalud', 'Reglamento técnico sobre rotulado de alimentos', 'Establece el reglamento técnico sobre los requisitos de rotulado o etiquetado que deben cumplir los alimentos envasados y materias primas de alimentos para consumo humano.', null],
  ['circular', '020', '2012-05-15', 'DIAN', 'Procedimiento aduanero para importaciones bajo TLC', 'Establece el procedimiento aduanero aplicable a las importaciones realizadas al amparo del TLC con Estados Unidos.', null],
  ['ley', '1143', '2007-07-04', 'Congreso', 'Aprobación del TLC Colombia-EE.UU.', 'Aprueba el Acuerdo de Promoción Comercial entre la República de Colombia y los Estados Unidos de América, sus cartas adjuntas y sus entendimientos.', null],
  ['resolucion', '000072', '2020-10-15', 'DIAN', 'Adopción del Arancel de Aduanas', 'Actualización del arancel de aduanas aplicable a productos avícolas importados.', null],
];

const pasos = [
  [1, 'Registro como importador ante la DIAN', 'Obtener el Registro Único Tributario (RUT) con la clasificación de actividad económica correspondiente a importación de productos avícolas.', 'DIAN', 'RUT actualizado, Cédula del representante legal, Cámara de Comercio', '5-10 días hábiles', 'clipboard-list'],
  [2, 'Permiso sanitario del ICA', 'Solicitar ante el ICA el permiso zoosanitario para la importación de productos de origen avícola, cumpliendo los requisitos de la Resolución 3283 de 2008.', 'ICA', 'Formulario ICA, Certificado sanitario del país de origen, Registro del establecimiento exportador', '15-20 días hábiles', 'shield-check'],
  [3, 'Registro sanitario INVIMA', 'Obtener el registro sanitario o permiso sanitario del INVIMA para productos de consumo humano de origen avícola.', 'INVIMA', 'Formulario INVIMA, Ficha técnica del producto, Certificado de venta libre del país de origen', '30-60 días hábiles', 'document-check'],
  [4, 'Verificación de subpartida arancelaria', 'Identificar la correcta clasificación arancelaria del producto a importar según el Arancel Integrado Andino (ARIAN) y verificar los tributos aplicables.', 'DIAN', 'Descripción técnica del producto, Composición del producto', '1-3 días hábiles', 'search'],
  [5, 'Solicitud de contingente arancelario (si aplica)', 'Para productos cubiertos por contingente TLC como cuartos traseros, solicitar la asignación de cupo ante el MinCIT.', 'MinCIT', 'Certificado de origen, Factura comercial, Solicitud formal de contingente', '5-10 días hábiles', 'calculator'],
  [6, 'Trámite aduanero de importación', 'Realizar la declaración de importación ante la DIAN, pagar los tributos correspondientes (arancel + IVA) y obtener el levante de la mercancía.', 'DIAN / Agente de Aduana', 'Declaración de importación, Factura comercial, Documento de transporte, Certificado de origen, Permisos ICA/INVIMA', '3-5 días hábiles', 'truck'],
  [7, 'Inspección y liberación', 'Inspección física y documental de la mercancía por parte del ICA e INVIMA en el punto de ingreso. Una vez aprobada, se autoriza la nacionalización.', 'ICA / INVIMA / DIAN', 'Todos los documentos anteriores, Manifiesto de carga', '1-3 días hábiles', 'check-circle'],
];

const tlcData = [
  ['general', 'Acuerdo de Promoción Comercial Colombia - EE.UU.', 'El Tratado de Libre Comercio (TLC) entre Colombia y Estados Unidos entró en vigencia el 15 de mayo de 2012 mediante el Decreto 993. Este acuerdo comercial establece las condiciones para el comercio bilateral de productos avícolas, incluyendo esquemas de desgravación arancelaria y contingentes.', 1],
  ['general', 'Impacto en el sector avícola', 'Para el sector avícola, el TLC significó acceso sin restricciones arancelarias a materias primas de origen estadounidense (maíz amarillo, fríjol soya, torta de soya). Simultáneamente, se desmontaron instrumentos de protección como el Sistema Andino de Franjas de Precios (SAFP) y la licencia previa de importación de productos avícolas.', 2],
  ['desgravacion', 'Categorías de desgravación', '<strong>Categoría A:</strong> Desgravación inmediata a 0% desde la entrada en vigencia del TLC.<br><strong>Categoría D:</strong> Desgravación lineal en 12 años hasta alcanzar 0%.<br><strong>Categoría F:</strong> Productos sujetos a contingente arancelario con arancel 0% dentro del contingente y arancel NMF fuera del contingente. El contingente crece anualmente.', 3],
  ['desgravacion', 'Contingente de cuartos traseros de pollo', 'El contingente arancelario para cuartos traseros de pollo comenzó con 27,040 toneladas en 2012, con un crecimiento anual del 4% compuesto. Los volúmenes dentro del contingente ingresan con arancel 0%, mientras que los volúmenes fuera del contingente pagan el arancel NMF vigente (164.4%).', 4],
  ['obligaciones', 'Certificado de origen', 'Para acceder a las preferencias arancelarias del TLC, el importador debe presentar un certificado de origen válido que demuestre que el producto fue producido o elaborado en Estados Unidos conforme a las reglas de origen del acuerdo.', 5],
  ['obligaciones', 'Requisitos sanitarios', 'Las importaciones deben cumplir con todos los requisitos sanitarios y fitosanitarios establecidos por las autoridades colombianas (ICA, INVIMA), independientemente de las preferencias arancelarias del TLC. El capítulo de medidas sanitarias y fitosanitarias del TLC establece mecanismos de cooperación y transparencia.', 6],
];

export function seedIfEmpty(db) {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM productos').get();
  if (count > 0) return;

  console.log('Seeding database with initial data...');

  const insertProducto = db.prepare('INSERT OR IGNORE INTO productos (subpartida, descripcion, arancel_base, arancel_tlc, iva, categoria_desgravacion, contingente, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertNorma = db.prepare('INSERT OR IGNORE INTO normatividad (tipo, numero, fecha, entidad, titulo, descripcion, url_documento) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertPaso = db.prepare('INSERT OR IGNORE INTO pasos_importacion (orden, titulo, descripcion, entidad_responsable, documentos_requeridos, tiempo_estimado, icono) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertTlc = db.prepare('INSERT OR IGNORE INTO tlc_info (seccion, titulo, contenido, orden) VALUES (?, ?, ?, ?)');
  const insertDoc = db.prepare('INSERT OR IGNORE INTO documentos (titulo, descripcion, categoria, nombre_archivo, url_archivo, tamano) VALUES (?, ?, ?, ?, ?, ?)');

  const documentos = [
    ['Guía de Importación de Pollo - TLC Colombia-EE.UU.', 'Guía completa para la importación de pollo en el marco del TLC entre Colombia y Estados Unidos, incluyendo subpartidas arancelarias y requisitos.', 'guia', 'guia_importacion_pollo_FENAVI.pdf', '/docs/manuales/guia_importacion_pollo_FENAVI.pdf', '2.3 MB'],
    ['Guía de Exportaciones e Importaciones ICA', 'Manual paso a paso del ICA para los trámites de exportación e importación de productos de origen animal.', 'manual', 'guia_de_Expo_Impo_ICA.pdf', '/docs/manuales/guia_de_Expo_Impo_ICA.pdf', '1.8 MB'],
    ['Decreto 730 de 2012 - Implementación TLC', 'Texto completo del Decreto 730 de 2012 que reglamenta la implementación del TLC en materia de productos avícolas.', 'normativa', 'decreto_730_2012.pdf', '/docs/normativa/decreto_730_2012.pdf', '540 KB'],
    ['Decreto 993 de 2012 - Entrada en vigencia TLC', 'Texto completo del Decreto 993 de 2012 que promulga el Acuerdo de Promoción Comercial Colombia-EE.UU.', 'normativa', 'decreto_993_2012.pdf', '/docs/normativa/decreto_993_2012.pdf', '1.2 MB'],
    ['Formato de Solicitud de Contingente Arancelario', 'Formato oficial para solicitar la asignación de contingente arancelario ante el MinCIT.', 'formato', 'formato_contingente_mincit.pdf', '/docs/formatos/formato_contingente_mincit.pdf', '320 KB'],
    ['Resolución ICA 3283 de 2008', 'Requisitos sanitarios para la importación de aves, productos y subproductos avícolas al territorio colombiano.', 'normativa', 'resolucion_ica_3283_2008.pdf', '/docs/normativa/resolucion_ica_3283_2008.pdf', '890 KB'],
  ];

  const seedAll = db.transaction(() => {
    for (const p of productos) insertProducto.run(...p);
    for (const n of normas) insertNorma.run(...n);
    for (const p of pasos) insertPaso.run(...p);
    for (const t of tlcData) insertTlc.run(...t);
    for (const d of documentos) insertDoc.run(...d);
  });

  seedAll();
  console.log('Database seeded successfully');
}

// Run directly if called as a script
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  const db = initDatabase();
  seedIfEmpty(db);
  db.close();
}
