(async () => {
  const endpoint = `https://dashskins.com.br/api/listing?limit=120&page=${1}`;
  const options = { method: 'GET' }
  for (let i = 0; i < Array.from({ length: 999 }, (_, i) => i).length; i++) {
    let data = null;
    while (true) {
      const response = await fetch(endpoint, options);
      if (response.ok) {
        data = await response.json();
        break
      } else {
        console.log('Status:', response?.status);
        console.log('Text:', response?.statusText);
      }
    }
    console.log('index:', i, 'resultado:', data.results.length)
  }
})()

// http://113.160.132.195:8080
// https://infatica.io/proxy-checker/
// https://free-proxy-list.net/