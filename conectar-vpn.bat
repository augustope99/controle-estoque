@echo off
echo ==========================================
echo   CONECTAR VPN E SINCRONIZAR DADOS
echo ==========================================
echo.

echo Conectando VPN...
echo SUBSTITUA ESTE COMANDO PELO SEU VPN:
echo rasdial "Nome_da_VPN" usuario senha
echo.
echo OU use o comando específico da sua VPN:
echo - FortiClient: "C:\Program Files\Fortinet\FortiClient\FortiClient.exe" -connect "VPN_Name"
echo - OpenVPN: "C:\Program Files\OpenVPN\bin\openvpn.exe" --config "config.ovpn"
echo - Cisco AnyConnect: "C:\Program Files (x86)\Cisco\Cisco AnyConnect Secure Mobility Client\vpnui.exe"
echo.

REM Aguardar conexão VPN (ajuste o tempo conforme necessário)
timeout /t 30 /nobreak

echo Testando conectividade...
ping -n 1 66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com

if %errorlevel% == 0 (
    echo VPN conectada com sucesso!
    echo Sincronizando dados...
    
    REM Aqui você pode adicionar um comando para forçar sincronização
    REM Por exemplo, fazer uma requisição HTTP para o endpoint de sync
    curl -X GET "https://seu-site.netlify.app/.netlify/functions/sap-hana?action=sync"
    
    echo Sincronização concluída!
) else (
    echo Erro: VPN não conectada ou SAP HANA inacessível
)

pause