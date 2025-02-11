import fs from 'fs/promises';
import path from 'path';
import { projectRoot } from '../utils/constants.js';

const processarCompras = async () => {
    const pathHistorico = path.join(projectRoot, 'src/db/historico.json');
    const historicoJson = await fs.readFile(pathHistorico, 'utf-8');
    const historico = JSON.parse(historicoJson);

    const groupedData = {};
    let somaTotal = 0;

    historico.forEach(entry => {
        if (entry.status === "Compra") {
            const date = new Date(entry.createdAt).toISOString().split('T')[0];
            if (!groupedData[date]) {
                groupedData[date] = 0;
            }
            groupedData[date] += entry.item.price;
            somaTotal += entry.item.price;
        }
    });

    // Formatar resultado como array de objetos para soma por dia
    const somaPorDia = Object.entries(groupedData).map(([date, total]) => ({ date, total: parseFloat(total.toFixed(2)) }));

    const resultado = {
      somaTotal: parseFloat(somaTotal.toFixed(2)),
      somaPorDia,
    }
    console.log('Compras processadas:', resultado)
    return ;
}

processarCompras();

const processarTransacoes = async () => {
    const pathHistorico = path.join(projectRoot, 'src/db/historico.json');
    const historicoJson = await fs.readFile(pathHistorico, 'utf-8');
    const historico = JSON.parse(historicoJson);

    const transacoesPorItem = {};

    // Agrupar transações por item.id
    historico.forEach(entry => {
        const { id } = entry.item;
        if (!transacoesPorItem[id]) {
            transacoesPorItem[id] = { compras: [], vendas: [] };
        }
        transacoesPorItem[id][entry.status === "Compra" ? "compras" : "vendas"].push(entry);
    });

    const lucrosPorDia = {};
    let lucroTotal = 0;

    // Calcular lucro por dia
    Object.values(transacoesPorItem).forEach(({ compras, vendas }) => {
        // Filtrar itens sem transações de compra ou venda
        if (compras.length > 0 && vendas.length > 0) {
            // console.log('Compra', compras)
            // console.log('Venda', vendas)
            compras.forEach(compra => {
                vendas.forEach(venda => {
                    // Calcular lucro apenas para Venda - Compra
                    const lucro = venda.item.valorRecebido - compra.item.price;
                    if (lucro > 0) {
                        const date = new Date(venda.createdAt).toISOString().split('T')[0];

                        if (!lucrosPorDia[date]) {
                            lucrosPorDia[date] = 0;
                        }
                        lucrosPorDia[date] += lucro;
                        lucroTotal += lucro;
                    }
                });
            });
        }
    });

    // Formatar resultado como array de objetos para lucro por dia
    const lucroPorDia = Object.entries(lucrosPorDia).map(([date, total]) => ({
        date,
        total: parseFloat(total.toFixed(2))
    }));

    const resultado = {
        lucroTotal: parseFloat(lucroTotal.toFixed(2)),
        lucroPorDia,
    };

    console.log('Lucro por dia:', resultado);

    return resultado;
};

processarTransacoes();

