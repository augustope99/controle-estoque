@echo off
echo ==========================================
echo   TESTE DE CONECTIVIDADE SAP HANA
echo ==========================================
echo.

echo VPN FortiClient está ativa. Testando conectividade...
echo.

echo 1. Testando DNS...
nslookup 66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com

echo.
echo 2. Testando ping...
ping -n 2 66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com

echo.
echo 3. Testando porta 443 (HTTPS)...
telnet 66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com 443

echo.
echo 4. Testando com PowerShell...
powershell -Command "Test-NetConnection -ComputerName '66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com' -Port 443"

echo.
echo ==========================================
echo   DIAGNÓSTICO
echo ==========================================
echo.

if %errorlevel% == 0 (
    echo ✅ Conectividade OK - SAP HANA acessível
    echo Pode prosseguir com a sincronização
) else (
    echo ❌ Problema de conectividade
    echo.
    echo POSSÍVEIS CAUSAS:
    echo - VPN não está roteando para o SAP HANA
    echo - Firewall bloqueando a porta 443
    echo - Credenciais ou host incorretos
    echo - SAP HANA Cloud fora do ar
    echo.
    echo SOLUÇÕES:
    echo 1. Verifique se a VPN está conectada corretamente
    echo 2. Teste acessar https://66e1ac83-47f3-47b1-bccb-a770533ef44f.hana.prod-us10.hanacloud.ondemand.com no navegador
    echo 3. Contate o administrador da rede
)

echo.
pause