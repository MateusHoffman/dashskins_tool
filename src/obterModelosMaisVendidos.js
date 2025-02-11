import fs from 'fs/promises';
import path from 'path';
import fetch from "./utils/fetch.js";
import { projectRoot, TAXA } from './utils/constants.js';

const obterTodosOsAnuncios = async () => {
  console.log('Iniciando coleta de anúncios');
  let anuncios = [];
  let page = 1;

  while (true) {
    const requestOptions = {
      method: 'GET',
      url: `https://dashskins.com.br/api/listing?limit=120&page=${page}`,
    }
    const response = await fetch(requestOptions);
    const data = response.data
    // console.log('data', data.results[0])
    if (Array.isArray(data.results) && data.results.length > 0) {
      anuncios.push(...data.results);
      console.log(`Anuncios da página ${page}, foram coletados com sucesso`);
    } else {
      break;
    }
    page += 1;
    // if (page > 10) {
    //   break;
    // }
  }

  console.log('Coleta de anúncios finalizada');
  return anuncios;
}

const agruparAnunciosPorModelo = (anuncios) => {
  console.log('Iniciando agrupamento de anúncios por nomes');
  try {
    const agrupadosMap = new Map();

    for (let i = 0, len = anuncios.length; i < len; i++) {
      const anuncio = anuncios[i];
      const key = anuncio.market_hash_name;

      if (!agrupadosMap.has(key)) {
        agrupadosMap.set(key, { market_hash_name: key, anuncios: [] });
      }

      agrupadosMap.get(key).anuncios.push({
        id: anuncio._id,
        price: anuncio.price,
      });
    }

    console.log('Agrupamento de anúncios por nomes finalizado');
    return Array.from(agrupadosMap.values());
  } catch (error) {
    console.error('Erro ao agrupar anúncios por nomes', error);
  }
}

const obterHistoricoDosModelos = async (modelos) => {
  console.log('Iniciando coleta do histórico de vendas');

  let modelosComHistorico = [];

  // Filtrar modelos com pelo menos 10 anúncios
  const modelosFiltrados = modelos.filter(modelo => modelo.anuncios.length >= 10);

  // Usar um loop eficiente para iterar pelos modelos
  for (let [index, modelo] of modelosFiltrados.entries()) {
    try {
      console.log(`${index + 1}/${modelosFiltrados.length} - ${modelo.market_hash_name}`);

      // Ordenar anúncios pelo preço e pegar o mais caro
      const idAnuncio = modelo.anuncios.sort((a, b) => b.price - a.price)[0]?.id;
      if (!idAnuncio) continue;

      const requestOptions = {
        method: 'GET',
        url: `https://dashskins.com.br/api/item/${idAnuncio}/trade-record`,
      }
      const response = await fetch(requestOptions);
      const data = response.data
      let historicoDeVendas = data.tradeRecord || []

      if (Array.isArray(historicoDeVendas) && historicoDeVendas.length > 30) {
        const historicoFormatado = historicoDeVendas.map((venda) => {
          return {
            dataDeVenda: venda.createdAt,
            precoDeVenda: venda.item?.price || null,
          };
        })
        const modeloComHist = {
          nome: modelo.market_hash_name,
          // quantidaDeAnuncios: modelo.anuncios.length,
          historico: historicoFormatado,
        }
        // Adicionar histórico transformado ao modelo
        modelosComHistorico.push(modeloComHist);
      }

    } catch (error) {
      console.error(`Erro ao obter histórico de vendas do modelo ${modelo.market_hash_name}`, error);
    }
  }

  console.log('Coleta do histórico finalizada');
  return modelosComHistorico;
};

const ordenarPorModelosMaisVendidos = (modelos) => {
  console.log('Iniciando ordenação dos modelos mais vendidos');
  try {
    const agora = new Date();

    // Função auxiliar para gerar intervalos de datas
    const gerarIntervalosDeDatas = (dias) => {
      let intervalos = [];
      for (let i = 0; i < dias; i++) {
        const inicio = new Date(agora);
        const fim = new Date(agora);

        inicio.setDate(agora.getDate() - (i + 1));
        fim.setDate(agora.getDate() - i);

        intervalos.push({
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
        });
      }
      return intervalos;
    };

    // Gerar intervalos para os últimos 30 dias
    const intervalos = gerarIntervalosDeDatas(30);

    // Calcular contagem de vendas para cada modelo
    modelos.forEach((modelo) => {
      modelo.quantidadeVendas = 0;
      let vendasPorDia = new Array(30).fill(0); // Inicializa array de vendas por dia

      intervalos.forEach(({ inicio, fim }, index) => {
        const vendasNoIntervalo = modelo.historico.filter((venda) => {
          const dataVenda = new Date(venda.dataDeVenda);
          return dataVenda >= new Date(inicio) && dataVenda < new Date(fim);
        });

        // Adicionar a quantidade de vendas ao índice correspondente ao dia
        vendasPorDia[index] = vendasNoIntervalo.length;

        // Acumular vendas para o total
        modelo.quantidadeVendas += vendasNoIntervalo.length;
      });

      // Filtra modelos com menos de 5 vendas por dia nos últimos 30 dias
      const vendasPorDiaMedia = vendasPorDia.reduce((sum, vendas) => sum + vendas, 0) / 30;
      if (vendasPorDiaMedia < 5) {
        modelo.quantidadeVendas = 0; // Resetar a quantidade de vendas se não tiver pelo menos 5 vendas/dia
      }
    });

    // Filtrar modelos com menos de 5 vendas por dia no total
    const modelosFiltrados = modelos.filter((modelo) => modelo.quantidadeVendas > 0);

    // Ordenar modelos pela quantidade de vendas em ordem decrescente
    const modelosOrdenados = modelosFiltrados.sort((a, b) => b.quantidadeVendas - a.quantidadeVendas);

    console.log('Ordenação dos modelos mais vendidos finalizada');
    return modelosOrdenados;
  } catch (erro) {
    console.error('Erro ao ordenar modelos mais vendidos', erro);
  }
};

const obterMelhorPrecoPorModelo = (modelos) => {
  try {
    const agora = new Date();
    const seteDiasAtras = new Date(agora);
    seteDiasAtras.setDate(agora.getDate() - 7);

    modelos.forEach((modelo) => {
      const historicoFiltrado = modelo.historico.filter((venda) => {
        const dataVenda = new Date(venda.dataDeVenda);
        return dataVenda >= seteDiasAtras && dataVenda <= agora;
      });

      if (historicoFiltrado.length > 0) {
        // Ordenar por preço (crescente)
        historicoFiltrado.sort((a, b) => a.precoDeVenda - b.precoDeVenda);

        // Ajuste de remoção dos 10% extremos
        const tamanho = historicoFiltrado.length;
        const inicio = Math.ceil(tamanho * 0.4); // Ajustar 40% inicial
        const fim = Math.floor(tamanho * 0.6); // Ajustar 40% final
        const historicoAjustado = historicoFiltrado.slice(inicio, fim);

        if (historicoAjustado.length > 0) {
          const menorPrecoDeVenda = historicoAjustado[0].precoDeVenda;

          // Arredondar para duas casas decimais
          const arredondarDuasCasas = (num) => Math.round(num * 100) / 100;

          modelo.precoDeVenda = arredondarDuasCasas(menorPrecoDeVenda);
          modelo.comprarAbaixoDe = arredondarDuasCasas(menorPrecoDeVenda * (1 - TAXA - 0.01)); // Desconto de TAXA do site + 1% de margem de segurança/lucro
        } else {
          modelo.precoDeVenda = null;
          modelo.comprarAbaixoDe = null;
        }
      } else {
        modelo.precoDeVenda = null;
        modelo.comprarAbaixoDe = null;
      }
    });

    // Retornar apenas nome, precoDeVenda e comprarAbaixoDe
    return modelos.map(({ nome, precoDeVenda, comprarAbaixoDe }) => ({
      nome,
      precoDeVenda,
      comprarAbaixoDe,
    }));
  } catch (error) {
    console.error('Erro ao obter melhor preço por modelo', error);
    return [];
  }
};

const obterModelosMaisVendidos = async () => {
  console.time(`Tempo para obter modelos mais vendidos`);
  try {
    const anuncios = await obterTodosOsAnuncios()
    const modelos = agruparAnunciosPorModelo(anuncios)
    const modelosComHist = await obterHistoricoDosModelos(modelos);
    const modelosOrdenados = ordenarPorModelosMaisVendidos(modelosComHist);
    const modelosComMelhorPreco = obterMelhorPrecoPorModelo(modelosOrdenados);
    const filePath = path.join(projectRoot, 'src/db/modelosMaisVendidos.json');
    await fs.writeFile(filePath, JSON.stringify(modelosComMelhorPreco, null, 2));
  } catch (error) {
    console.error('Erro ao obter modelos mais vendidos', error);
  }
  console.timeEnd(`Tempo para obter modelos mais vendidos`);
}

const loopInfinito = async () => {
  while (true) {
    await obterModelosMaisVendidos(); // Executa a função principal
    console.log('Execução concluída. Aguardando 12 horas antes da próxima execução...');
    await new Promise(resolve => setTimeout(resolve, 12 * 60 * 60 * 1000)); // Aguarda 12 horas
  }
};

loopInfinito();