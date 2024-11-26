import { readFromJsonFile, transformarString, writeToJsonFile } from "./helper.js";

export const mapearApenasDadosImportantes = async () => {
  console.log('mapearApenasDadosImportantes')

  const anuncios = await readFromJsonFile('./v2/data/1_todosOsAnunciosAtivos.json')

  const anunciosMapeados = anuncios.map(e => {
    return {
      id: e._id,
      market_hash_name: e.market_hash_name,
      price: e.price,
      steamPrice: e.steamPrice,
      // link: `https://www.google.com/search?q=%22${e._id}%22&btnI=1`,
      link: `https://dashskins.com.br/item/${transformarString(e.market_hash_name)}/${e._id}`,
    }
  })

  console.log('Quantidade de anuncios:', anunciosMapeados.length)
  await writeToJsonFile('./v2/data/2_apenasDadosImportantes.json', anunciosMapeados);
}