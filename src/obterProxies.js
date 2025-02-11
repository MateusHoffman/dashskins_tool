import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { projectRoot } from './utils/constants.js';

// Função para obter proxies gratuitas do site
const obterFreeProxies = async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Acessa o site
    await page.goto('https://free-proxy-list.net/', { waitUntil: 'networkidle2' });

    // Encontra e clica no botão para abrir o modal
    await page.click('a[title="Get raw list"]');

    // Aguarda o modal aparecer
    await page.waitForSelector('.modal textarea.form-control', { visible: true });

    // Obtém o conteúdo do textarea
    const proxyText = await page.$eval('.modal textarea.form-control', el => el.value);

    // Fecha o navegador
    await browser.close();

    return proxyText;
  } catch (error) {
    console.error('Erro ao obter free proxies:', error);
    return '';
  }
};

// Função para atualizar o arquivo proxyStrg.txt com novas proxies
const atualizarProxyStrg = async (novasProxies) => {
  try {
    const filePath = path.join(projectRoot, 'src/utils/proxyStrg.txt');
    let existingContent = '';

    // Lê o conteúdo atual do arquivo
    try {
      existingContent = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error; // Ignora se o arquivo não existir
    }

    // Adiciona as novas proxies ao conteúdo existente
    const newContent = novasProxies + '\n' + existingContent;

    const regex = /(\d+\.\d+\.\d+\.\d+:\d+)/g;

    const proxies = newContent.match(regex);

    const uniqueProxies = Array.from(new Set(proxies));

    const proxyUrls = uniqueProxies.join('\n')

    await fs.writeFile(filePath, proxyUrls, 'utf-8');

    console.log('Arquivo proxyStrg.txt atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar proxyStrg.txt:', error);
  }
};

// Função para obter todas as proxies únicas do arquivo proxyStrg.txt
const obterTodasAsProxies = async () => {
  try {
    const filePath = path.join(projectRoot, 'src/utils/proxyStrg.txt');
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Filtra as proxies no formato IP:porta
    const regex = /(\d+\.\d+\.\d+\.\d+:\d+)/g;
    const proxies = fileContent.match(regex) || [];

    // Remove duplicados
    const uniqueProxies = Array.from(new Set(proxies));

    // Converte para URLs HTTP
    const proxyUrls = uniqueProxies.map(proxy => `http://${proxy}`);

    return proxyUrls;
  } catch (error) {
    console.error('Erro ao obter todas as proxies:', error);
    return [];
  }
};

// Função para testar uma proxy
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
    // Proxy falhou, não faz nada
  } finally {
    clearTimeout(timeoutId);
  }

  return success;
};

// Função para obter as melhores proxies
const obterMelhoresProxies = async (proxies) => {
  try {
    console.log('Total de proxies para testar:', proxies.length);
    const filePath = path.join(projectRoot, 'src/db/proxies.json');

    // Lê o conteúdo do arquivo proxies.json
    let proxiesArray = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      proxiesArray = JSON.parse(fileContent || '[]');
      console.log('Quantidade de proxies boas:', proxiesArray.length)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error; // Ignora se o arquivo não existir
    }

    // Filtra as proxies para remover aquelas que já foram testadas
    const existingProxiesSet = new Set(proxiesArray.map(p => p.proxy));
    const filteredProxies = proxies.filter(proxy => !existingProxiesSet.has(proxy));
    console.log('Novas proxies para testar:', filteredProxies.length);

    // Testa cada proxy
    for (const [index, proxy] of filteredProxies.entries()) {
      console.log(`Testando proxy ${index + 1}/${filteredProxies.length}: ${proxy}`);
      const funciona = await testaAProxy(proxy);

      if (funciona) {
        proxiesArray.push({ proxy, tentativasSemSucesso: 0, next: false });
        await fs.writeFile(filePath, JSON.stringify(proxiesArray, null, 2));
      }
    }

    console.log('Testes de proxies concluídos!');
  } catch (error) {
    console.error('Erro ao obter as melhores proxies:', error);
  }
};

// Função principal para obter e testar proxies
const obterProxies = async () => {
  try {
    // Passo 1: Obtém novas proxies gratuitas
    const novasProxies = await obterFreeProxies();

    // Passo 2: Atualiza o arquivo proxyStrg.txt com as novas proxies
    await atualizarProxyStrg(novasProxies);

    // Passo 3: Obtém todas as proxies únicas do arquivo
    const todasAsProxies = await obterTodasAsProxies();

    // Passo 4: Inicia os testes com as proxies
    await obterMelhoresProxies(todasAsProxies);
  } catch (error) {
    console.error('Erro no processo de obtenção de proxies:', error);
  }
};

// Loop infinito para executar o processo a cada 1 minuto
const loopInfinito = async () => {
  while (true) {
    await obterProxies();
    console.log('Aguardando 1 minuto antes da próxima execução...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // Aguarda 1 minuto
  }
};

// Inicia o loop
loopInfinito();

// import puppeteer from 'puppeteer';
// import fs from 'fs/promises';
// import path from 'path';
// import axios from 'axios';
// import { HttpsProxyAgent } from 'https-proxy-agent';
// import { projectRoot } from './utils/constants.js';

// const obterFreeProxies = async () => {
//   try {
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();

//     // Acessa o site
//     await page.goto('https://free-proxy-list.net/', { waitUntil: 'networkidle2' });

//     // Encontra e clica no botão para abrir o modal
//     await page.click('a[title="Get raw list"]');

//     // Aguarda o modal aparecer
//     await page.waitForSelector('.modal textarea.form-control', { visible: true });

//     // Obtém o conteúdo do textarea
//     const proxyText = await page.$eval('.modal textarea.form-control', el => el.value);

//     // Fecha o navegador
//     await browser.close();

//     // Salva o conteúdo no arquivo
//     const filePath = path.join(projectRoot, 'src/utils/proxyStrg.txt');
//     let existingContent = '';

//     try {
//       existingContent = await fs.readFile(filePath, 'utf-8');
//     } catch (error) {
//       // Se o arquivo não existir, ignora o erro (existingContent permanece vazio)
//       if (error.code !== 'ENOENT') {
//         throw error; // Lança outros erros
//       }
//     }

//     const newContent = proxyText + '\n' + existingContent;
//     await fs.writeFile(filePath, newContent, 'utf-8');

//     console.log('Proxies salvas com sucesso!');
//   } catch (error) {
//     console.error('Erro ao obter todas as free proxies', error);
//     return []; // Retorna um array vazio em caso de erro
//   }
// };

// const obterTodasAsProxies = async () => {
//   try {
//     const filePath = path.join(projectRoot, 'src/utils/proxyStrg.txt');
//     // Lê o conteúdo do arquivo
//     const fileContent = await fs.readFile(filePath, 'utf-8'); // Usando fs.promises.readFile

//     // Expressão regular para capturar o IP e a porta
//     const regex = /(\d+\.\d+\.\d+\.\d+:\d+)/g;

//     // Encontra todos os proxies no formato IP:porta
//     const proxies = fileContent.match(regex) || [];

//     // Remove duplicados usando um Set e converte para array novamente
//     const uniqueProxies = Array.from(new Set(proxies));

//     // Formata os proxies como URLs HTTP
//     const proxyUrls = uniqueProxies.map(proxy => `http://${proxy}`);

//     return proxyUrls;
//   } catch (error) {
//     console.error('Erro ao obter todas as proxies', error);
//     return []; // Retorna um array vazio em caso de erro
//   }
// };

// const testaAProxy = async (proxy) => {
//   const endpoint = 'https://dashskins.com.br/api/listing?limit=120&page=1';
//   const agent = new HttpsProxyAgent(proxy);
//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), 5000);
//   let success = false;
//   try {
//     const axiosInstance = axios.create({
//       httpAgent: agent,
//       httpsAgent: agent,
//       signal: controller.signal,
//     });
//     const response = await axiosInstance.get(endpoint);
//     if (response.status === 200) {
//       success = true;
//     }
//   } catch (error) {
//     // console.log('Erro ao testar a proxy:');
//     // console.log(error.message);
//   } finally {
//     clearTimeout(timeoutId);
//   }
//   return success;
// };

// const obterMelhoresProxies = async (proxies) => {
//   try {
//     console.log('Total de proxies:', proxies.length);
//     const filePath = path.join(projectRoot, 'src/db/proxies.json');

//     // Lê o conteúdo do arquivo proxies.json
//     const fileContent = await fs.readFile(filePath, 'utf8');
//     const proxiesArray = JSON.parse(fileContent || '[]');
//     console.log('Proxies já testadas:', proxiesArray.length);

//     // Filtra as proxies para remover aquelas que já estão no proxiesArray
//     const existingProxiesSet = new Set(proxiesArray.map(p => p.proxy));
//     const filteredProxies = proxies.filter(proxy => !existingProxiesSet.has(proxy));
//     console.log('Proxies para testar:', filteredProxies.length);

//     for (const [index, proxy] of filteredProxies.entries()) {
//       console.log(`${index + 1}/${filteredProxies.length} proxies testadas`);
//       const funciona = await testaAProxy(proxy);

//       if (funciona) {
//         const fileContentUpdated = await fs.readFile(filePath, 'utf8');
//         const proxiesArrayUpdated = JSON.parse(fileContentUpdated || '[]');
//         proxiesArrayUpdated.push({ proxy, tentativasSemSucesso: 0, next: false })
//         await fs.writeFile(filePath, JSON.stringify(proxiesArrayUpdated, null, 2));
//       }
//     }

//     return proxiesArray;
//   } catch (error) {
//     console.error('Erro ao obter as melhores proxies', error);
//   }
// };

// const obterProxies = async () => {
//   try {
//     await obterFreeProxies()
//     const todasAsProxies = await obterTodasAsProxies();
//     await obterMelhoresProxies(todasAsProxies);
//   } catch (error) {
//     console.error('Erro ao obter proxies', error);
//   }
// };

// const loopInfinito = async () => {
//   while (true) {
//     await obterProxies();
//     console.log('Aguardando 1 minuto antes da próxima execução...');
//     await new Promise(resolve => setTimeout(resolve, 60000)); // Aguarda 1 minuto
//   }
// };

// loopInfinito();
