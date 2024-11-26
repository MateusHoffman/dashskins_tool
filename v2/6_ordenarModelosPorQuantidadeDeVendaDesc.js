import { readFromJsonFile, writeToJsonFile } from "./helper.js";

export const ordenarModelosPorQuantidadeDeVendaDesc = async () => {
  console.log('ordenarModelosPorQuantidadeDeVendaDesc')
  try {
    const parseDate = (dateStr) => {
      const [dia, mes, ano] = dateStr.split('/');
      return new Date(`${ano}-${mes}-${dia}`);
    };

    // 1. Ler os modelos do arquivo JSON
    const modelos = await readFromJsonFile('./v2/data/5_apenasModelosQueVendeuRecentemente.json');

    // 2. Obter a data de hoje
    const hoje = new Date();

    // 3. Obter a data de 30 dias atrás
    const data30DiasAtras = new Date();
    data30DiasAtras.setDate(hoje.getDate() - 30);

    // 4. Mapear cada modelo para incluir a quantidade de vendas nos últimos 30 dias
    const modelosComQuantidade = modelos.map(modelo => {
      // Filtrar as vendas que ocorreram nos últimos 30 dias
      const vendasFiltradas = modelo.salesHistory.filter(venda => {
        const dataVenda = parseDate(venda.saleDate);
        return dataVenda >= data30DiasAtras && dataVenda <= hoje;
      });

      // Retornar um novo objeto modelo com a quantidade de vendas adicionada
      return {
        ...modelo,
        quantidadeVendas: vendasFiltradas.length
      };
    });

    // 5. Ordenar os modelos pela quantidade de vendas de forma decrescente
    modelosComQuantidade.sort((a, b) => b.quantidadeVendas - a.quantidadeVendas);

    // 6. Escrever os modelos ordenados em um novo arquivo JSON
    await writeToJsonFile('./v2/data/6_modelosOrdenadosPorQuantidadeDeVena.json', modelosComQuantidade);

    console.log('Modelos ordenados com sucesso!');
  } catch (error) {
    console.error('Erro ao ordenar modelos por quantidade de venda:', error);
  }
}