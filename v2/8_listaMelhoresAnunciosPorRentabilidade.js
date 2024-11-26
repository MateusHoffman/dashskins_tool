import { readFromJsonFile, writeToJsonFile } from "./helper.js";

export const listaMelhoresAnunciosPorRentabilidade = async () => {
  console.log('listaMelhoresAnunciosPorRentabilidade');
  try {
    // 1. Ler os modelos do arquivo JSON
    const modelos = await readFromJsonFile('./v2/data/7_modelosComPreçoIdeal.json');

    // 2. Inicializar um array vazio para armazenar todos os anúncios processados
    const listaDeMelhoresAnunciosPorRentabilidade = [];

    // 3. Iterar sobre cada modelo
    modelos.forEach(modelo => {
      const sellingPrice = modelo.sellingPrice; // Preço de venda do modelo
      const valueToBeReceived = parseFloat((sellingPrice * 0.9).toFixed(2)); // Subtrai 7% (0.07) 10% (0.9) do preço de venda

      // 4. Iterar sobre cada anúncio ativo do modelo
      modelo.activeAds.forEach(ad => {
        const profit = parseFloat((valueToBeReceived - ad.price).toFixed(2)); // Lucro bruto
        const profitability = parseFloat(((profit * 100) / ad.price).toFixed(2)); // Rentabilidade em porcentagem

        // 5. Criar um novo objeto de anúncio com os campos adicionais
        const anuncioAtualizado = {
          ...ad,
          sellingPrice, // Preço de venda do modelo
          valueToBeReceived, // Valor a ser recebido após 7% de desconto
          profit, // Lucro
          profitability // Rentabilidade
        };

        // 6. Adicionar o anúncio atualizado à lista final
        listaDeMelhoresAnunciosPorRentabilidade.push(anuncioAtualizado);
      });
    });

    // 7. Opcional: Ordenar os anúncios por rentabilidade descendente (do maior para o menor)
    listaDeMelhoresAnunciosPorRentabilidade.sort((a, b) => b.profitability - a.profitability)

    const anunciosComRentabilidadePositiva = listaDeMelhoresAnunciosPorRentabilidade.filter(anuncio => anuncio.profitability > 0);


    // 8. Escrever a lista final em um novo arquivo JSON
    await writeToJsonFile('./v2/data/8_listaDeMelhoresAnunciosPorRentabilidade.json', anunciosComRentabilidadePositiva);

    console.log('Processamento concluído com sucesso!');
  } catch (error) {
    console.error('Erro em listaMelhoresAnunciosPorRentabilidade:', error);
  }
};
