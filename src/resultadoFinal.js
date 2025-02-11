import fs from 'fs/promises';
import path from 'path';
import { getToken, projectRoot, TAXA } from './utils/constants.js';
import fetch from './utils/fetch.js';

const anunciarComNovoValor = async (anuncio) => {
  try {
    const requestOptions = {
      method: 'POST',
      url: 'https://dashskins.com.br/api/user/items/update',
      headers: {
        'Authorization': getToken(),
      },
      data: {
        items: [{
          _id: anuncio.id,
          price: Math.ceil((anuncio.preçoDaCompra / (1 - TAXA)) * 100) / 100,
          listed: 1,
        }]
      }
    };
    const response = await fetch(requestOptions);
    console.log(`Anúncio ${anuncio.id} atualizado com sucesso!`, response.data);
  } catch (error) {
    console.error('Erro ao tentar anunciar: ', error);
    throw error;
  }
};

const resultadoFinal = async () => {
  try {
    console.log('Obtendo resultado final...');

    const pathHistorico = path.join(projectRoot, 'src/db/historico.json');
    const historicoJson = await fs.readFile(pathHistorico, 'utf-8');
    const historico = JSON.parse(historicoJson);

    const groupedById = historico.reduce((acc, { createdAt, status, item }) => {
      if (!acc[item.id]) {
        acc[item.id] = { id: item.id, nome: item.nome, compra: null, venda: null };
      }

      const formattedItem = {
        ...item,
        createdAt
      };

      if (status === "Compra") {
        acc[item.id].compra = formattedItem;
      } else if (status === "Venda") {
        acc[item.id].venda = formattedItem;
      }

      return acc;
    }, {});

    const today = new Date();

    const resultado = Object.values(groupedById).map(({ id, nome, compra, venda }) => {
      const dataDaCompra = compra ? new Date(compra.createdAt) : null;
      const dataDaVenda = venda ? new Date(venda.createdAt) : null;
      const preçoDaCompra = compra ? compra.price : null;
      const valorRecebido = venda ? venda.valorRecebido : null;

      const diasAtéAVenda = dataDaCompra && dataDaVenda
        ? Math.ceil((dataDaVenda - dataDaCompra) / (1000 * 60 * 60 * 24))
        : null;

      const diasDeAnuncio = dataDaCompra
        ? Math.ceil(((dataDaVenda || today) - dataDaCompra) / (1000 * 60 * 60 * 24))
        : null;

      const lucro = venda ? parseFloat((valorRecebido - preçoDaCompra).toFixed(2)) : null;
      const rentabilidade = preçoDaCompra > 0 && lucro !== null
        ? parseFloat(((lucro / preçoDaCompra) * 100).toFixed(2)) // Rentabilidade em porcentagem
        : null;

      return {
        id,
        nome,
        dataDaCompra: dataDaCompra ? dataDaCompra.toISOString().split('T')[0] : null,
        preçoDaCompra,
        valorRecebido,
        dataDaVenda: dataDaVenda ? dataDaVenda.toISOString().split('T')[0] : null,
        diasAtéAVenda,
        diasDeAnuncio,
        lucro,
        rentabilidade
      };
    });

    // Calcular a média de dias até a venda (apenas para vendas concluídas)
    const vendasConcluidas = resultado.filter(({ diasAtéAVenda }) => diasAtéAVenda !== null);

    // Calcular o lucro total (apenas anúncios com vendas concluídas)
    const lucroTotal = vendasConcluidas.reduce((total, { valorRecebido, preçoDaCompra }) => {
      const lucro = valorRecebido - preçoDaCompra;
      return total + lucro;
    }, 0);

    const somaPrecosCompra = vendasConcluidas.reduce((total, { preçoDaCompra }) => total + preçoDaCompra, 0);

    const rentabilidadeTotal = somaPrecosCompra > 0
      ? parseFloat(((lucroTotal / somaPrecosCompra) * 100).toFixed(2))
      : 0;

    const mediaDiasAteVendaTotal = vendasConcluidas.length
      ? vendasConcluidas.reduce((total, { diasAtéAVenda }) => total + diasAtéAVenda, 0) / vendasConcluidas.length
      : 0;

    // Calcular lucro e média de dias até a venda por mês/ano (apenas vendas concluídas)
    const vendasPorMesAno = vendasConcluidas.reduce((acc, { dataDaVenda, lucro, diasAtéAVenda, preçoDaCompra }) => {
      if (dataDaVenda) {
        const [ano, mes] = dataDaVenda.split('-');
        const key = `${ano}-${mes}`;

        if (!acc[key]) {
          acc[key] = { lucro: 0, diasAteVendaTotal: 0, quantidade: 0, rentabilidadeTotal: 0 };
        }

        const rentabilidadeMes = lucro !== null && preçoDaCompra > 0 ? (lucro / preçoDaCompra) * 100 : 0;

        acc[key].lucro += lucro || 0;
        acc[key].diasAteVendaTotal += diasAtéAVenda || 0;
        acc[key].quantidade += 1;
        acc[key].rentabilidadeTotal += rentabilidadeMes;
      }
      return acc;
    }, {});

    const desempenhoPorMesAno = Object.keys(vendasPorMesAno).map(key => {
      const { lucro, diasAteVendaTotal, quantidade, rentabilidadeTotal } = vendasPorMesAno[key];
      return {
        mesAno: key,
        lucro: parseFloat(lucro.toFixed(2)),
        mediaDiasAteVenda: quantidade ? parseFloat((diasAteVendaTotal / quantidade).toFixed(2)) : 0,
        mediaRentabilidade: quantidade ? parseFloat((rentabilidadeTotal / quantidade).toFixed(2)) : 0
      };
    });

    // Criar o novo objeto
    const novoResultado = {
      lucroTotal: parseFloat(lucroTotal.toFixed(2)),
      rentabilidadeTotal,
      mediaDiasAteVendaTotal: parseFloat(mediaDiasAteVendaTotal.toFixed(2)),
      desempenhoPorMesAno
    };

    // Salvar no resultado.json
    const pathResultado = path.join(projectRoot, 'src/db/resultado.json');
    await fs.writeFile(pathResultado, JSON.stringify(novoResultado, null, 2), 'utf-8');

    console.log('Novo resultado salvo com sucesso:', novoResultado);

    // Lista de Anúncios Não Vendidos com diasDeAnuncio >= 14
    const anunciosNaoVendidos = resultado.filter(({ diasDeAnuncio, dataDaVenda }) => {
      return !dataDaVenda && diasDeAnuncio >= 14;
    });

    console.log(`Existe ${anunciosNaoVendidos.length} anúncios não vendidos com mais de 14 dias anunciado`);
    // console.log('anunciosNaoVendidos', anunciosNaoVendidos)
    for (const anuncio of anunciosNaoVendidos) {
      await anunciarComNovoValor(anuncio);
    }

    return { resultado, lucroTotal, anunciosNaoVendidos };
  } catch (error) {
    console.error('Erro ao obter resultado final:', error);
  }
};

const loopInfinito = async () => {
  while (true) {
    await resultadoFinal();
    console.log('Execução concluída. Aguardando 24 horas antes da próxima execução...');
    await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));
  }
};

loopInfinito();
