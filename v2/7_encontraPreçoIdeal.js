import { readFromJsonFile, writeToJsonFile } from "./helper.js";

export const encontraPreçoIdeal = async () => {
  console.log('encontraPreçoIdeal')
  try {
    // 1. Ler os modelos do arquivo JSON
    const modelos = await readFromJsonFile('./v2/data/6_modelosOrdenadosPorQuantidadeDeVena.json');

    const modelosComPreçoIdeal = []

    // Obter a data de hoje e a data de 30 dias atrás
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Função para converter a string de data em objeto Date
    function parseSaleDate(saleDateStr) {
      const [day, month, year] = saleDateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }

    for (const modelo of modelos) {
      // Filtrar salesHistory para datas entre thirtyDaysAgo e today
      const filteredSalesHistory = modelo.salesHistory.filter(sale => {
        const saleDate = parseSaleDate(sale.saleDate);
        return saleDate >= thirtyDaysAgo && saleDate <= today;
      });

      // Ordenar o salesHistory filtrado do menor para o maior preço
      filteredSalesHistory.sort((a, b) => a.price - b.price);

      const totalSales = filteredSalesHistory.length;
      const twentyPercent = Math.floor(totalSales * 0.2);
      const startIndex = twentyPercent;
      const endIndex = totalSales - twentyPercent;

      const trimmedSalesHistory = filteredSalesHistory.slice(startIndex, endIndex);

      if (trimmedSalesHistory.length < 30) {
        modelo.sellingPrice = null;
      } else {
        const maxArraySize = trimmedSalesHistory.length;
        const arraySizes = [];

        // Criar arrays aumentando de 10 em 10
        for (let size = 10; size <= maxArraySize; size += 10) {
          arraySizes.push(size);
        }
        if (arraySizes[arraySizes.length - 1] !== maxArraySize) {
          arraySizes.push(maxArraySize);
        }

        const averages = [];

        for (const size of arraySizes) {
          const subArray = trimmedSalesHistory.slice(0, size);
          const subArrayLength = subArray.length;
          const twentyPercentSub = Math.floor(subArrayLength * 0.2);
          const subStartIndex = twentyPercentSub;
          const subEndIndex = subArrayLength - twentyPercentSub;

          if (subStartIndex >= subEndIndex) continue;

          const subArrayTrimmed = subArray.slice(subStartIndex, subEndIndex);

          if (subArrayTrimmed.length > 0) {
            const totalPrice = subArrayTrimmed.reduce((sum, sale) => sum + sale.price, 0);
            const averagePrice = totalPrice / subArrayTrimmed.length;
            averages.push(averagePrice);
          }
        }

        if (averages.length > 0) {
          const sellingPrice = averages.reduce((sum, avg) => sum + avg, 0) / averages.length;
          modelo.sellingPrice = parseFloat(sellingPrice.toFixed(2));
          modelo.diffSteam = 100 - ((sellingPrice*100) / modelo.activeAds[0].steamPrice);
        } else {
          modelo.sellingPrice = null;
        }
      }

      // Remover o campo quantidadeVendas
      // delete modelo.quantidadeVendas;
      delete modelo.salesHistory;

      // Se sellingPrice não for null, adicionar o modelo ao array modelosComPreçoIdeal
      if (modelo.sellingPrice !== null) {
        modelosComPreçoIdeal.push(modelo);
      }
    }

    // 6. Escrever os modelos ordenados em um novo arquivo JSON
    await writeToJsonFile('./v2/data/7_modelosComPreçoIdeal.json', modelosComPreçoIdeal.sort((a,b) => b.sellingPrice - a.sellingPrice));
  } catch (error) {
    console.error('encontraPreçoIdeal', error);
  }
}
