import fs from 'fs/promises';
import path from 'path';
import { projectRoot, TOKEN } from '../utils/constants.js';

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
