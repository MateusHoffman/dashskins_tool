import puppeteer from 'puppeteer';

(async () => {
    try {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--start-maximized',
            '--proxy-server=http://31.40.248.2:8080',
            '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: null // Garante que o viewport use o tamanho da janela
    });


    const [page] = await browser.pages(); // Garante que usa a aba principal
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Remove detecção de automação
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    // Aguarda uma pequena variação aleatória para simular tempo de resposta humano
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 2000));

    await page.goto('https://dashskins.com.br/', { waitUntil: 'networkidle0' });

    // Movimentação aleatória do mouse para simular um usuário real
    for (let i = 0; i < 5; i++) {
        await page.mouse.move(Math.random() * 1920, Math.random() * 1080);
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 500));
    }

    // Pequena rolagem para simular atividade
    await page.evaluate(() => window.scrollBy(0, Math.random() * 500));
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1500) + 1000));
    await page.evaluate(() => window.scrollBy(0, -Math.random() * 500));

    // Espera e clica no botão de login do Steam
    try {
        await page.waitForSelector('a.button.is-steam', { timeout: 5000 });
        await page.click('a.button.is-steam');
        console.log('Botão de login clicado com sucesso!');
    } catch (error) {
        console.error('Botão de login não encontrado:', error);
    }

    // Opcional: Manter o navegador aberto para inspeção
    // await browser.close();
    } catch (error) {
        console.error('Erro', error)
    }
})();
