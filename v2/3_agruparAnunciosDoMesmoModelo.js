import { readFromJsonFile, writeToJsonFile } from "./helper.js";

export const agruparAnunciosDoMesmoModelo = async () => {
  console.log('agruparAnunciosDoMesmoModelo')

  const anuncios = await readFromJsonFile('./v2/data/2_apenasDadosImportantes.json')

  const agrupado = anuncios.reduce((acc, item) => {
    const { market_hash_name } = item;
    
    // Verifica se já existe um grupo para o market_hash_name atual
    if (!acc[market_hash_name]) {
      acc[market_hash_name] = {
        market_hash_name: market_hash_name,
        activeAds: []
      };
    }
    
    // Adiciona o item ao grupo correspondente
    acc[market_hash_name].activeAds.push(item);
    
    return acc;
  }, {});
  
  // Converte o objeto resultante em um array
  const anunciosAgrupados = Object.values(agrupado)

  console.log('Quantidade de modelos:', anunciosAgrupados.length)
  await writeToJsonFile('./v2/data/3_anunciosDoMesmoModeloAgrupado.json', anunciosAgrupados);
}