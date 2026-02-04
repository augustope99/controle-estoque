@echo off
echo ==========================================
echo   CONFIGURAR SINCRONIZAÇÃO AUTOMÁTICA
echo ==========================================
echo.

echo Criando tarefa agendada para sincronizar dados diariamente às 9h...
echo.

set SCRIPT_PATH=%~dp0conectar-vpn.bat

schtasks /create /tn "SincronizarSAPHANA" /tr "%SCRIPT_PATH%" /sc daily /st 09:00 /f

if %errorlevel% == 0 (
    echo ✅ Tarefa agendada criada com sucesso!
    echo.
    echo A sincronização será executada automaticamente:
    echo - Todos os dias às 9:00
    echo - Conectará a VPN
    echo - Sincronizará dados do SAP HANA
    echo.
    echo Para verificar: Abra "Agendador de Tarefas" do Windows
    echo Para desabilitar: schtasks /delete /tn "SincronizarSAPHANA" /f
) else (
    echo ❌ Erro ao criar tarefa agendada
    echo Execute este script como Administrador
)

echo.
echo Testando sincronização manual...
call "%SCRIPT_PATH%"

pause