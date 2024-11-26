import { fetchWithRetries, formatDate, httpsAgent, readFromJsonFile, writeToJsonFile } from "./helper.js";
import pLimit from 'p-limit';

export const coletarHistoricoDeVendasDeCadaModelo = async () => {
  try {
    console.log('coletarHistoricoDeVendasDeCadaModelo');
    const startTime = Date.now();

    // 1. Leitura dos modelos do arquivo JSON
    const modelos = await readFromJsonFile('./v2/data/3_anunciosDoMesmoModeloAgrupado.json');
    const totalModelos = modelos.length;

    // 2. Configuração de controle de concorrência
    const CONCURRENCY_LIMIT = 10; // Ajuste conforme necessário
    const limit = pLimit(CONCURRENCY_LIMIT);

    // Inicialização do contador de modelos processados
    let modelosProcessados = 0;

    // /**
    //  * Função para processar um único modelo.
    //  * @param {object} modelo - Objeto do modelo.
    //  * @returns {Promise<void>}
    //  */
    // const processarModelo = async (modelo) => {
    //   if (!modelo.activeAds || modelo.activeAds.length === 0) {
    //     console.warn(`Modelo ${modelo.market_hash_name} não possui anúncios ativos.`);
    //   } else {
    //     const primeiroAnuncio = modelo.activeAds[0];
    //     const { id } = primeiroAnuncio;

    //     const endpoint = `https://dashskins.com.br/api/item/${id}/trade-record`;

    //     try {
    //       const response = await fetchWithRetries(endpoint, {
    //         method: 'GET',
    //         headers: {
    //           'Accept': 'application/json',
    //           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    //         },
    //         agent: httpsAgent,
    //       });

    //       if (!response.ok) {
    //         const errorText = await response.text();
    //         console.error(`Erro HTTP ${response.status} ao buscar trade record para ID ${id}: ${response.statusText}`);
    //         console.error(`Corpo da Resposta: ${errorText}`);
    //       } else {
    //         const data = await response.json();
    //         const { tradeRecord } = data;

    //         if (!Array.isArray(tradeRecord)) {
    //           console.warn(`Trade record inválido para ID ${id}.`);
    //         } else {
    //           // Processa o tradeRecord para criar salesHistory
    //           const salesHistory = tradeRecord.map(record => ({
    //             saleDate: formatDate(record.createdAt),
    //             price: record.item.price,
    //           }));

    //           // Adiciona salesHistory ao primeiro anúncio ativo
    //           modelo.salesHistory = salesHistory;
    //         }
    //       }
    //     } catch (error) {
    //       console.error(`Erro ao processar o modelo ${modelo.market_hash_name}:`, error);
    //     }
    //   }

    //   // Incrementa o contador e faz o log de progresso
    //   modelosProcessados += 1;
    //   console.log(`Progresso: ${modelosProcessados}/${totalModelos}`);
    // };

    /**
 * Função para processar um único modelo.
 * @param {object} modelo - Objeto do modelo.
 * @returns {Promise<void>}
 */
    const processarModelo = async (modelo) => {
      if (!modelo.activeAds || modelo.activeAds.length === 0) {
        console.warn(`Modelo "${modelo.market_hash_name}" não possui anúncios ativos.`);
        // Definir salesHistory como vazio, já que não há anúncios ativos
        modelo.salesHistory = [];
        // Incrementa o contador e faz o log de progresso
        modelosProcessados += 1;
        console.log(`Progresso: ${modelosProcessados}/${totalModelos}`);
        return;
      }

      // Função auxiliar para buscar tradeRecord para um dado anúncio
      const buscarTradeRecord = async (anuncio) => {
        const { id } = anuncio;
        const endpoint = `https://dashskins.com.br/api/item/${id}/trade-record`;

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
            console.error(`Erro HTTP ${response.status} ao buscar trade record para ID ${id}: ${response.statusText}`);
            console.error(`Corpo da Resposta: ${errorText}`);
            return false;
          }

          const data = await response.json();
          const { tradeRecord } = data;

          if (tradeRecord === false) {
            console.warn(`Trade record para ID ${id} retornou false.`);
            return false;
          }

          if (!Array.isArray(tradeRecord)) {
            console.warn(`Trade record inválido para ID ${id}.`);
            return false;
          }

          // Processa o tradeRecord para criar salesHistory
          const salesHistory = tradeRecord.map(record => ({
            saleDate: formatDate(record.createdAt),
            price: record.item.price,
          }));

          return salesHistory;
        } catch (error) {
          console.error(`Erro ao buscar trade record para ID ${id}:`, error);
          return false;
        }
      };

      let salesHistoryFinal = [];
      let tradeRecordEncontrado = false;

      // Iterar sobre os anúncios ativos até encontrar um tradeRecord válido
      for (const anuncio of modelo.activeAds) {
        const resultado = await buscarTradeRecord(anuncio);

        if (resultado !== false) {
          salesHistoryFinal = resultado;
          tradeRecordEncontrado = true;
          // console.log(`Trade record encontrado para o modelo "${modelo.market_hash_name}" usando o anúncio ID ${anuncio.id}.`);
          break; // Sair do loop após encontrar um tradeRecord válido
        } else {
          console.info(`Tentativa falhou para o anúncio ID ${anuncio.id}. Tentando o próximo anúncio...`);
        }
      }

      if (!tradeRecordEncontrado) {
        console.info(`Nenhum trade record válido encontrado para o modelo "${modelo.market_hash_name}". Definindo salesHistory como array vazio.`);
        salesHistoryFinal = [];
      }

      // Atribuir o salesHistory ao modelo
      modelo.salesHistory = salesHistoryFinal;

      // Incrementa o contador e faz o log de progresso
      modelosProcessados += 1;
      console.log(`Progresso: ${modelosProcessados}/${totalModelos}`);
    };

    // 3. Mapeia e executa as promessas com controle de concorrência
    const tarefas = modelos.map(modelo => limit(() => processarModelo(modelo)));
    await Promise.all(tarefas);

    // 4. Escrita dos dados atualizados em um novo arquivo JSON
    await writeToJsonFile('./v2/data/4_modelosComHistoricoDeVendas.json', modelos);

    const endTime = Date.now();
    const timeDiff = endTime - startTime;

    const min = Math.floor(timeDiff / 60000);
    const s = Math.floor((timeDiff % 60000) / 1000);
    const ms = timeDiff % 1000;

    console.log(`Tempo total de execução: ${min} min, ${s} s e ${ms} ms.`);
  } catch (error) {
    console.error('Erro na função coletarHistoricoDeVendasDeCadaModelo:', error);
  } finally {
    // Fecha o agente HTTPS para liberar recursos
    httpsAgent.destroy();
  }
}
