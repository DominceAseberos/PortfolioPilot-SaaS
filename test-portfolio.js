const url = "https://dominceaseberos.tech"
fetch(`https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&browser=true`, {
  headers: { 'x-api-key': '03e6be9cd4134228ba420408505297e6' }
}).then(r => r.text()).then(t => console.log(t.substring(0, 500))).catch(console.error)
