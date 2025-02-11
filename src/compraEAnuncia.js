import fs from 'fs/promises';
import path from 'path';
import { projectRoot, getToken } from './utils/constants.js';
import fetch from './utils/fetch.js';
import ora from 'ora';

const encontrarMelhorCombinação = (itens, saldo) => {
  console.log('Encontrando a melhor combinação...');
  itens.sort((a, b) => b.lucro - a.lucro);

  const n = itens.length;
  let melhorLucro = 0;
  let melhorCombinação = [];

  const buscarCombinacao = (indice, saldoRestante, lucroAtual, combinacaoAtual) => {
    if (lucroAtual > melhorLucro) {
      melhorLucro = lucroAtual;
      melhorCombinação = [...combinacaoAtual];
    }

    for (let i = indice; i < n; i++) {
      const item = itens[i];
      if (saldoRestante >= item.precoDeCompra) {
        combinacaoAtual.push(item);
        buscarCombinacao(
          i + 1,
          saldoRestante - item.precoDeCompra,
          lucroAtual + item.lucro,
          combinacaoAtual
        );
        combinacaoAtual.pop();
      }
    }
  };

  buscarCombinacao(0, saldo, 0, []);

  const custoTotal = melhorCombinação.reduce((total, item) => total + item.precoDeCompra, 0);

  console.log(`Melhor combinação encontrada: ${melhorCombinação.length} itens, lucro: ${melhorLucro}, custo: ${custoTotal}`);
  return { melhorLucro, custoTotal, melhorCombinação };
};

const obterSaldo = async () => {
  console.log('Obtendo saldo...');
  try {
    const requestOptions = {
      method: 'GET',
      url: 'https://dashskins.com.br/api/auth/me',
      headers: { 'Authorization': getToken() },
    };
    const response = await fetch(requestOptions);
    const { balance, bonusBalance } = response.data.user;
    const saldoTotal = balance + bonusBalance;

    console.log(`Saldo: ${saldoTotal}`);
    return saldoTotal;
  } catch (error) {
    console.error(`Erro ao obter saldo: ${error.message}`);
    throw error;
  }
};

const comprar = async (anuncio) => {
  console.log(`Comprando "${anuncio.nome}"...`);
  try {
    const requestOptions = {
      method: 'POST',
      url: 'https://dashskins.com.br/api/listing/purchase',
      headers: { 'Authorization': getToken() },
      data: { items: [{ _id: anuncio.id, price: anuncio.precoDeCompra }] },
    };
    const response = await fetch(requestOptions);

    if (response.data === 'purchaseFailedItems') {
      console.error(`Compra falhou para ${anuncio.nome}`);
      return false;
    }

    console.log(`Compra bem-sucedida`);
    return true;
  } catch (error) {
    console.error(`Erro ao tentar comprar: ${error.message}`);
    return false;
  }
};

const anunciar = async (anuncio) => {
  console.log(`Anunciando...`);
  try {
    const requestOptions = {
      method: 'POST',
      url: 'https://dashskins.com.br/api/user/items/update',
      headers: { 'Authorization': getToken() },
      data: {
        items: [{ _id: anuncio.id, price: anuncio.precoDeVenda, listed: 1 }],
      },
    };
    await fetch(requestOptions);

    console.log(`Anúncio bem-sucedido: ${anuncio.nome}`);
  } catch (error) {
    console.error(`Erro ao tentar anunciar "${anuncio.nome}": ${error.message}`);
  }
};

const compraEAnuncia = async (anunciosParaComprar) => {
  const pathAnunciosBaratos = path.join(projectRoot, 'src/db/anunciosBaratos.json');
  console.log('Iniciando processo de compra e anúncio...');
  try {
    const anunciosBaratosJson = await fs.readFile(pathAnunciosBaratos, 'utf-8');
    let anunciosBaratos = JSON.parse(anunciosBaratosJson);

    for (const [index, anuncio] of anunciosParaComprar.entries()) {
      console.log(`Processando ${index + 1}/${anunciosParaComprar.length}: ${anuncio.nome}`);

      try {
        console.log('Preço de compra:', anuncio?.precoDeCompra);
        console.log('Preço de venda:', anuncio?.precoDeVenda);
        await comprar(anuncio);
        await anunciar(anuncio);
        anunciosBaratos = anunciosBaratos.filter(item => item.id !== anuncio.id);
        await fs.writeFile(pathAnunciosBaratos, JSON.stringify(anunciosBaratos, null, 2), 'utf-8');
      } catch (error) {
        console.error(`Erro ao processar "${anuncio.nome}". Pulando para o próximo.`);
      }
    }

    console.log('Processo de compra e anúncio concluído.');
  } catch (error) {
    console.error(`Erro ao tentar comprar e anunciar: ${error.message}`);
  }
};

const loopInfinito = async () => {
  while (true) {
    try {
      const pathAnunciosBaratos = path.join(projectRoot, 'src/db/anunciosBaratos.json');
      const anunciosBaratosJson = await fs.readFile(pathAnunciosBaratos, 'utf-8');
      const anunciosBaratos = JSON.parse(anunciosBaratosJson);

      if (anunciosBaratos.length > 0) {
        const saldo = await obterSaldo();
        const { melhorCombinação } = encontrarMelhorCombinação(anunciosBaratos, saldo);

        if (melhorCombinação.length > 0) {
          await compraEAnuncia(melhorCombinação);
        } else {
          console.log('Nenhuma combinação encontrada para o saldo atual.');
        }
      }

      const spinner = ora('Aguardando anúncios para comprar...').start();
      await new Promise(resolve => setTimeout(resolve, 5 * 1000));
      spinner.stop();
    } catch (error) {
      console.error(`Erro no loop principal: ${error.message}`);
    }
  }
};

loopInfinito();
