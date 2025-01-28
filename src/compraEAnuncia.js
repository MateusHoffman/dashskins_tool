import fs from 'fs/promises';
import path from 'path';
import { projectRoot, TOKEN } from './utils/constants.js';
import fetch from './utils/fetch.js';

const encontrarMelhorCombinação = (itens, saldo) => {
  console.log('Encontrando a melhor combinação...');
  itens.sort((a, b) => b.lucro - a.lucro); // Ordena por maior lucro

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
        combinacaoAtual.pop(); // Remove o último item (backtrack)
      }
    }
  };

  buscarCombinacao(0, saldo, 0, []);

  const custoTotal = melhorCombinação.reduce((total, item) => total + item.precoDeCompra, 0);

  return { melhorLucro, custoTotal, melhorCombinação };
};

const obterSaldo = async () => {
  try {
    console.log('Obtendo saldo...');

    const requestOptions = {
      method: 'GET',
      url: 'https://dashskins.com.br/api/auth/me',
      headers: { 'Authorization': TOKEN },
    };
    const response = await fetch(requestOptions);
    const { balance, bonusBalance } = response.data.user;
    const saldoTotal = balance + bonusBalance;

    console.log('Saldo obtido:', saldoTotal);
    return saldoTotal;
  } catch (error) {
    console.error('Erro ao obter saldo:', error.message);
    throw error;
  }
};

const comprar = async (anuncio) => {
  try {
    console.log(`Tentando comprar: ${anuncio.nome}...`);

    const requestOptions = {
      method: 'POST',
      url: 'https://dashskins.com.br/api/listing/purchase',
      headers: { 'Authorization': TOKEN },
      data: { items: [{ _id: anuncio.id, price: anuncio.precoDeCompra }] },
    };
    const response = await fetch(requestOptions);

    if (response.data === 'purchaseFailedItems') {
      console.log('Compra falhou para:', anuncio.nome);
      return false;
    }

    console.log('Compra bem-sucedida:', anuncio.nome);
    return true;
  } catch (error) {
    console.error(`Erro ao tentar comprar "${anuncio.nome}":`, error.message);
    return false;
  }
};

const anunciar = async (anuncio) => {
  try {
    console.log(`Anunciando: ${anuncio.nome}...`);

    const requestOptions = {
      method: 'POST',
      url: 'https://dashskins.com.br/api/user/items/update',
      headers: { 'Authorization': TOKEN },
      data: {
        items: [{ _id: anuncio.id, price: anuncio.precoDeVenda, listed: 1 }],
      },
    };
    await fetch(requestOptions);

    console.log('Anúncio bem-sucedido:', anuncio.nome);
  } catch (error) {
    console.error(`Erro ao tentar anunciar "${anuncio.nome}":`, error.message);
  }
};

const compraEAnuncia = async (anunciosParaComprar) => {
  const pathAnunciosBaratos = path.join(projectRoot, 'src/db/anunciosBaratos.json');

  try {
    console.log('Iniciando processo de compra e anúncio...');
    const anunciosBaratosJson = await fs.readFile(pathAnunciosBaratos, 'utf-8');
    let anunciosBaratos = JSON.parse(anunciosBaratosJson);

    for (const [index, anuncio] of anunciosParaComprar.entries()) {
      console.log(`${index + 1}/${anunciosParaComprar.length}: ${anuncio.nome}`);

      try {
        const comprado = await comprar(anuncio);
        if (comprado) {
          await anunciar(anuncio);
        }
        anunciosBaratos = anunciosBaratos.filter(item => item.id !== anuncio.id);
        await fs.writeFile(pathAnunciosBaratos, JSON.stringify(anunciosBaratos, null, 2), 'utf-8');
      } catch (error) {
        console.error(`Erro ao processar "${anuncio.nome}". Pulando para o próximo.`);
      }
    }
  } catch (error) {
    console.error('Erro ao tentar comprar e anunciar:', error.message);
  }
};

const loopInfinito = async () => {
  while (true) {
    try {
      const saldo = await obterSaldo();
      const pathAnunciosBaratos = path.join(projectRoot, 'src/db/anunciosBaratos.json');
      const anunciosBaratosJson = await fs.readFile(pathAnunciosBaratos, 'utf-8');
      const anunciosBaratos = JSON.parse(anunciosBaratosJson);

      const { melhorCombinação } = encontrarMelhorCombinação(anunciosBaratos, saldo);

      if (melhorCombinação.length > 0) {
        await compraEAnuncia(melhorCombinação);
      } else {
        console.log('Nenhuma combinação encontrada para o saldo atual.');
      }

      console.log('Aguardando 5 minuto antes da próxima execução...');
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    } catch (error) {
      console.error('Erro no loop principal:', error.message);
    }
  }
};

loopInfinito();
