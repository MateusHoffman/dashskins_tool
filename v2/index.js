import { coletaTodosOsAnunciosAtivos } from './1_coletaTodosOsAnunciosAtivos.js';
import { mapearApenasDadosImportantes } from './2_mapearApenasDadosImportantes.js';
import { agruparAnunciosDoMesmoModelo } from './3_agruparAnunciosDoMesmoModelo.js';
import { coletarHistoricoDeVendasDeCadaModelo } from './4_coletarHistoricoDeVendasDeCadaModelo.js';
import { removerModelosQueNaoVendeuRecentemente } from './5_removerModelosQueNaoVendeuRecentemente.js';
import { ordenarModelosPorQuantidadeDeVendaDesc } from './6_ordenarModelosPorQuantidadeDeVendaDesc.js';
import { encontraPreçoIdeal } from './7_encontraPreçoIdeal.js';
import { filtraModelosQueVendePoucoNoPreçoIdeal } from './8_filtraModelosQueVendePoucoNoPreçoIdeal.js';
import { listaMelhoresAnunciosPorRentabilidade } from './9_listaMelhoresAnunciosPorRentabilidade.js';


(async () => {
  // await coletaTodosOsAnunciosAtivos()
  // await mapearApenasDadosImportantes()
  // await agruparAnunciosDoMesmoModelo()
  // await coletarHistoricoDeVendasDeCadaModelo()
  // await removerModelosQueNaoVendeuRecentemente()
  // await ordenarModelosPorQuantidadeDeVendaDesc()
  await encontraPreçoIdeal()
  await filtraModelosQueVendePoucoNoPreçoIdeal()
  await listaMelhoresAnunciosPorRentabilidade()
})()