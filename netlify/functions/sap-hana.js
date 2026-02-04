const { Client } = require('@sap/hana-client');
const fs = require('fs').promises;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const action = event.queryStringParameters?.action || 'search';
    
    if (action === 'sync') {
      // Sincronização completa dos dados
      return await syncAllData(headers);
    } else {
      // Busca individual por código
      const { codigo } = JSON.parse(event.body || '{}');
      return await searchCliente(codigo, headers);
    }
    
  } catch (error) {
    console.error('Erro:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function syncAllData(headers) {
  try {
    // Configuração SAP HANA
    const connOptions = {
      serverNode: '66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com:443',
      uid: 'PER_DW#PER_CONSULTA',
      pwd: 'bY!inOI=Ebi+3~99f&oP^[IXTEfKQ[`S',
      encrypt: true,
      sslValidateCertificate: false
    };

    const client = new Client(connOptions);
    await client.connect();
    
    // Buscar todos os clientes
    const query = `SELECT * FROM CLIENTES ORDER BY CODIGO_CLIENTE`;
    const result = await client.exec(query);
    
    await client.disconnect();

    // Processar dados
    const clientes = result.map(cliente => ({
      codigo_do_cliente: cliente.CODIGO_CLIENTE || '',
      cnpj: cliente.CNPJ || '',
      razao_social: cliente.RAZAO_SOCIAL || '',
      nome_fantasia: cliente.NOME_FANTASIA || '',
      e_mail: cliente.EMAIL || '',
      principal_contato: cliente.TELEFONE || '',
      filial: cliente.FILIAL || '',
      marca: cliente.MARCA || '',
      ultima_atualizacao: new Date().toISOString()
    }));

    // Salvar dados sincronizados
    const syncData = {
      clientes: clientes,
      ultima_sincronizacao: new Date().toISOString(),
      total_clientes: clientes.length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `${clientes.length} clientes sincronizados`,
        data: syncData
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Erro na sincronização: ' + error.message 
      })
    };
  }
}

async function searchCliente(codigo, headers) {
  if (!codigo) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Código do cliente é obrigatório' })
    };
  }

  try {
    // Tentar buscar nos dados sincronizados primeiro
    const syncedData = await getSyncedData();
    
    if (syncedData && syncedData.clientes) {
      const cliente = syncedData.clientes.find(c => 
        c.codigo_do_cliente.toLowerCase() === codigo.toLowerCase()
      );
      
      if (cliente) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            cliente: cliente,
            source: 'cache'
          })
        };
      }
    }

    // Se não encontrou no cache, tentar buscar direto no SAP HANA
    return await searchDirectSAPHANA(codigo, headers);

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}

async function searchDirectSAPHANA(codigo, headers) {
  try {
    const connOptions = {
      serverNode: '66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com:443',
      uid: 'PER_DW#PER_CONSULTA',
      pwd: 'bY!inOI=Ebi+3~99f&oP^[IXTEfKQ[`S',
      encrypt: true,
      sslValidateCertificate: false
    };

    const client = new Client(connOptions);
    await client.connect();
    
    const query = `SELECT * FROM CLIENTES WHERE CODIGO_CLIENTE = ?`;
    const result = await client.exec(query, [codigo]);
    
    await client.disconnect();

    if (!result || result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, message: 'Cliente não encontrado' })
      };
    }

    const cliente = result[0];
    const clienteData = {
      codigo_do_cliente: cliente.CODIGO_CLIENTE || '',
      cnpj: cliente.CNPJ || '',
      razao_social: cliente.RAZAO_SOCIAL || '',
      nome_fantasia: cliente.NOME_FANTASIA || '',
      e_mail: cliente.EMAIL || '',
      principal_contato: cliente.TELEFONE || '',
      filial: cliente.FILIAL || '',
      marca: cliente.MARCA || ''
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        cliente: clienteData,
        source: 'sap_hana'
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}

async function getSyncedData() {
  try {
    // Em produção, isso seria armazenado em um banco de dados
    // Por enquanto, retorna null para forçar busca direta
    return null;
  } catch (error) {
    return null;
  }
}