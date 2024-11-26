import { readFromJsonFile, writeToJsonFile } from "./helper.js";

export const removerModelosQueNaoVendeuRecentemente = async () => {
  console.log('removerModelosQueNaoVendeuRecentemente')
  try {
    // Ler os modelos do arquivo JSON
    const modelos = await readFromJsonFile('./v2/data/4_modelosComHistoricoDeVendas.json');

    // Obter a data atual
    const hoje = new Date();

    // Função auxiliar para subtrair dias de uma data
    const subtrairDias = (data, dias) => {
      const novaData = new Date(data);
      novaData.setDate(novaData.getDate() - dias);
      return novaData;
    };

    // Definir os limites de datas
    const data30 = subtrairDias(hoje, 30);
    const data60 = subtrairDias(hoje, 60);
    const data90 = subtrairDias(hoje, 90);

    // Função auxiliar para converter string de data "DD/MM/YYYY" para objeto Date
    const parseData = (str) => {
      const [dia, mes, ano] = str.split('/').map(Number);
      return new Date(ano, mes - 1, dia);
    };

    // Contadores para logs
    let modelosComProblemas = 0;

    // Filtrar os modelos que atendem aos critérios
    const modelosQueVendeuRecentemente = modelos.filter(modelo => {
      const salesHistory = modelo.salesHistory;

      // Verificar se salesHistory existe e é um array
      if (!Array.isArray(salesHistory)) {
        // console.warn(`Modelo "${modelo.market_hash_name}" possui salesHistory inválido ou indefinido.`);
        modelosComProblemas++;
        return false; // Excluir este modelo
      }

      // Arrays filtrados para cada período
      const vendasUltimos30Dias = salesHistory.filter(sale => {
        const saleDate = parseData(sale.saleDate);
        return saleDate >= data30 && saleDate <= hoje;
      });

      const vendasEntre30e60Dias = salesHistory.filter(sale => {
        const saleDate = parseData(sale.saleDate);
        return saleDate >= data60 && saleDate < data30;
      });

      const vendasEntre60e90Dias = salesHistory.filter(sale => {
        const saleDate = parseData(sale.saleDate);
        return saleDate >= data90 && saleDate < data60;
      });

      // Verificar se cada array tem pelo menos 30 elementos
      const condicao = (
        vendasUltimos30Dias.length >= 30 &&
        vendasEntre30e60Dias.length >= 30 &&
        vendasEntre60e90Dias.length >= 30
      );

      return condicao;
    });

    // console.log(`Total de modelos processados: ${modelos.length}`);
    // console.log(`Modelos com problemas (salesHistory inválido): ${modelosComProblemas}`);
    console.log('Modelos que vendeu recentemente:', modelosQueVendeuRecentemente.length);

    // Escrever os modelos filtrados em um novo arquivo JSON
    await writeToJsonFile('./v2/data/5_apenasModelosQueVendeuRecentemente.json', modelosQueVendeuRecentemente);

  } catch (error) {
    console.error('Ocorreu um erro durante a filtragem dos modelos:', error);
  }
}