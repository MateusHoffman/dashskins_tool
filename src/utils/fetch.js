import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { projectRoot } from './constants.js';

const alternarProxy = (proxies, currentProxyIndex) => {
  proxies[currentProxyIndex].next = false;
  const novoIndex = (currentProxyIndex + 1) % proxies.length;
  proxies[novoIndex].next = true;
  return novoIndex;
};

const fetch = async (requestOptions) => {
  let response = null;

  const filePath = path.join(projectRoot, 'src/db/proxies.json');

  const loadProxies = () => {
    try {
      const proxiesJson = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(proxiesJson);
    } catch (error) {
      console.error('Erro ao carregar proxies do arquivo:', error);
      return [];
    }
  };

  const saveProxies = (proxies) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(proxies, null, 2));
    } catch (error) {
      console.error('Erro ao salvar proxies no arquivo:', error);
    }
  };

  while (true) {
    let proxies = loadProxies();

    if (proxies.length === 0) {
      console.log("Lista de proxies vazia, aguardando 5 minutos...");
      await new Promise(resolve => setTimeout(resolve, 300000));
      continue;
    }

    let currentProxyIndex = proxies.findIndex(proxy => proxy.next === true);
    if (currentProxyIndex === -1) {
      currentProxyIndex = 0;
      proxies.forEach((proxy, index) => (proxy.next = index === currentProxyIndex));
      saveProxies(proxies);
      proxies = loadProxies();
    }

    const proxy = proxies[currentProxyIndex];
    const agent = new HttpsProxyAgent(proxy.proxy);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const axiosInstance = axios.create({
        httpAgent: agent,
        httpsAgent: agent,
        signal: controller.signal,
      });

      response = await axiosInstance.request(requestOptions);
      if (response.status !== 200) {
        console.log('Fetch data:', response?.data)
      }
      clearTimeout(timeoutId);

      if (response.status === 400) {
        return response;
      }

      proxy.tentativasSemSucesso = 0;
      saveProxies(proxies);
      break;

    } catch (error) {
      if (error?.response?.data) {
        console.log('Catch fetch data:', error?.response?.data)
      }
      clearTimeout(timeoutId);

      if (error.response?.status === 400) {
        return error.response;
      }

      if (error.message !== 'canceled') {
        // console.error(`Erro no fetch:`, { proxy: proxy.proxy, message: error.message, status: error.response?.status });
      }

      proxy.tentativasSemSucesso = (proxy.tentativasSemSucesso || 0) + 1;

      proxies = proxies.filter(p => p.tentativasSemSucesso < 10);

      if (proxies.length > 0) {
        currentProxyIndex = proxies.findIndex(proxy => proxy.next); // Recalcular índice válido
        if (currentProxyIndex === -1) {
          currentProxyIndex = 0; // Garantir que o índice seja válido
          proxies[currentProxyIndex].next = true;
        }
        currentProxyIndex = alternarProxy(proxies, currentProxyIndex);
      } else {
        console.log("Todos os proxies falharam. Aguardando 5 minutos...");
        await new Promise(resolve => setTimeout(resolve, 300000));
        continue; // Reiniciar o loop
      }

      saveProxies(proxies);
    }
  }

  return response;
};

export default fetch;
