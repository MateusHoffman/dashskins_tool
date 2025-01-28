import fs from 'fs/promises';
import path from 'path';
import { projectRoot } from './utils/constants.js';
import { createQueryString } from './utils/createQueryString.js';
import fetch from './utils/fetch.js';

const obterAnunciosBaratos = async () => {
  try {
    console.log('Obtendo anúncios baratos...');

    const pathModelosMaisVendidos = path.join(projectRoot, 'src/db/modelosMaisVendidos.json');
    const modelosMaisVendidosJson = await fs.readFile(pathModelosMaisVendidos, 'utf-8');
    const modelosMaisVendidos = JSON.parse(modelosMaisVendidosJson);

    let anuncios = [];

    for (const [index, modelo] of modelosMaisVendidos.entries()) {
      console.log(`${index+1}/${modelosMaisVendidos.length}: ${modelo.nome}`)

      const query = createQueryString({
        search: modelo.nome,
        item_type: '',
        rarity: '',
        itemset: '',
        exterior: '',
        weapon: '',
        has_sticker: '',
        has_charm: '',
        has_stattrak: '',
        is_souvenir: '',
        is_instant: '',
        sort_by: 'price',
        sort_dir: 'asc',
        limit: '',
        page: 1,
        price_max: modelo.comprarAbaixoDe,
      })

      const requestOptions = {
        method: 'GET',
        url: `https://dashskins.com.br/api/listing${query}`,
      }
      const response = await fetch(requestOptions);
      const data = response.data
      if (Array.isArray(data.results) && data.results.length > 0) {
        anuncios.push(...data.results.map(anuncio => {
          const lucro = modelo.precoDeVenda - (modelo.precoDeVenda * 0.07 ) - anuncio.price
          return {
          id: anuncio._id,
          nome: anuncio.market_hash_name,
          precoDeCompra: anuncio.price,
          precoDeVenda: modelo.precoDeVenda,
          lucro: lucro,
          rentabilidade: `${(lucro / anuncio.price)*100}%`}
        }));
      }
    }

    // Ordena os anúncios do maior para o menor lucro
    anuncios.sort((a, b) => b.lucro - a.lucro);

    const pathAnunciosBaratos = path.join(projectRoot, 'src/db/anunciosBaratos.json');
    await fs.writeFile(pathAnunciosBaratos, JSON.stringify(anuncios, null, 2));
  } catch (error) {
    console.error('Erro ao obter anúncios baratos', error);
  }
}

const loopInfinito = async () => {
  while (true) {
    await obterAnunciosBaratos(); // Executa a função principal
    console.log('Execução concluída. Aguardando 30 minutos antes da próxima execução...');
    await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000)); // Aguarda 30 minutos
  }
};

loopInfinito();