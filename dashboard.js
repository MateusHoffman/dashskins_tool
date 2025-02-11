async function main() {
  try {
    const historico = await obterHistorico();
    // console.log('historico', historico)
    const historicoAgrupado = agruparCompraEVenda(historico)
    // console.log('historicoAgrupado', historicoAgrupado)
    const operações = calcularLucroRentabilidadeDiasAteVenda(historicoAgrupado)
    console.log('operações', operações)

    const somaPrecoDeCompraPorDia = somarPrecoDeCompraPorDia(operações);
    const somaLucroPorDia = somarLucroPorDia(operações);

    const somaPrecoDeCompraPorMes = somarPrecoDeCompraPorMes(operações);
    const somaLucroPorMes = somarLucroPorMes(operações);
    const rentabilidadeMediaPorMes = calcularRentabilidadeMediaPorMes(operações);
    const mediaDiasAteVendaPorMes = calcularMediaDiasAteVendaPorMes(operações);

    gerarGraficoDiario(somaPrecoDeCompraPorDia, somaLucroPorDia);
    gerarGraficoMensal(somaPrecoDeCompraPorMes, somaLucroPorMes, rentabilidadeMediaPorMes, mediaDiasAteVendaPorMes);
    somarLucroTotal(operações);
    calcularQuantidadeDeAnunciosSemVenda(historicoAgrupado);
  } catch (error) {
    console.error('Erro ao carregar o arquivo JSON:', error);
  }
}

async function obterHistorico() {
  const response = await fetch('/src/db/historico.json');
  return response.json();
}

function agruparCompraEVenda(historico) {
  const resultado = historico.reduce((acc, { status, item, createdAt }) => {
    const { id, nome, price, fee, valorRecebido } = item;
    const dado = acc[id] || (acc[id] = { id, nome, compra: null, venda: null });

    if (status === "Compra") {
      dado.compra = { dataDeCompra: createdAt, precoDeCompra: price };
    } else if (status === "Venda") {
      dado.venda = { dataDeVenda: createdAt, precoAnunciado: price, taxa: fee, valorRecebido };
    }

    return acc;
  }, {});

  return Object.values(resultado)
}

function calcularLucroRentabilidadeDiasAteVenda(historicoAgrupado) {
  return historicoAgrupado.map(({ id, nome, compra, venda }) => ({
    id,
    nome,
    compra,
    venda,
    lucro: compra && venda ? Math.round((venda.valorRecebido - compra.precoDeCompra) * 100) / 100 : null,
    rentabilidade:
      compra && venda
        ? (venda.valorRecebido - compra.precoDeCompra) / compra.precoDeCompra
        : null,
    diasAteVenda:
      compra && venda
        ? Math.floor((new Date(venda.dataDeVenda) - new Date(compra.dataDeCompra)) / (1000 * 60 * 60 * 24))
        : null,
  }));
}

// TOTAL

function somarLucroTotal(operações) {
  const lucroTotal = operações.reduce((total, { lucro }) => {
    if (lucro !== null) {
      total += lucro;
    }
    return total;
  }, 0);
  document.getElementById('lucroTotal').textContent = `Lucro Total: R$ ${lucroTotal.toFixed(2)}`;
}

function calcularQuantidadeDeAnunciosSemVenda(historicoAgrupado) {
  const adsSemVenda = historicoAgrupado.filter(({ compra, venda }) => compra && !venda).length;
  document.getElementById('adsSemVenda').textContent = `Anúncios sem Venda: ${adsSemVenda}`;
}

// POR DIA

function somarPrecoDeCompraPorDia(operações) {
  return operações.reduce((acc, { compra }) => {
    if (compra) {
      const dataCompra = new Date(compra.dataDeCompra);
      const dia = dataCompra.toISOString().split('T')[0];

      if (!acc[dia]) {
        acc[dia] = 0;
      }
      acc[dia] += compra.precoDeCompra;
    }
    return acc;
  }, {});
}

function somarLucroPorDia(operações) {
  return operações.reduce((acc, { lucro, compra }) => {
    if (lucro !== null && compra) {
      const dataCompra = new Date(compra.dataDeCompra);
      const dia = dataCompra.toISOString().split('T')[0];

      if (!acc[dia]) {
        acc[dia] = 0;
      }
      acc[dia] += lucro;
    } else if (compra) {
      const dataCompra = new Date(compra.dataDeCompra);
      const dia = dataCompra.toISOString().split('T')[0];

      if (!acc[dia]) {
        acc[dia] = 0;
      }
      acc[dia] += 0;
    }
    return acc;
  }, {});
}

// POR MÊS

function somarPrecoDeCompraPorMes(operações) {
  return operações.reduce((acc, { compra }) => {
    if (compra) {
      const dataCompra = new Date(compra.dataDeCompra);
      const mesAno = `${dataCompra.getMonth() + 1}/${dataCompra.getFullYear()}`;

      if (!acc[mesAno]) {
        acc[mesAno] = 0;
      }
      acc[mesAno] += compra.precoDeCompra;
    }
    return acc;
  }, {});
}

function somarLucroPorMes(operações) {
  return operações.reduce((acc, { lucro, compra }) => {
    if (lucro !== null && compra) {
      const dataCompra = new Date(compra.dataDeCompra);
      const mesAno = `${dataCompra.getMonth() + 1}/${dataCompra.getFullYear()}`;

      if (!acc[mesAno]) {
        acc[mesAno] = 0;
      }
      acc[mesAno] += lucro;
    }
    return acc;
  }, {});
}

function calcularRentabilidadeMediaPorMes(operações) {
  // Filtra as operações com venda
  const operacoesComVenda = operações.filter(({ venda }) => venda !== null);

  // Agrupa por mês usando a data de venda
  const rentabilidadePorMes = operacoesComVenda.reduce((acc, { venda, rentabilidade }) => {
    const dataVenda = new Date(venda.dataDeVenda);
    const mesAno = `${dataVenda.getMonth() + 1}/${dataVenda.getFullYear()}`;

    if (!acc[mesAno]) {
      acc[mesAno] = { totalRentabilidade: 0, count: 0 };
    }

    // Soma as rentabilidades e conta as operações por mês
    acc[mesAno].totalRentabilidade += rentabilidade;
    acc[mesAno].count += 1;

    return acc;
  }, {});

  // Calcula a média de rentabilidade por mês
  const rentabilidadeMediaPorMes = Object.keys(rentabilidadePorMes).reduce((acc, mesAno) => {
    const { totalRentabilidade, count } = rentabilidadePorMes[mesAno];
    acc[mesAno] = (totalRentabilidade / count) * 100;
    return acc;
  }, {});

  return rentabilidadeMediaPorMes;
}

function calcularMediaDiasAteVendaPorMes(operações) {
  // Filtra as operações com venda
  const operacoesComVenda = operações.filter(({ venda }) => venda !== null);

  // Agrupa por mês usando a data de venda
  const diasAteVendaPorMes = operacoesComVenda.reduce((acc, { venda, diasAteVenda }) => {
    const dataVenda = new Date(venda.dataDeVenda);
    const mesAno = `${dataVenda.getMonth() + 1}/${dataVenda.getFullYear()}`;

    if (!acc[mesAno]) {
      acc[mesAno] = { totalDias: 0, count: 0 };
    }

    // Soma os dias e conta as operações por mês
    acc[mesAno].totalDias += diasAteVenda;
    acc[mesAno].count += 1;

    return acc;
  }, {});

  // Calcula a média de dias por mês
  const mediaDiasPorMes = Object.keys(diasAteVendaPorMes).reduce((acc, mesAno) => {
    const { totalDias, count } = diasAteVendaPorMes[mesAno];
    acc[mesAno] = totalDias / count;
    return acc;
  }, {});

  return mediaDiasPorMes;
}

// GRAFICOS

function gerarGraficoDiario(somasPorDia, lucrosPorDia) {
  const labels = Object.keys(somasPorDia).sort((a, b) => new Date(a) - new Date(b));
  const dataCompra = labels.map(dia => somasPorDia[dia]);
  const lucros = labels.map(dia => lucrosPorDia[dia] || 0);

  const ctx = document.getElementById('graficoDiario').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Gasto por Dia',
          data: dataCompra,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.1
        },
        {
          label: 'Lucro por Dia',
          data: lucros,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
          tension: 0.1
        }
      ]
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Data'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Valor (R$)'
          }
        }
      }
    }
  });
}

function gerarGraficoMensal(somasPorMes, lucrosPorMes, rentabilidadeMediaPorMes, mediaDiasAteVendaPorMes) {
  // Ordena os labels extraindo mês e ano do formato "M/YYYY"
  const labels = Object.keys(somasPorMes).sort((a, b) => {
    const [mesA, anoA] = a.split('/');
    const [mesB, anoB] = b.split('/');
    const dateA = new Date(parseInt(anoA), parseInt(mesA) - 1, 1);
    const dateB = new Date(parseInt(anoB), parseInt(mesB) - 1, 1);
    return dateA - dateB;
  });

  const dataCompra = labels.map(mesAno => somasPorMes[mesAno]);
  const lucros = labels.map(mesAno => lucrosPorMes[mesAno] || 0);
  const rentabilidadeMedia = labels.map(mesAno => rentabilidadeMediaPorMes[mesAno] || 0);
  const diasAteVenda = labels.map(mesAno => mediaDiasAteVendaPorMes[mesAno] || 0);

  const ctx = document.getElementById('graficoMensal').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Gasto por Mês',
          data: dataCompra,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
          tension: 0.1
        },
        {
          label: 'Lucro por Mês',
          data: lucros,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
          tension: 0.1
        },
        {
          label: 'Rentabilidade Média por Mês',
          data: rentabilidadeMedia,
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 2
        },
        {
          label: 'Média de Dias Até Venda por Mês',
          data: diasAteVenda,
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 2
        }
      ]
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Mês/Ano'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Valor (R$) / Dias'
          }
        }
      }
    }
  });
}

main();
