// 1 min, 35 s e 213 ms

import pLimit from 'p-limit';
import { fetchWithRetries, httpsAgent, writeToJsonFile } from './helper.js';

/**
 * Função principal para obter todos os itens anunciados.
 */
export const coletaTodosOsAnunciosAtivos = async () => {
  console.log('coletaTodosOsAnunciosAtivos')
  try {
    const startTime = Date.now();
    let todosOsItensAnunciados = [];

    // Primeira requisição para obter a quantidade total de páginas
    const firstEndpoint = `https://dashskins.com.br/api/listing?limit=120&page=1`;
    const firstResponse = await fetchWithRetries(firstEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      agent: httpsAgent, // Passa o agente para reutilização de conexões
    });

    if (!firstResponse.ok) {
      const errorText = await firstResponse.text();
      console.error(`Erro HTTP: ${firstResponse.status} ${firstResponse.statusText}`);
      console.error(`Corpo da Resposta: ${errorText}`);
      return;
    }

    const firstData = await firstResponse.json();
    console.log('Quantidade total de anúncios:', firstData.count);

    const quantidadeDePaginas = Math.ceil(firstData.count / firstData.limit);
    console.log(`Total de páginas a serem buscadas: ${quantidadeDePaginas}`);

    // Adiciona os resultados da primeira página
    todosOsItensAnunciados.push(...firstData.results);
    console.log(`Página 1: ${firstData.results.length} itens`);

    // Gera a lista de páginas restantes
    const paginas = Array.from({ length: quantidadeDePaginas - 1 }, (_, i) => i + 2);

    // Defina o limite de concorrência (ajuste conforme necessário para evitar 429)
    // Inicialmente, definimos um limite alto e ajustamos dinamicamente
    let CONCURRENCY_LIMIT = 20; // Aumentado para 20 para maior paralelismo
    const limit = pLimit(CONCURRENCY_LIMIT);

    let activeRequests = 0;
    let retrying = false;

    /**
     * Função para buscar uma página específica.
     * @param {number} pagina - Número da página a ser buscada.
     * @returns {Promise<Array>} - Resultados da página.
     */
    const fetchPagina = async (pagina) => {
      const endpoint = `https://dashskins.com.br/api/listing?limit=120&page=${pagina}`;
      try {
        const response = await fetchWithRetries(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
          agent: httpsAgent,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Erro HTTP: ${response.status} ${response.statusText} na página ${pagina}`);
          console.error(`Corpo da Resposta: ${errorText}`);
          return [];
        }

        const data = await response.json();
        console.log(`Página ${pagina}: ${data.results.length} itens`);
        return data.results;
      } catch (error) {
        console.error(`Falha ao buscar a página ${pagina}:`, error);
        return [];
      }
    };

    // Função para ajustar dinamicamente o limite de concorrência com base nas respostas
    const dynamicLimit = async (page) => {
      activeRequests++;
      try {
        const results = await fetchPagina(page);
        return results;
      } finally {
        activeRequests--;
      }
    };

    // Inicia a busca das páginas restantes com controle de concorrência
    console.log('Iniciando a busca das páginas restantes...');
    const promises = paginas.map(page => limit(() => dynamicLimit(page)));
    const resultados = await Promise.all(promises);
    console.log('Busca das páginas concluída.');

    // Adiciona os resultados das outras páginas
    resultados.forEach(result => {
      todosOsItensAnunciados.push(...result);
    });

    console.log('Total encontrado:', todosOsItensAnunciados.length);

    // Escreve os resultados no arquivo JSON
    await writeToJsonFile('./v2/data/1_todosOsAnunciosAtivos.json', todosOsItensAnunciados);
    console.log('Dados escritos no arquivo JSON com sucesso.');

    const endTime = Date.now();
    const timeDiff = endTime - startTime;

    const min = Math.floor(timeDiff / 60000);
    const s = Math.floor((timeDiff % 60000) / 1000);
    const ms = timeDiff % 1000;

    console.log(`Tempo total de execução: ${min} min, ${s} s e ${ms} ms.`);
  } catch (error) {
    console.error('Erro em obtemTodosOsItensAnunciados:', error);
  } finally {
    // Fecha o agente para liberar recursos
    httpsAgent.destroy();
  }
};

