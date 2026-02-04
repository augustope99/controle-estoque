const express = require('express');
const cors = require('cors');
const hana = require('@sap/hana-client');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Endpoint para consultar SAP HANA
app.post('/api/sap-hana-proxy', async (req, res) => {
  const { query, config } = req.body;
  
  let connection;
  try {
    // Configuração de conexão SAP HANA
    const connOptions = {
      serverNode: `${config.host}:${config.port}`,
      uid: config.user,
      pwd: config.password,
      encrypt: true,
      sslValidateCertificate: false
    };
    
    // Conectar ao SAP HANA
    connection = hana.createConnection();
    await new Promise((resolve, reject) => {
      connection.connect(connOptions, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Executar query
    const result = await new Promise((resolve, reject) => {
      connection.exec(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Erro SAP HANA:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      connection.disconnect();
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});

module.exports = app;