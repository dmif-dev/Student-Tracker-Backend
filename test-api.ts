import http from 'http';

http.get('http://localhost:4000/api/documents/cmp08lv0s0000io93pzxu871z/view', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data.substring(0, 500)}`);
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
