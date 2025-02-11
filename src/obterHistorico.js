import fs from 'fs/promises';
import path from 'path';
import { projectRoot, getToken } from './utils/constants.js';
import fetch from './utils/fetch.js';

const obterHistorico = async () => {
  try {
    console.log('Obtendo histórico de trades...');

    // Caminho para o arquivo histórico.json
    const pathHistorico = path.join(projectRoot, 'src/db/historico.json');

    // Lê e analisa o conteúdo do arquivo histórico.json
    const historicoJson = await fs.readFile(pathHistorico, 'utf-8');
    const historico = JSON.parse(historicoJson);

    // Identifica o maior createdAt no histórico
    const maiorCreatedAt = historico.length > 0
      ? new Date(Math.max(...historico.map(item => new Date(item.createdAt))))
      : new Date(0); // Caso o histórico esteja vazio, define como 1970-01-01T00:00:00Z
    console.log('Último registro no histórico:', maiorCreatedAt);

    let novoHistorico = []; // Para armazenar os novos registros
    let pagina = 1;

    while (true) {
      console.log(`Obtendo página ${pagina}...`);

      // Configuração da requisição para a API
      const requestOptions = {
        method: 'GET',
        url: `https://dashskins.com.br/api/history/transactions/62f11eddc880df5083c302cd?page=${pagina}`,
        headers: {
          'Authorization': getToken(),
        },
      };

      // Faz a requisição e obtém a resposta
      const response = await fetch(requestOptions);
      const data = response.data;

      // Filtra elementos com createdAt maior que o maior criado no JSON
      const novosRegistros = data.results
        .filter(item => new Date(item.createdAt) > maiorCreatedAt)
        .map(item => ({
          createdAt: item.createdAt,
          status: item.buyer === false ? 'Venda' : 'Compra',
          item: {
            id: item.item._id,
            nome: item.item.market_hash_name,
            price: item.item.price,
            ...(item.buyer === false && { fee: item.item.fee }),
            ...(item.buyer === false && { valorRecebido: Math.round((item.item.price * (1 - (item.item.fee / 100))) * 100) / 100 }),
          }
        }));

      // Se nenhum registro novo for encontrado, encerra o loop
      if (novosRegistros.length === 0) {
        console.log('Nenhum novo registro encontrado. Histórico atualizado.');
        break;
      }

      console.log(`${novosRegistros.length} novos registros encontrados na página ${pagina}.`);
      novoHistorico = novoHistorico.concat(novosRegistros);

      // Verifica se a página atual é a última
      if (pagina >= data.pages) {
        console.log('Última página alcançada.');
        break;
      }

      // Incrementa para a próxima página
      pagina++;
    }

    if (novoHistorico.length > 0) {
      console.log(`Adicionando ${novoHistorico.length} novos registros ao histórico...`);

      // Adiciona os novos registros ao histórico existente
      const historicoAtualizado = [...historico, ...novoHistorico];

      // Ordena o histórico do mais recente para o mais antigo
      historicoAtualizado.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Salva o histórico atualizado no arquivo
      await fs.writeFile(pathHistorico, JSON.stringify(historicoAtualizado, null, 2), 'utf-8');

      console.log('Histórico atualizado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao obter histórico de trades:', error);
  }
};

const loopInfinito = async () => {
  while (true) {
    await obterHistorico();
    console.log('Execução concluída. Aguardando 2 horas antes da próxima execução...');
    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 60 * 1000)); // Aguarda 2 horas
  }
};

loopInfinito();
