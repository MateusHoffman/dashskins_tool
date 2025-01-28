import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { projectRoot } from './utils/constants.js';

const obterTodasAsProxies = async () => {
  try {
    const filePath = path.join(projectRoot, 'src/utils/proxyStrg.txt');
    // Lê o conteúdo do arquivo
    const fileContent = await fs.readFile(filePath, 'utf-8'); // Usando fs.promises.readFile

    // Expressão regular para capturar o IP e a porta
    const regex = /(\d+\.\d+\.\d+\.\d+:\d+)/g;

    // Encontra todos os proxies no formato IP:porta
    const proxies = fileContent.match(regex) || [];

    // Remove duplicados usando um Set e converte para array novamente
    const uniqueProxies = Array.from(new Set(proxies));

    // Formata os proxies como URLs HTTP
    const proxyUrls = uniqueProxies.map(proxy => `http://${proxy}`);

    return proxyUrls;
  } catch (error) {
    console.error('Erro ao obter todas as proxies', error);
    return []; // Retorna um array vazio em caso de erro
  }
};

const testaAProxy = async (proxy) => {
  const endpoint = 'https://dashskins.com.br/api/listing?limit=120&page=1';
  const agent = new HttpsProxyAgent(proxy);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  let success = false;
  try {
    const axiosInstance = axios.create({
      httpAgent: agent,
      httpsAgent: agent,
      signal: controller.signal,
    });
    const response = await axiosInstance.get(endpoint);
    if (response.status === 200) {
      success = true;
    }
  } catch (error) {
    // console.log('Erro ao testar a proxy:');
    // console.log(error.message);
  } finally {
    clearTimeout(timeoutId);
  }
  return success;
};

const obterMelhoresProxies = async (proxies) => {
  try {
    console.log('Total de proxies:', proxies.length);
    const filePath = path.join(projectRoot, 'src/db/proxies.json');

    // Lê o conteúdo do arquivo proxies.json
    const fileContent = await fs.readFile(filePath, 'utf8');
    const proxiesArray = JSON.parse(fileContent || '[]');
    console.log('Proxies já testadas:', proxiesArray.length);

    // Filtra as proxies para remover aquelas que já estão no proxiesArray
    const existingProxiesSet = new Set(proxiesArray.map(p => p.proxy));
    const filteredProxies = proxies.filter(proxy => !existingProxiesSet.has(proxy));
    console.log('Proxies para testar:', filteredProxies.length);

    for (const [index, proxy] of filteredProxies.entries()) {
      console.log(`${index + 1}/${filteredProxies.length} proxies testadas`);
      const funciona = await testaAProxy(proxy);

      if (funciona) {
        const fileContentUpdated = await fs.readFile(filePath, 'utf8');
        const proxiesArrayUpdated = JSON.parse(fileContentUpdated || '[]');
        proxiesArrayUpdated.push({ proxy, tentativasSemSucesso: 0, next: false })
        await fs.writeFile(filePath, JSON.stringify(proxiesArrayUpdated, null, 2));
      }
    }

    return proxiesArray;
  } catch (error) {
    console.error('Erro ao obter as melhores proxies', error);
  }
};

const obterProxies = async () => {
  try {
    const todasAsProxies = await obterTodasAsProxies();
    await obterMelhoresProxies(todasAsProxies);
  } catch (error) {
    console.error('Erro ao obter proxies', error);
  }
};

const loopInfinito = async () => {
  while (true) {
    await obterProxies(); // Executa a função principal
    console.log('Aguardando 1 minuto antes da próxima execução...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // Aguarda 1 minuto
  }
};

loopInfinito();
