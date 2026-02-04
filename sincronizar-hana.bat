@echo off
echo ==========================================
echo   SINCRONIZAR DADOS SAP HANA
echo ==========================================
echo.

echo ANTES DE EXECUTAR:
echo 1. Abra o FortiClient
echo 2. Conecte na VPN da empresa
echo 3. Faça a autenticação MFA
echo 4. Pressione qualquer tecla para continuar...
echo.
pause

echo Testando conectividade com SAP HANA...
ping -n 1 66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com

if %errorlevel% == 0 (
    echo ✅ Conectividade OK!
    echo.
    echo Sincronizando dados...
    
    REM Fazer requisição para sincronizar
    echo Fazendo download dos dados do SAP HANA...
    curl -X GET "https://augustope99.github.io/controle-estoque/.netlify/functions/sap-hana?action=sync" -o sync_result.json
    
    if exist sync_result.json (
        echo ✅ Sincronização concluída!
        echo Dados salvos em: sync_result.json
        type sync_result.json
        del sync_result.json
    ) else (
        echo ❌ Erro na sincronização
    )
    
) else (
    echo ❌ Erro: SAP HANA inacessível
    echo Verifique se a VPN está conectada
)

echo.
echo ==========================================
echo   INSTRUÇÕES
echo ==========================================
echo.
echo Execute este script:
echo - Toda manhã após conectar a VPN
echo - Sempre que quiser atualizar os dados
echo - Os dados ficam salvos no navegador
echo.
echo Após sincronizar, você pode:
echo - Desconectar a VPN
echo - Usar o sistema normalmente
echo - Buscar clientes instantaneamente
echo.
pause