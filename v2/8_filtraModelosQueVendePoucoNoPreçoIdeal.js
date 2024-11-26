import { readFromJsonFile, writeToJsonFile } from "./helper.js";

// Função para filtrar os modelos que vendem pouco no preço ideal
export const filtraModelosQueVendePoucoNoPreçoIdeal = async () => {
  console.log('filtraModelosQueVendePoucoNoPreçoIdeal');

  try {
    // 1. Ler os modelos do arquivo JSON
    const modelos = await readFromJsonFile('./v2/data/7_modelosComPreçoIdeal.json');

    const modelosFiltrados = modelos.map(modelo => {
      // 2. Filtrar as vendas que ocorreram nos últimos 30 dias
      const vendasRecente = modelo.salesHistory.filter(venda => {
        const vendaDate = new Date(venda.saleDate);
        const hoje = new Date();
        const trintaDiasAtras = new Date(hoje.setDate(hoje.getDate() - 30)); // 30 dias atrás

        return vendaDate >= trintaDiasAtras;
      });

      // 3. Remover os 20% com os maiores preços
      const vendasOrdenadas = vendasRecente.sort((a, b) => b.price - a.price);
      const limite20Porcento = Math.floor(vendasOrdenadas.length * 0.2); // 20% dos elementos com maior preço
      const vendasFiltradas = vendasOrdenadas.slice(limite20Porcento);

      // 4. Verificar a quantidade de vendas com preço maior ou igual ao sellingPrice
      const vendasAdequadas = vendasFiltradas.filter(venda => venda.price >= modelo.sellingPrice);

      // 5. Verificar se a quantidade de vendas é maior ou igual a 30
      const aptoParaCompra = vendasAdequadas.length >= 30;

      modelo.quantidadeDeVendaNosUltimos30DiasNoPreçoIdeal = vendasAdequadas.length

      return modelo
      // 6. Retornar se o modelo está apto para compra
      // return aptoParaCompra;
    })
    .filter(e => {
      return e.quantidadeDeVendaNosUltimos30DiasNoPreçoIdeal >= 30
    });

    // 7. Escrever os modelos filtrados em um novo arquivo JSON
    await writeToJsonFile('./v2/data/8_modelosFiltradoPorVendaNoPreçoIdeal.json', modelosFiltrados);
  } catch (error) {
    console.error('filtraModelosQueVendePoucoNoPreçoIdeal', error);
  }
};
